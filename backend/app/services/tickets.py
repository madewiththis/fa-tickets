from datetime import datetime, timezone
import os
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.db.models.event import Event
from app.db.models.ticket import Ticket
from app.db.models.customer import Customer
from app.db.models.contact import Contact
from app.db.models.purchase import Purchase
from app.db.models.ticket_type import TicketType
from app.utils.codes import generate_short_code
from app.services.allocator import allocate_next_ticket_number
from app.integrations.email.service import send_and_log
from app.integrations.email import templates


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

    # Event-level capacity removed. Per-type limits (if any) still enforced below.

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
                    Ticket.status.in_(["held", "assigned", "checked_in"]),
                )
                .count()
            )
            if used_of_type >= tt.max_quantity:
                raise RuntimeError("Ticket type at max quantity")

    customer = find_or_create_customer(db, email=customer_email, first_name=first_name, last_name=last_name, phone=phone)
    # Ensure a contact exists for this email as well (unified contacts)
    contact = db.execute(select(Contact).where(Contact.email == customer_email)).scalar_one_or_none()
    if not contact:
        contact = Contact(email=customer_email, first_name=first_name, last_name=last_name, phone=phone)
        db.add(contact)
        db.flush()

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
    # Allocate a human-visible ticket number if not already present
    if not ticket.ticket_number:
        try:
            ticket.ticket_number = allocate_next_ticket_number(db, event_id=event_id)
        except Exception:
            ticket.ticket_number = None
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
    # If paid/waived at assignment time, create a purchase and associate
    if ticket.payment_status in ("paid", "waived"):
        from uuid import uuid4
        p = Purchase(buyer_contact_id=contact.id, uuid=str(uuid4()))
        db.add(p)
        db.flush()
        ticket.purchase_id = p.id
    db.add(ticket)
    db.commit()
    db.refresh(ticket)

    # Deliver email based on payment status
    event_when = ev.starts_at.isoformat()
    if ticket.payment_status == "unpaid":
        # Send reserved assignment to holder
        try:
            # Event datetime string
            import datetime as _dt
            def _pad(n: int): return str(n).zfill(2)
            def _time(d: _dt.datetime):
                h = d.hour; m = d.minute; am = h < 12; h12 = (h % 12) or 12
                return f"{h12}{(':'+_pad(m)) if m else ''}{'am' if am else 'pm'}"
            s = ev.starts_at.astimezone(_dt.timezone.utc)
            e = ev.ends_at.astimezone(_dt.timezone.utc) if ev.ends_at else None
            s_str = f"{_pad(s.day)}/{_pad(s.month)}/{s.year} {_time(s)}"
            e_str = f"{_pad(e.day)}/{_pad(e.month)}/{e.year} {_time(e)}" if e else None
            event_dt = f"{s_str}{(' — ' + e_str) if e_str else ''}"
            expires = (_dt.datetime.now(_dt.timezone.utc) + _dt.timedelta(hours=24)).strftime('%d/%m/%Y %I:%M%p UTC')
            app_origin2 = os.getenv("PUBLIC_APP_ORIGIN", "http://localhost:5173")
            view_link = f"{app_origin2}/ticket?token={ticket.uuid}"
            tt_name = None
            if ticket_type_id is not None:
                tt = db.get(TicketType, ticket_type_id)
                tt_name = tt.name if tt else None
            subject, text, html = templates.reserved_assignment_holder(
                buyer_name=customer_email,  # placeholder if buyer name unknown in this flow
                event_title=ev.title,
                event_datetime=event_dt,
                ticket_type_name=tt_name or 'Ticket',
                reservation_expires_at=expires,
                ticket_number=ticket.ticket_number,
                view_ticket_link=view_link,
            )
            send_and_log(to_email=customer_email, subject=subject, text=text, html=html, template_name='reserved_assignment_holder', context={'event_id': ev.id}, db=db, related={'event_id': ev.id, 'ticket_id': ticket.id})
        except Exception:
            pass
    else:
        # Send the actual ticket email (with QR) for paid/waived
        api_origin = os.getenv("PUBLIC_API_ORIGIN", os.getenv("API_BASE_URL", "http://localhost:8000"))
        qr_url = f"{api_origin}/qr?data={code}&scale=6&format=png"
        app_origin2 = os.getenv("PUBLIC_APP_ORIGIN", "http://localhost:5173")
        view_link = f"{app_origin2}/ticket?token={ticket.uuid}"
        try:
            subject, text, html = templates.ticket_email(ev.title, event_when, code, qr_url, view_link, ticket.ticket_number)
            ok = send_and_log(to_email=customer_email, subject=subject, text=text, html=html, template_name='ticket_email', context={'event_id': ev.id, 'code': code}, db=db, related={'event_id': ev.id, 'ticket_id': ticket.id})
            if ok:
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
        # Use reservation-style confirmation with pay link
        app_origin = os.getenv("PUBLIC_APP_ORIGIN", "http://localhost:5173")
        pay_link = f"{app_origin}/pay?token={ticket.uuid}"
        # Minimal line and total
        tt = db.get(TicketType, ticket.ticket_type_id) if ticket.ticket_type_id else None
        lines = f"1 x {tt.name if tt else 'Ticket'} — {(tt.price_baht or 0) if tt else 0} THB each"
        total = f"{(tt.price_baht or 0) if tt else 0} THB"
        import datetime as _dt
        s = ev.starts_at.astimezone(_dt.timezone.utc) if ev else _dt.datetime.now(_dt.timezone.utc)
        e = ev.ends_at.astimezone(_dt.timezone.utc) if ev and ev.ends_at else None
        def _pad(n:int): return str(n).zfill(2)
        def _time(d: _dt.datetime):
            h=d.hour; m=d.minute; am=h<12; h12=(h%12) or 12
            return f"{h12}{(':'+_pad(m)) if m else ''}{'am' if am else 'pm'}"
        event_dt = f"{_pad(s.day)}/{_pad(s.month)}/{s.year} {_time(s)}" + (f" — {_pad(e.day)}/{_pad(e.month)}/{e.year} {_time(e)}" if e else '')
        expires = (_dt.datetime.now(_dt.timezone.utc) + _dt.timedelta(hours=24)).strftime('%d/%m/%Y %I:%M%p UTC')
        try:
            subject, text, html = templates.confirm_ticket_reservation(ev.title if ev else "Event", event_dt, 1, lines, total, expires, pay_link)
            send_and_log(to_email=cust.email, subject=subject, text=text, html=html, template_name='confirm_ticket_reservation', context={'event_id': ev.id if ev else None, 'payment_link': pay_link}, db=db, related={'event_id': ev.id if ev else None, 'ticket_id': ticket.id})
        except Exception:
            pass
    else:
        api_origin = os.getenv("PUBLIC_API_ORIGIN", os.getenv("API_BASE_URL", "http://localhost:8000"))
        qr_url = f"{api_origin}/qr?data={ticket.short_code}&scale=6&format=png"
        app_origin2 = os.getenv("PUBLIC_APP_ORIGIN", "http://localhost:5173")
        view_link = f"{app_origin2}/ticket?code={ticket.short_code}"
        try:
            send_ticket_email(
                to_email=cust.email,
                event_title=ev.title if ev else "Event",
                event_when=event_when,
                code=ticket.short_code,
                qr_url=qr_url,
                view_link=view_link,
                ticket_number=ticket.ticket_number,
            )
        except Exception:
            pass
    return ticket


