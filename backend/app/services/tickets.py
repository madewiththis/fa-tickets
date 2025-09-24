from datetime import datetime, timezone
import os
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.db.models.event import Event
from app.db.models.ticket import Ticket
from app.db.models.customer import Customer
from app.db.models.ticket_type import TicketType
from app.utils.codes import generate_short_code
from app.integrations.email.service import send_payment_email, send_ticket_email


def find_or_create_customer(db: Session, *, email: str, first_name: str | None, last_name: str | None, phone: str | None) -> Customer:
    existing = db.execute(select(Customer).where(Customer.email == email)).scalar_one_or_none()
    if existing:
        return existing
    c = Customer(email=email, first_name=first_name, last_name=last_name, phone=phone)
    db.add(c)
    db.flush()
    return c


def assign_ticket(
    db: Session,
    *,
    event_id: int,
    customer_email: str,
    first_name: str | None,
    last_name: str | None,
    phone: str | None,
    ticket_type_id: int | None = None,
    payment_status: str | None = None,
    desired_short_code: str | None = None,
) -> Ticket:
    ev = db.get(Event, event_id)
    if not ev:
        raise ValueError("Event not found")

    # Enforce event capacity based on issued tickets (assigned/checked_in)
    issued_count = (
        db.query(Ticket)
        .where(Ticket.event_id == event_id, Ticket.status.in_(["assigned", "checked_in"]))
        .count()
    )
    if issued_count >= ev.capacity:
        raise RuntimeError("Event at capacity; cannot assign more tickets")

    # Prefer an available pre-created ticket; otherwise create on demand
    ticket = (
        db.query(Ticket)
        .where(Ticket.event_id == event_id, Ticket.status == "available")
        .order_by(Ticket.id.asc())
        .first()
    )
    if not ticket:
        ticket = Ticket(event_id=event_id)
        db.add(ticket)
        db.flush()

    # Enforce ticket type cap if provided
    if ticket_type_id is not None:
        tt = db.get(TicketType, ticket_type_id)
        if not tt or tt.event_id != event_id:
            raise RuntimeError("Invalid ticket type for this event")
        if tt.max_quantity is not None:
            used_of_type = (
                db.query(Ticket)
                .where(
                    Ticket.event_id == event_id,
                    Ticket.ticket_type_id == ticket_type_id,
                    Ticket.status.in_(["assigned", "checked_in"]),
                )
                .count()
            )
            if used_of_type >= tt.max_quantity:
                raise RuntimeError("Ticket type at max quantity")

    customer = find_or_create_customer(db, email=customer_email, first_name=first_name, last_name=last_name, phone=phone)

    if desired_short_code is not None:
        # Validate desired code availability
        exists = db.execute(
            select(Ticket.id).where(Ticket.event_id == event_id, Ticket.short_code == desired_short_code)
        ).scalar_one_or_none()
        if exists:
            raise RuntimeError("Requested code already used")
        code = desired_short_code
    else:
        code = generate_short_code(db, event_id)

    # Assign
    ticket.customer_id = customer.id
    ticket.short_code = code
    now = datetime.now(timezone.utc)
    ticket.status = "assigned"
    ticket.assigned_at = now
    if ticket_type_id is not None:
        ticket.ticket_type_id = ticket_type_id
    # Default payment status to unpaid if not provided
    if payment_status is None:
        ticket.payment_status = "unpaid"
    else:
        ticket.payment_status = payment_status
    db.add(ticket)
    db.commit()
    db.refresh(ticket)

    # Deliver email based on payment status
    event_when = ev.starts_at.isoformat()
    if ticket.payment_status == "unpaid":
        # Send payment email with GUID link based on ticket UUID
        app_origin = os.getenv("PUBLIC_APP_ORIGIN", "http://localhost:5173")
        payment_link = f"{app_origin}/#pay?token={ticket.uuid}"
        try:
            send_payment_email(
                to_email=customer_email,
                event_title=ev.title,
                event_when=event_when,
                payment_link=payment_link,
            )
        except Exception:
            pass
    else:
        # Send the actual ticket email (with QR) for paid/waived
        api_origin = os.getenv("PUBLIC_API_ORIGIN", os.getenv("API_BASE_URL", "http://localhost:8000"))
        qr_url = f"{api_origin}/qr?data={code}&scale=6"
        try:
            send_ticket_email(
                to_email=customer_email,
                event_title=ev.title,
                event_when=event_when,
                code=code,
                qr_url=qr_url,
            )
            ticket.delivery_status = "sent"
            ticket.delivered_at = now
        except Exception:
            pass
    db.add(ticket)
    db.commit()
    db.refresh(ticket)

    return ticket


def resend_code(db: Session, *, ticket_id: int) -> Ticket:
    ticket = db.get(Ticket, ticket_id)
    if not ticket:
        raise ValueError("Ticket not found")
    if not ticket.customer_id or not ticket.short_code:
        raise RuntimeError("Ticket not assigned or code missing")

    ev = db.get(Event, ticket.event_id)
    cust = db.get(Customer, ticket.customer_id)
    if not cust or not cust.email:
        raise RuntimeError("Customer email missing")

    event_when = ev.starts_at.isoformat() if ev else ""
    if ticket.payment_status == "unpaid":
        app_origin = os.getenv("PUBLIC_APP_ORIGIN", "http://localhost:5173")
        pay_link = f"{app_origin}/#pay?token={ticket.uuid}"
        try:
            send_payment_email(
                to_email=cust.email,
                event_title=ev.title if ev else "Event",
                event_when=event_when,
                payment_link=pay_link,
            )
        except Exception:
            pass
    else:
        api_origin = os.getenv("PUBLIC_API_ORIGIN", os.getenv("API_BASE_URL", "http://localhost:8000"))
        qr_url = f"{api_origin}/qr?data={ticket.short_code}&scale=6"
        try:
            send_ticket_email(
                to_email=cust.email,
                event_title=ev.title if ev else "Event",
                event_when=event_when,
                code=ticket.short_code,
                qr_url=qr_url,
            )
        except Exception:
            pass
    return ticket
