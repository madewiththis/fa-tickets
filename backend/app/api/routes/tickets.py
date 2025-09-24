from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.deps import db_session
from app.schemas.assign import AssignRequest, AssignResponse, AssignPreviewRequest, AssignPreviewResponse
from app.schemas.resend import ResendRequest, ResendResponse
from app.schemas.pay import TicketLookupResponse, PayRequest, PayResponse
from app.services.tickets import assign_ticket, resend_code
from app.utils.codes import generate_short_code
from app.db.models.event import Event
from app.db.models.ticket import Ticket
from app.integrations.email.service import send_payment_email, send_ticket_email
import os

router = APIRouter(tags=["tickets"])


@router.post("/assign", response_model=AssignResponse)
def assign(req: AssignRequest, db: Session = Depends(db_session)):
    try:
        t = assign_ticket(
            db,
            event_id=req.event_id,
            customer_email=req.customer.email,
            first_name=req.customer.first_name,
            last_name=req.customer.last_name,
            phone=req.customer.phone,
            ticket_type_id=req.ticket_type_id,
            payment_status=req.payment_status,
            desired_short_code=req.desired_short_code,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=409, detail=str(e))

    return AssignResponse(
        ticket_id=t.id,
        event_id=t.event_id,
        customer_email=req.customer.email,
        short_code=t.short_code or "",
        status=t.status,
    )


@router.post("/assign/preview", response_model=AssignPreviewResponse)
def assign_preview(req: AssignPreviewRequest, db: Session = Depends(db_session)):
    ev = db.get(Event, req.event_id)
    if not ev:
        raise HTTPException(status_code=404, detail="Event not found")
    try:
        code = generate_short_code(db, req.event_id)
    except RuntimeError as e:
        # No available codes
        raise HTTPException(status_code=409, detail=str(e))
    return AssignPreviewResponse(event_id=req.event_id, short_code=code, event_title=ev.title, starts_at=ev.starts_at)


@router.post("/resend", response_model=ResendResponse)
def resend(req: ResendRequest, db: Session = Depends(db_session)):
    try:
        resend_code(db, ticket_id=req.ticket_id)
        return ResendResponse(ticket_id=req.ticket_id, resent=True)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/tickets/lookup", response_model=TicketLookupResponse)
def lookup_ticket(
    code: str | None = Query(None, min_length=3, max_length=3),
    event_id: int | None = Query(None),
    token: str | None = Query(None, description="Payment token (ticket UUID)"),
    db: Session = Depends(db_session),
):
    if token:
        t = db.query(Ticket).filter(Ticket.uuid == token).first()
        if not t:
            raise HTTPException(status_code=404, detail="Ticket not found for token")
    else:
        if not code:
            raise HTTPException(status_code=400, detail="code or token required")
        q = db.query(Ticket).filter(Ticket.short_code == code)
        if event_id is not None:
            q = q.filter(Ticket.event_id == event_id)
        tickets = q.order_by(Ticket.id.asc()).all()
        if not tickets:
            raise HTTPException(status_code=404, detail="Ticket not found for code")
        if event_id is None and len(tickets) > 1:
            raise HTTPException(status_code=409, detail="Multiple tickets share this code; supply event_id")
        t = tickets[0]
    ev = db.get(Event, t.event_id)
    # Hide code when looking up by token and not paid yet
    short_code = t.short_code or ""
    if token and t.payment_status != "paid":
        short_code = ""
    return TicketLookupResponse(
        ticket_id=t.id,
        event_id=t.event_id,
        short_code=short_code,
        payment_status=t.payment_status,
        status=t.status,
        event_title=ev.title if ev else None,
    )


@router.post("/tickets/pay", response_model=PayResponse)
def pay_ticket(req: PayRequest, db: Session = Depends(db_session)):
    if req.token:
        t = db.query(Ticket).filter(Ticket.uuid == req.token).first()
    else:
        t = (
            db.query(Ticket)
            .filter(Ticket.event_id == req.event_id, Ticket.short_code == req.code)
            .first()
        )
    if not t:
        raise HTTPException(status_code=404, detail="Ticket not found for event and code")
    t.payment_status = "paid"
    db.add(t)
    db.commit()
    db.refresh(t)
    # Send ticket email with QR now that it's paid
    ev = db.get(Event, t.event_id)
    event_when = ev.starts_at.isoformat() if ev else ""
    api_origin = os.getenv("PUBLIC_API_ORIGIN", os.getenv("API_BASE_URL", "http://localhost:8000"))
    qr_url = f"{api_origin}/qr?data={t.short_code}&scale=6" if t.short_code else None
    cust_email = (t.customer.email if t.customer and t.customer.email else None)
    if cust_email and t.short_code:
        try:
            send_ticket_email(cust_email, ev.title if ev else "Event", event_when, t.short_code, qr_url)
            t.delivery_status = "sent"
            db.add(t)
            db.commit()
        except Exception:
            pass
    return PayResponse(
        ticket_id=t.id,
        event_id=t.event_id,
        short_code=t.short_code or "",
        payment_status=t.payment_status,
        status=t.status,
    )


@router.post("/tickets/resend_payment")
def resend_payment(req: ResendRequest, db: Session = Depends(db_session)):
    t = db.get(Ticket, req.ticket_id)
    if not t:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if not t.customer or not t.customer.email:
        raise HTTPException(status_code=400, detail="Customer email missing")
    ev = db.get(Event, t.event_id)
    event_when = ev.starts_at.isoformat() if ev else ""
    app_origin = os.getenv("PUBLIC_APP_ORIGIN", "http://localhost:5173")
    pay_link = f"{app_origin}/#pay?token={t.uuid}"
    ok = send_payment_email(t.customer.email, ev.title if ev else "Event", event_when, pay_link)
    if not ok:
        raise HTTPException(status_code=500, detail="Email send failed")
    return {"resent": True}


@router.post("/tickets/resend_ticket")
def resend_ticket(req: ResendRequest, db: Session = Depends(db_session)):
    t = db.get(Ticket, req.ticket_id)
    if not t:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if not t.customer or not t.customer.email:
        raise HTTPException(status_code=400, detail="Customer email missing")
    if t.payment_status != "paid":
        raise HTTPException(status_code=409, detail="Cannot resend ticket email until payment is completed")
    if not t.short_code:
        raise HTTPException(status_code=400, detail="Ticket code missing")
    ev = db.get(Event, t.event_id)
    event_when = ev.starts_at.isoformat() if ev else ""
    api_origin = os.getenv("PUBLIC_API_ORIGIN", os.getenv("API_BASE_URL", "http://localhost:8000"))
    qr_url = f"{api_origin}/qr?data={t.short_code}&scale=6"
    ok = send_ticket_email(t.customer.email, ev.title if ev else "Event", event_when, t.short_code, qr_url)
    if not ok:
        raise HTTPException(status_code=500, detail="Email send failed")
    t.delivery_status = "sent"
    db.add(t)
    db.commit()
    return {"resent": True}