def unassign_ticket(db: Session, *, ticket_id: int, reason: str | None = None) -> Ticket:
    t = db.get(Ticket, ticket_id)
    if not t:
        raise ValueError("Ticket not found")

    # Allow unassign for unpaid or waived tickets
    if t.payment_status not in ("unpaid", "waived"):
        raise RuntimeError("Unassign allowed only for unpaid or waived tickets")

    # Capture current customer email before clearing linkage
    cust = db.get(Customer, t.customer_id) if t.customer_id else None
    cust_email = cust.email if cust and cust.email else None

    # Clear printed number; keep immutable code for history
    t.ticket_number = None
    # Mark back to available and clear customer linkage
    t.status = "available"
    t.customer_id = None
    t.assigned_at = None
    t.delivered_at = None
    t.delivery_status = "not_sent"
    db.add(t)
    db.commit()
    db.refresh(t)

    # Notify prior holder if we have their email
    ev = db.get(Event, t.event_id)
    event_when = ev.starts_at.isoformat() if ev else ""
    if cust_email:
        try:
            subject, text, html = templates.unassign_email(ev.title if ev else "Event", event_when, reason)
            send_and_log(to_email=cust_email, subject=subject, text=text, html=html, template_name='unassign_email', context={'event_id': ev.id if ev else None, 'reason': reason}, db=db, related={'event_id': ev.id if ev else None, 'ticket_id': t.id})
        except Exception:
            pass

    return t


