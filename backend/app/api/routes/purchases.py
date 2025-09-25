from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.api.deps import db_session
from app.db.models.purchase import Purchase
from app.db.models.contact import Contact
from app.db.models.ticket import Ticket
from app.db.models.event import Event
from app.db.models.ticket_type import TicketType
from app.schemas.purchase import PurchaseRead, PurchaseTicket
from app.services.emailer import send_reservation_confirmation_buyer, format_event_datetime, send_ticket_email_active
from sqlalchemy import func


router = APIRouter(prefix="/purchases", tags=["purchases"])


@router.get("/{purchase_id}", response_model=PurchaseRead)
def get_purchase(purchase_id: int, db: Session = Depends(db_session)):
    p = db.get(Purchase, purchase_id)
    if not p:
        raise HTTPException(status_code=404, detail="Purchase not found")
    buyer = db.get(Contact, p.buyer_contact_id)
    rows = (
        db.execute(
            select(
                Ticket.id,
                Ticket.event_id,
                Event.title.label("event_title"),
                Event.starts_at.label("event_starts_at"),
                Event.ends_at.label("event_ends_at"),
                Ticket.ticket_number,
                Ticket.short_code,
                Ticket.status,
                Ticket.payment_status,
                Ticket.holder_contact_id,
                Ticket.ticket_type_id.label("type_id"),
                TicketType.name.label("type_name"),
                TicketType.price_baht.label("type_price"),
            )
            .join(Event, Event.id == Ticket.event_id)
            .outerjoin(TicketType, TicketType.id == Ticket.ticket_type_id)
            .where(Ticket.purchase_id == purchase_id)
            .order_by(Ticket.id.asc())
        )
        .mappings()
        .all()
    )
    # Coerce ticket rows to plain dicts with JSON-safe values
    tickets_list = []
    for r in rows:
        d = dict(r)
        es = d.get('event_starts_at')
        ee = d.get('event_ends_at')
        if es is not None:
            try:
                d['event_starts_at'] = es.isoformat()
            except Exception:
                d['event_starts_at'] = str(es)
        if ee is not None:
            try:
                d['event_ends_at'] = ee.isoformat()
            except Exception:
                d['event_ends_at'] = str(ee)
        tickets_list.append(d)
    buyer_dict = {
        "id": buyer.id if buyer else None,
        "first_name": buyer.first_name if buyer else None,
        "last_name": buyer.last_name if buyer else None,
        "email": buyer.email if buyer else None,
        "phone": buyer.phone if buyer else None,
    }
    computed_total = sum(int(r.get('type_price') or 0) for r in rows)
    return PurchaseRead(
        id=p.id,
        buyer=buyer_dict,
        external_payment_ref=p.external_payment_ref,
        total_amount=p.total_amount if p.total_amount is not None else computed_total,
        currency=p.currency or 'THB',
        created_at=p.created_at if hasattr(p, "created_at") else None,
        tickets=tickets_list,  # pydantic will coerce datetimes encoded as strings
    )


@router.post("/{purchase_id}/resend_payment")
def resend_purchase_payment(purchase_id: int, db: Session = Depends(db_session)):
    p = db.get(Purchase, purchase_id)
    if not p:
        raise HTTPException(status_code=404, detail="Purchase not found")
    buyer = db.get(Contact, p.buyer_contact_id)
    if not buyer or not buyer.email:
        raise HTTPException(status_code=400, detail="Buyer email missing")
    # Ensure purchase has a GUID for deep link
    if not getattr(p, 'uuid', None):
        from uuid import uuid4
        p.uuid = str(uuid4())
        db.add(p)
        db.commit()
        db.refresh(p)

    rows = (
        db.execute(
            select(
                Ticket.id,
                Ticket.event_id,
                Ticket.ticket_type_id,
                TicketType.name.label("type_name"),
                TicketType.price_baht.label("type_price"),
                Event.title.label("event_title"),
                Event.starts_at,
                Event.ends_at,
            )
            .join(Event, Event.id == Ticket.event_id)
            .outerjoin(TicketType, TicketType.id == Ticket.ticket_type_id)
            .where(Ticket.purchase_id == purchase_id)
        )
        .mappings()
        .all()
    )
    if not rows:
        raise HTTPException(status_code=404, detail="No tickets in purchase")
    ev_title = rows[0]["event_title"]
    starts = rows[0]["starts_at"]
    ends = rows[0]["ends_at"]
    when_str = format_event_datetime(starts, ends)
    # Group by ticket type to build lines
    by_type: dict[int, dict] = {}
    for r in rows:
        tid = r.get("ticket_type_id")
        if tid not in by_type:
            by_type[tid] = {"name": r.get("type_name") or "Ticket", "qty": 0, "price": int(r.get("type_price") or 0)}
        by_type[tid]["qty"] += 1
    lines_list = [f"{v['qty']} x {v['name']} — {v['price']} THB each" for v in by_type.values()]
    total = sum(v["qty"] * v["price"] for v in by_type.values())
    lines = "\n".join(lines_list)

    # Use MultiPurchase page as secure link
    from os import getenv
    app_origin = getenv("PUBLIC_APP_ORIGIN", "http://localhost:5173")
    # Prefer purchase GUID deep link to payment page
    secure_link = f"{app_origin}/pay?purchase={p.uuid}"

    from datetime import datetime, timezone, timedelta
    expires = (datetime.now(timezone.utc) + timedelta(hours=24)).strftime('%d/%m/%Y %I:%M%p UTC')
    full_name = ' '.join([buyer.first_name or '', buyer.last_name or '']).strip() or buyer.email
    ok = send_reservation_confirmation_buyer(
        db,
        to_email=buyer.email,
        buyer_name=full_name,
        event_title=ev_title or "Event",
        event_dt_str=when_str,
        ticket_lines=lines,
        total_thb=f"{total} THB",
        expires_str=expires,
        secure_link=secure_link,
        related={"event_id": rows[0]["event_id"]},
    )
    if not ok:
        raise HTTPException(status_code=500, detail="Email send failed")
    return {"resent": True}


@router.get("/by-guid/{guid}", response_model=PurchaseRead)
def get_purchase_by_guid(guid: str, db: Session = Depends(db_session)):
    p = db.execute(select(Purchase).where(Purchase.uuid == guid)).scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Purchase not found")
    return get_purchase(p.id, db)


@router.post("/{purchase_id}/pay")
def pay_purchase(purchase_id: int, db: Session = Depends(db_session)):
    p = db.get(Purchase, purchase_id)
    if not p:
        raise HTTPException(status_code=404, detail="Purchase not found")
    # Mark all tickets paid and send ticket emails
    tickets = db.execute(
        select(Ticket).where(Ticket.purchase_id == purchase_id)
    ).scalars().all()
    for t in tickets:
        t.payment_status = 'paid'
        db.add(t)
    db.commit()
    for t in tickets:
        if t.customer and t.customer.email and t.short_code:
            ev = db.get(Event, t.event_id)
            send_ticket_email_active(
                db,
                to_email=t.customer.email,
                event_title=ev.title if ev else 'Event',
                event_when_iso=ev.starts_at.isoformat() if ev and ev.starts_at else '',
                short_code=t.short_code,
                ticket_number=t.ticket_number,
                token=t.uuid,
                related={'event_id': t.event_id, 'ticket_id': t.id, 'purchase_id': purchase_id},
            )
    return {"paid": True, "tickets": len(tickets)}
