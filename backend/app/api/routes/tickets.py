from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.deps import db_session
from app.schemas.assign import AssignRequest, AssignResponse, AssignPreviewRequest, AssignPreviewResponse
from app.schemas.resend import ResendRequest, ResendResponse
from app.schemas.pay import TicketLookupResponse, PayRequest, PayResponse
from app.services.tickets import assign_ticket, resend_code, unassign_ticket, refund_ticket, reassign_ticket
from app.utils.codes import generate_short_code
from app.db.models.event import Event
from app.db.models.ticket import Ticket
from app.integrations.email.service import send_and_log
from app.integrations.email import templates
from app.db.models.ticket_type import TicketType
import os
from app.schemas.ticket_actions import UnassignRequest, UnassignResponse, RefundRequest, RefundResponse, TicketByCodeResponse, ReassignRequest, ReassignResponse
from sqlalchemy import select
from app.db.models.contact import Contact
from app.db.models.purchase import Purchase

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
    # Create a Purchase if not present and associate to ticket
    try:
        cust_email = t.customer.email if t.customer and t.customer.email else None
        if cust_email and not t.purchase_id:
            contact = db.query(Contact).filter(Contact.email == cust_email).first()
            if not contact:
                contact = Contact(email=cust_email, first_name=t.customer.first_name if t.customer else None, last_name=t.customer.last_name if t.customer else None, phone=t.customer.phone if t.customer else None)
                db.add(contact)
                db.flush()
            p = Purchase(buyer_contact_id=contact.id, external_payment_ref=(req.token or None))
            db.add(p)
            db.flush()
            t.purchase_id = p.id
            db.add(t)
            db.commit()
            db.refresh(t)
    except Exception:
        pass
    # Send ticket email with QR now that it's paid
    ev = db.get(Event, t.event_id)
    event_when = ev.starts_at.isoformat() if ev else ""
    api_origin = os.getenv("PUBLIC_API_ORIGIN", os.getenv("API_BASE_URL", "http://localhost:8000"))
    qr_url = f"{api_origin}/qr?data={t.short_code}&scale=6" if t.short_code else None
    cust_email = (t.customer.email if t.customer and t.customer.email else None)
    if cust_email and t.short_code:
        try:
            send_ticket_email(cust_email, ev.title if ev else "Event", event_when, t.short_code, qr_url, None, t.ticket_number)
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
    pay_link = f"{app_origin}/pay?token={t.uuid}"
    api_origin = os.getenv("PUBLIC_API_ORIGIN", os.getenv("API_BASE_URL", "http://localhost:8000"))
    from urllib.parse import quote as _quote
    qr_url = f"{api_origin}/qr?data={_quote(pay_link, safe='')}&scale=6&format=png"
    # Use reservation-style email to buyer for unpaid tickets
    tt = db.get(TicketType, t.ticket_type_id) if t.ticket_type_id else None
    lines = f"1 x {tt.name if tt else 'Ticket'} — {(tt.price_baht or 0) if tt else 0} THB each"
    total = f"{(tt.price_baht or 0) if tt else 0} THB"
    # Simple event datetime string
    s = ev.starts_at; e = ev.ends_at if ev else None
    event_dt = f"{s.strftime('%d/%m/%Y %I:%M%p')}" + (f" — {e.strftime('%d/%m/%Y %I:%M%p')}" if e else '')
    import datetime as _dt
    expires = (_dt.datetime.now(_dt.timezone.utc) + _dt.timedelta(hours=24)).strftime('%d/%m/%Y %I:%M%p UTC')
    subject, text, html = templates.confirm_ticket_reservation(ev.title if ev else "Event", event_dt, 1, lines, total, expires, pay_link)
    ok = send_and_log(to_email=t.customer.email, subject=subject, text=text, html=html, template_name='confirm_ticket_reservation', context={'event_id': ev.id if ev else None, 'payment_link': pay_link}, db=db, related={'event_id': ev.id if ev else None, 'ticket_id': t.id})
    if not ok:
        raise HTTPException(status_code=500, detail="Email send failed")
    return {"resent": True}


@router.post("/tickets/unassign", response_model=UnassignResponse)
def unassign(req: UnassignRequest, db: Session = Depends(db_session)):
    try:
        t = unassign_ticket(db, ticket_id=req.ticket_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=409, detail=str(e))
    return UnassignResponse(
        ticket_id=t.id,
        event_id=t.event_id,
        payment_status=t.payment_status,
        status=t.status,
        ticket_number=t.ticket_number,
    )


@router.post("/tickets/refund", response_model=RefundResponse)
def refund(req: RefundRequest, db: Session = Depends(db_session)):
    try:
        t = refund_ticket(db, ticket_id=req.ticket_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=409, detail=str(e))
    return RefundResponse(
        ticket_id=t.id,
        event_id=t.event_id,
        payment_status=t.payment_status,  # refunding|voiding
        attendance_refunded=t.attendance_refunded,
        status=t.status,
    )