def refund_ticket(db: Session, *, ticket_id: int, reason: str | None = None) -> Ticket:
    t = db.get(Ticket, ticket_id)
    if not t:
        raise ValueError("Ticket not found")

    if t.payment_status != "paid":
        raise RuntimeError("Refund allowed only for paid tickets")

    # Release number
    t.ticket_number = None
    # Mark refunding/voiding and preserve attendance info if any
    was_checked_in = (t.status == "checked_in")
    t.payment_status = "refunding"
    if was_checked_in:
        t.attendance_refunded = True
    # Optionally move status; we keep status as-is for audit, but could set to delivered or void
    db.add(t)
    db.commit()
    db.refresh(t)

    # Email buyer/holder (using customer for now)
    ev = db.get(Event, t.event_id)
    event_when = ev.starts_at.isoformat() if ev else ""
    is_comp = False
    cust = db.get(Customer, t.customer_id) if t.customer_id else None
    if cust and cust.email:
        try:
            subject, text, html = templates.refund_initiated_email(ev.title if ev else "Event", event_when, reason, is_comp)
            send_and_log(to_email=cust.email, subject=subject, text=text, html=html, template_name='refund_initiated_email', context={'event_id': ev.id if ev else None, 'reason': reason}, db=db, related={'event_id': ev.id if ev else None, 'ticket_id': t.id})
        except Exception:
            pass

    return t


def reassign_ticket(
    db: Session,
    *,
    ticket_id: int,
    email: str,
    first_name: str | None = None,
    last_name: str | None = None,
    phone: str | None = None,
) -> Ticket:
    t = db.get(Ticket, ticket_id)
    if not t:
        raise ValueError("Ticket not found")

    # Find or create customer + contact for new holder
    cust = find_or_create_customer(db, email=email, first_name=first_name, last_name=last_name, phone=phone)
    contact = db.execute(select(Contact).where(Contact.email == email)).scalar_one_or_none()
    if not contact:
        contact = Contact(email=email, first_name=first_name, last_name=last_name, phone=phone)
        db.add(contact)
        db.flush()

    # Apply change
    t.customer_id = cust.id
    t.holder_contact_id = contact.id
    # Transition held -> assigned on first assignment
    if t.status == "held":
        t.status = "assigned"
        t.assigned_at = datetime.now(timezone.utc)
    db.add(t)
    db.commit()
    db.refresh(t)

    # Optionally resend appropriate email to new holder
    ev = db.get(Event, t.event_id)
    event_when = ev.starts_at.isoformat() if ev else ""
    try:
        if t.payment_status == "unpaid":
            # Send reservation-style email to new holder with payment link
            app_origin = os.getenv("PUBLIC_APP_ORIGIN", "http://localhost:5173")
            pay_link = f"{app_origin}/pay?token={t.uuid}"
            # Build minimal lines/total using ticket type price if available
            tt = db.get(TicketType, t.ticket_type_id) if t.ticket_type_id else None
            lines = f"1 x {tt.name if tt else 'Ticket'} — {(tt.price_baht or 0) if tt else 0} THB each"
            total = f"{(tt.price_baht or 0) if tt else 0} THB"
            # Event datetime human string
            import datetime as _dt
            s = ev.starts_at.astimezone(_dt.timezone.utc) if ev else _dt.datetime.now(_dt.timezone.utc)
            e = ev.ends_at.astimezone(_dt.timezone.utc) if ev and ev.ends_at else None
            def _pad(n:int): return str(n).zfill(2)
            def _time(d: _dt.datetime):
                h=d.hour; m=d.minute; am=h<12; h12=(h%12) or 12
                return f"{h12}{(':'+_pad(m)) if m else ''}{'am' if am else 'pm'}"
            event_dt = f"{_pad(s.day)}/{_pad(s.month)}/{s.year} {_time(s)}" + (f" — {_pad(e.day)}/{_pad(e.month)}/{e.year} {_time(e)}" if e else '')
            expires = ( _dt.datetime.now(_dt.timezone.utc) + _dt.timedelta(hours=24)).strftime('%d/%m/%Y %I:%M%p UTC')
            subject, text, html = templates.confirm_ticket_reservation(ev.title if ev else "Event", event_dt, 1, lines, total, expires, pay_link)
            send_and_log(to_email=email, subject=subject, text=text, html=html, template_name='confirm_ticket_reservation', context={'event_id': ev.id if ev else None, 'payment_link': pay_link}, db=db, related={'event_id': ev.id if ev else None, 'ticket_id': t.id})
        else:
            api_origin = os.getenv("PUBLIC_API_ORIGIN", os.getenv("API_BASE_URL", "http://localhost:8000"))
            qr_url = f"{api_origin}/qr?data={t.short_code}&scale=6&format=png" if t.short_code else None
            app_origin2 = os.getenv("PUBLIC_APP_ORIGIN", "http://localhost:5173")
            view_link = f"{app_origin2}/ticket?code={t.short_code}" if t.short_code else None
            subject, text, html = templates.ticket_email(ev.title if ev else "Event", event_when, t.short_code or "", qr_url, view_link, t.ticket_number)
            send_and_log(to_email=email, subject=subject, text=text, html=html, template_name='ticket_email', context={'event_id': ev.id if ev else None, 'code': t.short_code}, db=db, related={'event_id': ev.id if ev else None, 'ticket_id': t.id})
    except Exception:
        pass

    return t
