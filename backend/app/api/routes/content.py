from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from app.api.deps import db_session
from app.db.models.event import Event
from app.db.models.ticket import Ticket
from app.db.models.ticket_type import TicketType
from app.db.models.customer import Customer
from app.schemas.content import CheckoutRequest, CheckoutResponse
from app.utils.codes import generate_short_code
from sqlalchemy import select

router = APIRouter(prefix="/content", tags=["content"])


def find_or_create_customer(db: Session, email: str, first_name: str | None, last_name: str | None, phone: str | None) -> Customer:
    existing = db.execute(select(Customer).where(Customer.email == email)).scalar_one_or_none()
    if existing:
        return existing
    c = Customer(email=email, first_name=first_name, last_name=last_name, phone=phone)
    db.add(c)
    db.flush()
    return c


@router.post("/checkout", response_model=CheckoutResponse)
def content_checkout(req: CheckoutRequest, db: Session = Depends(db_session)):
    ev = db.get(Event, req.event_id)
    if not ev:
        raise HTTPException(status_code=404, detail="Event not found")
    tt = db.get(TicketType, req.ticket_type_id)
    if not tt or tt.event_id != req.event_id:
        raise HTTPException(status_code=400, detail="Invalid ticket type for this event")
    if tt.max_quantity is not None:
        used_of_type = (
            db.query(Ticket)
            .where(
                Ticket.event_id == req.event_id,
                Ticket.ticket_type_id == req.ticket_type_id,
                Ticket.status.in_(["assigned", "checked_in"]),
            )
            .count()
        )
        if used_of_type >= tt.max_quantity:
            raise HTTPException(status_code=409, detail="Ticket type at max quantity")

    # Capacity check
    issued_count = (
        db.query(Ticket)
        .where(Ticket.event_id == req.event_id, Ticket.status.in_(["assigned", "checked_in"]))
        .count()
    )
    if issued_count >= ev.capacity:
        raise HTTPException(status_code=409, detail="Event at capacity")

    # Find or create an available ticket
    ticket = (
        db.query(Ticket)
        .where(Ticket.event_id == req.event_id, Ticket.status == "available")
        .order_by(Ticket.id.asc())
        .first()
    )
    if not ticket:
        ticket = Ticket(event_id=req.event_id)
        db.add(ticket)
        db.flush()

    # Attach customer
    cust = find_or_create_customer(
        db,
        email=req.customer.email,
        first_name=req.customer.first_name,
        last_name=req.customer.last_name,
        phone=req.customer.phone,
    )

    # Assign short code
    code = generate_short_code(db, req.event_id)

    # Assign ticket
    now = datetime.now(timezone.utc)
    ticket.customer_id = cust.id
    ticket.ticket_type_id = req.ticket_type_id
    ticket.short_code = code
    ticket.status = "assigned"
    ticket.assigned_at = now
    ticket.payment_status = "unpaid"
    ticket.delivery_status = "not_sent"
    db.add(ticket)
    db.commit()
    db.refresh(ticket)

    return CheckoutResponse(
        ticket_id=ticket.id,
        event_id=ticket.event_id,
        ticket_type_id=req.ticket_type_id,
        email=req.customer.email,
        token=ticket.uuid,
    )

