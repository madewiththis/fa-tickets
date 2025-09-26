from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timezone, timedelta
import os

from app.api.deps import db_session
from app.db.models.event import Event
from app.db.models.ticket import Ticket
from app.db.models.ticket_type import TicketType
from app.db.models.customer import Customer
from app.schemas.content import CheckoutRequest, CheckoutResponse, MultiCheckoutRequest, MultiCheckoutResponse, ReserveConfirmRequest, ReserveConfirmResponse
from app.utils.codes import generate_short_code
from sqlalchemy import select
from app.db.models.contact import Contact
from app.db.models.purchase import Purchase
from app.services.allocator import allocate_next_ticket_number
from app.services.emailer import (
    format_event_datetime,
    build_ticket_lines,
    send_reservation_confirmation_buyer,
    send_reserved_assignment_holder,
    send_ticket_email_active,
)

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
                Ticket.status.in_(["held", "assigned", "checked_in"]),
            )
            .count()
        )
        if used_of_type >= tt.max_quantity:
            raise HTTPException(status_code=409, detail="Ticket type at max quantity")

    # Event capacity check removed; rely on ticket type limits only.

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


@router.post("/checkout_multi", response_model=MultiCheckoutResponse)
def content_checkout_multi(req: MultiCheckoutRequest, db: Session = Depends(db_session)):
    ev = db.get(Event, req.event_id)
    if not ev:
        raise HTTPException(status_code=404, detail="Event not found")

    # Buyer contact + customer
    buyer_contact = db.execute(select(Contact).where(Contact.email == req.buyer.email)).scalar_one_or_none()
    if not buyer_contact:
        buyer_contact = Contact(
            email=req.buyer.email,
            first_name=req.buyer.first_name,
            last_name=req.buyer.last_name,
            phone=req.buyer.phone,
        )
        db.add(buyer_contact)
        db.flush()
    buyer_customer = find_or_create_customer(
        db,
        email=req.buyer.email,
        first_name=req.buyer.first_name,
        last_name=req.buyer.last_name,
        phone=req.buyer.phone,
    )

    # Create purchase
    from uuid import uuid4
    purchase = Purchase(buyer_contact_id=buyer_contact.id, uuid=str(uuid4()))
    db.add(purchase)
    db.flush()

    created_ticket_ids: list[int] = []

    # For each item, create tickets for assignees or, if omitted, create qty tickets owned by buyer (unassigned)
    for item in req.items:
        tt = db.get(TicketType, item.ticket_type_id)
        if not tt or tt.event_id != req.event_id:
            raise HTTPException(status_code=400, detail=f"Invalid ticket type {item.ticket_type_id} for this event")

        # Branch 1: explicit assignees provided
        if item.assignees and len(item.assignees) > 0:
            assignees_iter = item.assignees
        else:
            assignees_iter = []

        for a in assignees_iter:
            # Event capacity check removed; rely on ticket type limits only.

            if tt.max_quantity is not None:
                used_of_type = (
                    db.query(Ticket)
                    .where(
                        Ticket.event_id == req.event_id,
                        Ticket.ticket_type_id == item.ticket_type_id,
                        Ticket.status.in_(["held", "assigned", "checked_in"]),
                    )
                    .count()
                )
                if used_of_type >= tt.max_quantity:
                    raise HTTPException(status_code=409, detail=f"Ticket type {tt.name} at max quantity")

            # Find available ticket or create
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

            # Holder customer + contact
            holder_cust = find_or_create_customer(db, email=a.email, first_name=a.first_name, last_name=a.last_name, phone=None)
            holder_contact = db.execute(select(Contact).where(Contact.email == a.email)).scalar_one_or_none()
            if not holder_contact:
                holder_contact = Contact(email=a.email, first_name=a.first_name, last_name=a.last_name)
                db.add(holder_contact)
                db.flush()

            # Assign code and number
            code = generate_short_code(db, req.event_id)
            try:
                ticket.ticket_number = allocate_next_ticket_number(db, event_id=req.event_id)
            except Exception:
                ticket.ticket_number = None

            ticket.customer_id = holder_cust.id
            ticket.holder_contact_id = holder_contact.id
            ticket.ticket_type_id = item.ticket_type_id
            ticket.short_code = code
            ticket.status = "assigned"
            ticket.assigned_at = datetime.now(timezone.utc)
            ticket.payment_status = "unpaid" if (req.pay_later is None or req.pay_later) else "paid"
            ticket.purchase_id = purchase.id
            ticket.delivery_status = "not_sent"
            db.add(ticket)
            db.flush()
            created_ticket_ids.append(ticket.id)

            # Email behavior: pay_later -> reserved assignment; buy_now -> ticket email
            try:
                event_dt = format_event_datetime(ev.starts_at, ev.ends_at)
                if req.pay_later is None or req.pay_later:
                    buyer_name = (req.buyer.first_name or '') + ((' ' + req.buyer.last_name) if req.buyer.last_name else '')
                    expires = (datetime.now(timezone.utc) + timedelta(hours=24)).strftime('%d/%m/%Y %I:%M%p UTC')
                    app_origin2 = os.getenv("PUBLIC_APP_ORIGIN", "http://localhost:5173")
                    view_link = f"{app_origin2}/ticket?ref={ticket.uuid}"
                    line = f"1 x {tt.name} — {tt.price_baht or 0} THB each"
                    send_reserved_assignment_holder(
                        db,
                        to_email=a.email,
                        buyer_name=((buyer_name.strip()) or (req.buyer.email or 'Buyer')),
                        event_title=ev.title,
                        event_dt_str=event_dt,
                        ticket_type_name=tt.name,
                        expires_str=expires,
                        ticket_number=ticket.ticket_number,
                        view_link=view_link,
                        lines=line,
                        total_thb=f"{tt.price_baht or 0} THB",
                        related={'event_id': ev.id, 'ticket_id': ticket.id, 'purchase_id': purchase.id},
                    )
                else:
                    ok = send_ticket_email_active(
                        db,
                        to_email=a.email,
                        event_title=ev.title,
                        event_when_iso=ev.starts_at.isoformat() if ev and ev.starts_at else "",
                        short_code=ticket.short_code or "",
                        ticket_number=ticket.ticket_number,
                        related={'event_id': ev.id, 'ticket_id': ticket.id, 'purchase_id': purchase.id},
                    )
                    if ok:
                        ticket.delivery_status = "sent"
                        db.add(ticket)
            except Exception as _e:
                print('[email] holder email send failed', _e)

        # Branch 2: no assignees provided — create qty tickets owned by buyer (unassigned)
        if (not assignees_iter) and (getattr(item, 'qty', None) or 0) > 0:
            qty = int(getattr(item, 'qty') or 0)
            for _ in range(qty):
                if tt.max_quantity is not None:
                    used_of_type = (
                        db.query(Ticket)
                        .where(
                            Ticket.event_id == req.event_id,
                            Ticket.ticket_type_id == item.ticket_type_id,
                            Ticket.status.in_(["assigned", "checked_in"]),
                        )
                        .count()
                    )
                    if used_of_type >= tt.max_quantity:
                        raise HTTPException(status_code=409, detail=f"Ticket type {tt.name} at max quantity")

                # Find available ticket or create
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

                # Assign code and number
                code2 = generate_short_code(db, req.event_id)
                try:
                    ticket.ticket_number = allocate_next_ticket_number(db, event_id=req.event_id)
                except Exception:
                    ticket.ticket_number = None

                # Mark owned by buyer; holder remains unassigned (null)
                ticket.customer_id = buyer_customer.id
                ticket.holder_contact_id = None
                ticket.ticket_type_id = item.ticket_type_id
                ticket.short_code = code2
                ticket.status = "held"  # allocated; holder unassigned
                ticket.assigned_at = datetime.now(timezone.utc)
                ticket.payment_status = "unpaid" if (req.pay_later is None or req.pay_later) else "paid"
                ticket.purchase_id = purchase.id
                ticket.delivery_status = "not_sent"
                db.add(ticket)
                db.flush()
                created_ticket_ids.append(ticket.id)

                # Email buyer directly on buy_now (send ticket email)
                try:
                    if not (req.pay_later is None or req.pay_later):
                        ok = send_ticket_email_active(
                            db,
                            to_email=req.buyer.email,
                            event_title=ev.title,
                            event_when_iso=ev.starts_at.isoformat() if ev and ev.starts_at else "",
                            short_code=ticket.short_code or "",
                            ticket_number=ticket.ticket_number,
                            related={'event_id': ev.id, 'ticket_id': ticket.id, 'purchase_id': purchase.id},
                        )
                        if ok:
                            ticket.delivery_status = "sent"
                            db.add(ticket)
                except Exception as _e:
                    print('[email] buyer ticket send failed', _e)

    db.commit()
    return MultiCheckoutResponse(purchase_id=purchase.id, ticket_ids=created_ticket_ids)


