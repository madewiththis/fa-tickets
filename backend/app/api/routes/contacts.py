from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import select, func

from app.api.deps import db_session
from app.db.models.contact import Contact
from app.db.models.purchase import Purchase
from app.db.models.ticket import Ticket
from app.db.models.event import Event
from app.db.models.ticket_type import TicketType


router = APIRouter(prefix="/contacts", tags=["contacts"])


@router.get("")
def list_contacts(
    db: Session = Depends(db_session),
    search: str | None = Query(default=None),
    roles: str | None = Query(default=None, description="Comma-separated: buyer,holder"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    # Base query
    q = db.query(Contact)
    if search:
        s = f"%{search.strip()}%"
        q = q.filter(
            func.lower(Contact.email).like(func.lower(s))
            | func.lower(Contact.first_name).like(func.lower(s))
            | func.lower(Contact.last_name).like(func.lower(s))
            | func.lower(Contact.phone).like(func.lower(s))
        )

    # Fetch page of contacts
    contacts = q.order_by(Contact.id.asc()).limit(limit).offset(offset).all()
    ids = [c.id for c in contacts]
    if not ids:
        return []

    # events purchased per contact (count distinct event_id via purchase -> tickets)
    ev_counts = dict(
        db.execute(
            select(Purchase.buyer_contact_id, func.count(func.distinct(Ticket.event_id)))
            .join(Ticket, Ticket.purchase_id == Purchase.id)
            .where(Purchase.buyer_contact_id.in_(ids))
            .group_by(Purchase.buyer_contact_id)
        ).all()
    )
    # tickets held per contact
    tix_counts = dict(
        db.execute(
            select(Ticket.holder_contact_id, func.count(Ticket.id))
            .where(Ticket.holder_contact_id.in_(ids))
            .group_by(Ticket.holder_contact_id)
        ).all()
    )
    # last activity per contact (max of purchase.created_at, ticket.created_at, ticket.checked_in_at, ticket.delivered_at)
    last_purchase = dict(
        db.execute(
            select(Purchase.buyer_contact_id, func.max(Purchase.created_at))
            .where(Purchase.buyer_contact_id.in_(ids))
            .group_by(Purchase.buyer_contact_id)
        ).all()
    )
    last_ticket = dict(
        db.execute(
            select(
                Ticket.holder_contact_id,
                func.max(func.greatest(Ticket.created_at, Ticket.checked_in_at, Ticket.delivered_at)),
            )
            .where(Ticket.holder_contact_id.in_(ids))
            .group_by(Ticket.holder_contact_id)
        ).all()
    )

    buyer_filter = holder_filter = False
    if roles:
        parts = [r.strip().lower() for r in roles.split(",") if r.strip()]
        buyer_filter = "buyer" in parts
        holder_filter = "holder" in parts

    items = []
    for c in contacts:
        evs = int(ev_counts.get(c.id, 0) or 0)
        tix = int(tix_counts.get(c.id, 0) or 0)
        if roles:
            show = False
            if buyer_filter and evs > 0:
                show = True
            if holder_filter and tix > 0:
                show = True
            if not show:
                continue
        lp = last_purchase.get(c.id)
        lt = last_ticket.get(c.id)
        last_activity = None
        if lp and lt:
            last_activity = max(lp, lt)
        else:
            last_activity = lp or lt
        items.append(
            {
                "id": c.id,
                "first_name": c.first_name,
                "last_name": c.last_name,
                "email": c.email,
                "phone": c.phone,
                "events_purchased": evs,
                "tickets_held": tix,
                "last_activity": last_activity.isoformat() if last_activity else None,
            }
        )
    return items


@router.get("/{contact_id}")
def get_contact(contact_id: int, db: Session = Depends(db_session)):
    c = db.get(Contact, contact_id)
    if not c:
        raise HTTPException(status_code=404, detail="Contact not found")

    # Buyer summary by event
    buyer_rows = (
        db.execute(
            select(
                Event.id.label("event_id"),
                Event.title.label("title"),
                func.count(Ticket.id).label("tickets"),
            )
            .join(Ticket, Ticket.event_id == Event.id)
            .join(Purchase, Purchase.id == Ticket.purchase_id)
            .where(Purchase.buyer_contact_id == contact_id)
            .group_by(Event.id, Event.title)
            .order_by(Event.id.asc())
        )
        .mappings()
        .all()
    )
    # Holder tickets count
    tix_count = (
        db.execute(
            select(func.count(Ticket.id)).where(Ticket.holder_contact_id == contact_id)
        ).scalar()
        or 0
    )

    return {
        "id": c.id,
        "first_name": c.first_name,
        "last_name": c.last_name,
        "email": c.email,
        "phone": c.phone,
        "buyer": {"events": list(buyer_rows)},
        "holder": {"tickets_count": int(tix_count)},
    }


@router.get("/{contact_id}/purchases")
def list_contact_purchases(
    contact_id: int,
    db: Session = Depends(db_session),
    event_id: int | None = Query(default=None),
):
    # Validate contact exists
    c = db.get(Contact, contact_id)
    if not c:
        raise HTTPException(status_code=404, detail="Contact not found")
    q = (
        select(
            Purchase.id,
            Purchase.external_payment_ref,
            Purchase.total_amount,
            Purchase.currency,
            Purchase.created_at,
            func.count(Ticket.id).label("tickets"),
        )
        .join(Ticket, Ticket.purchase_id == Purchase.id)
        .where(Purchase.buyer_contact_id == contact_id)
        .group_by(
            Purchase.id,
            Purchase.external_payment_ref,
            Purchase.total_amount,
            Purchase.currency,
            Purchase.created_at,
        )
        .order_by(Purchase.created_at.desc())
    )
    if event_id is not None:
        q = q.where(Ticket.event_id == event_id)
    rows = db.execute(q).mappings().all()
    return [dict(r) for r in rows]


@router.get("/{contact_id}/holder_tickets")
def list_holder_tickets(contact_id: int, db: Session = Depends(db_session)):
    # Validate contact exists
    c = db.get(Contact, contact_id)
    if not c:
        raise HTTPException(status_code=404, detail="Contact not found")
    rows = (
        db.execute(
            select(
                Ticket.id,
                Ticket.ticket_number,
                Ticket.short_code,
                Ticket.payment_status,
                Ticket.status,
                Ticket.checked_in_at,
                Event.id.label("event_id"),
                Event.title.label("event_title"),
                Event.starts_at.label("event_starts_at"),
                Event.ends_at.label("event_ends_at"),
                Ticket.ticket_type_id.label("type_id"),
                TicketType.name.label("type_name"),
            )
            .join(Event, Event.id == Ticket.event_id)
            .outerjoin(TicketType, TicketType.id == Ticket.ticket_type_id)
            .where(Ticket.holder_contact_id == contact_id)
            .order_by(Ticket.id.desc())
        )
        .mappings()
        .all()
    )
    return [dict(r) for r in rows]