@router.get("/tickets/by-code/{code}", response_model=TicketByCodeResponse)
def ticket_by_code(code: str, db: Session = Depends(db_session)):
    t = db.execute(select(Ticket).where(Ticket.short_code == code)).scalar_one_or_none()
    if not t:
        raise HTTPException(status_code=404, detail="Ticket not found")
    ev = db.get(Event, t.event_id)
    event_dict = {
        "name": ev.title if ev else None,
        "start_at": ev.starts_at.isoformat() if ev and ev.starts_at else None,
        "end_at": ev.ends_at.isoformat() if ev and ev.ends_at else None,
        "location": ev.location if ev else None,
    }
    ticket_dict = {
        "number": t.ticket_number,
        "code": t.short_code,
        "type_id": t.ticket_type_id,
        "type_name": (t.ticket_type.name if getattr(t, 'ticket_type', None) else None),
        "payment_status": t.payment_status,
        "status": t.status,
        "attendance_refunded": t.attendance_refunded,
    }
    holder = None
    # For now, use customer as holder until holder_contact is wired in UI
    if t.customer and (t.customer.email or t.customer.first_name or t.customer.last_name or t.customer.phone):
        holder = {
            "first_name": t.customer.first_name,
            "last_name": t.customer.last_name,
            "email": t.customer.email,
            "phone": t.customer.phone,
        }
    return TicketByCodeResponse(event=event_dict, ticket=ticket_dict, holder=holder)


@router.get("/tickets/by-token/{token}", response_model=TicketByCodeResponse)
def ticket_by_token(token: str, db: Session = Depends(db_session)):
    t = db.query(Ticket).filter(Ticket.uuid == token).first()
    if not t:
        raise HTTPException(status_code=404, detail="Ticket not found")
    ev = db.get(Event, t.event_id)
    event_dict = {
        "name": ev.title if ev else None,
        "start_at": ev.starts_at.isoformat() if ev and ev.starts_at else None,
        "end_at": ev.ends_at.isoformat() if ev and ev.ends_at else None,
        "location": ev.location if ev else None,
    }
    ticket_dict = {
        "number": t.ticket_number,
        "code": t.short_code,
        "type_id": t.ticket_type_id,
        "type_name": (t.ticket_type.name if getattr(t, 'ticket_type', None) else None),
        "payment_status": t.payment_status,
        "status": t.status,
        "attendance_refunded": t.attendance_refunded,
    }
    holder = None
    if t.customer and (t.customer.email or t.customer.first_name or t.customer.last_name or t.customer.phone):
        holder = {
            "first_name": t.customer.first_name,
            "last_name": t.customer.last_name,
            "email": t.customer.email,
            "phone": t.customer.phone,
        }
    return TicketByCodeResponse(event=event_dict, ticket=ticket_dict, holder=holder)


@router.post("/tickets/reassign", response_model=ReassignResponse)
def reassign(req: ReassignRequest, db: Session = Depends(db_session)):
    try:
        t = reassign_ticket(
            db,
            ticket_id=req.ticket_id,
            email=req.email,
            first_name=req.first_name,
            last_name=req.last_name,
            phone=req.phone,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=409, detail=str(e))
    return ReassignResponse(
        ticket_id=t.id,
        event_id=t.event_id,
        customer_email=(t.customer.email if t.customer else None),
        holder_contact_id=t.holder_contact_id,
        short_code=t.short_code,
    )


@router.post("/tickets/resend_ticket")
def resend_ticket(req: ResendRequest, db: Session = Depends(db_session)):
    t = db.get(Ticket, req.ticket_id)
    if not t:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if not t.customer or not t.customer.email:
        raise HTTPException(status_code=400, detail="Customer email missing")
    if t.payment_status not in ("paid", "waived"):
        raise HTTPException(status_code=409, detail="Cannot resend ticket email until payment is completed or waived")
    if not t.short_code:
        raise HTTPException(status_code=400, detail="Ticket code missing")
    ev = db.get(Event, t.event_id)
    event_when = ev.starts_at.isoformat() if ev else ""
    api_origin = os.getenv("PUBLIC_API_ORIGIN", os.getenv("API_BASE_URL", "http://localhost:8000"))
    qr_url = f"{api_origin}/qr?data={t.short_code}&scale=6&format=png"
    app_origin2 = os.getenv("PUBLIC_APP_ORIGIN", "http://localhost:5173")
    view_link = f"{app_origin2}/ticket?ref={t.uuid}"
    subject, text, html = templates.ticket_email(ev.title if ev else "Event", event_when, t.short_code, qr_url, view_link, t.ticket_number)
    ok = send_and_log(to_email=t.customer.email, subject=subject, text=text, html=html, template_name='ticket_email', context={'event_id': ev.id if ev else None, 'code': t.short_code}, db=db, related={'event_id': ev.id if ev else None, 'ticket_id': t.id})
    if not ok:
        raise HTTPException(status_code=500, detail="Email send failed")
    t.delivery_status = "sent"
    db.add(t)
    db.commit()
    return {"resent": True}