@router.post("/reserve_confirm", response_model=ReserveConfirmResponse)
def reserve_confirm(req: ReserveConfirmRequest, db: Session = Depends(db_session)):
    ev = db.get(Event, req.event_id)
    if not ev:
        raise HTTPException(status_code=404, detail="Event not found")
    # Compose when string
    # Build summary from items (optional)
    ticket_lines = ""
    total_thb = "0 THB"
    ticket_count = 0
    if req.items:
        ids = {it.ticket_type_id for it in req.items}
        tmap = {t.id: t for t in db.query(TicketType).filter(TicketType.event_id == ev.id, TicketType.id.in_(ids)).all()}
        lines = []
        total = 0
        for it in req.items:
            tt = tmap.get(it.ticket_type_id)
            price = (tt.price_baht or 0) if tt else 0
            lines.append(f"{it.qty} x {(tt.name if tt else f'Type #{it.ticket_type_id}')} — {price} THB each")
            total += price * it.qty
            ticket_count += it.qty
        ticket_lines = "\n".join(lines)
        total_thb = f"{total} THB"
    event_dt = format_event_datetime(ev.starts_at, ev.ends_at)
    expires = (datetime.now(timezone.utc) + timedelta(hours=(req.hold_hours or 24))).strftime('%d/%m/%Y %I:%M%p UTC')
    app_origin = os.getenv("PUBLIC_APP_ORIGIN", "http://localhost:5173")
    secure_link = f"{app_origin}/purchase2?event_id={ev.id}"
    ok = send_reservation_confirmation_buyer(
        db,
        to_email=req.email,
        event_title=ev.title,
        event_dt_str=event_dt,
        ticket_lines=ticket_lines,
        total_thb=total_thb,
        expires_str=expires,
        secure_link=secure_link,
        related={'event_id': ev.id},
    )
    return ReserveConfirmResponse(ok=bool(ok))
