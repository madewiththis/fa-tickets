from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Literal

from app.api.deps import db_session
from app.db.models.event import Event
from app.db.models.ticket import Ticket
from app.schemas.event import EventCreate, EventRead, EventUpdate
from app.schemas.ticket import TicketRead, AttendeeRead
from app.schemas.ticket_type import TicketTypeRead, TicketTypeCreate, TicketTypeUpdate
from app.db.models.customer import Customer
from app.db.models.ticket_type import TicketType
from sqlalchemy import select, func

router = APIRouter(prefix="/events", tags=["events"])


@router.get("", response_model=list[EventRead])
def list_events(
    db: Session = Depends(db_session),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    items = (
        db.query(Event)
        .order_by(Event.starts_at.desc())
        .limit(limit)
        .offset(offset)
        .all()
    )
    return items


@router.post("", response_model=EventRead, status_code=201)
def create_event(payload: EventCreate, db: Session = Depends(db_session)):
    # Map legacy `location` to new `location_name` if provided
    location_name = payload.location_name if payload.location_name is not None else payload.location
    ev = Event(
        title=payload.title,
        starts_at=payload.starts_at,
        ends_at=payload.ends_at,
        capacity=payload.capacity,
        location_name=location_name,
        location_address=payload.location_address,
        address_maps_link=str(payload.address_maps_link) if payload.address_maps_link else None,
        location_getting_there=payload.location_getting_there,
        contact_phone=payload.contact_phone,
        contact_email=str(payload.contact_email) if payload.contact_email else None,
        contact_url=str(payload.contact_url) if payload.contact_url else None,
    )
    db.add(ev)
    db.commit()
    db.refresh(ev)
    return ev


@router.get("/{event_id}", response_model=EventRead)
def get_event(event_id: int, db: Session = Depends(db_session)):
    ev = db.get(Event, event_id)
    if not ev:
        raise HTTPException(status_code=404, detail="Event not found")
    return ev


@router.patch("/{event_id}", response_model=EventRead)
def update_event(event_id: int, payload: EventUpdate, db: Session = Depends(db_session)):
    ev = db.get(Event, event_id)
    if not ev:
        raise HTTPException(status_code=404, detail="Event not found")

    # Apply partial updates
    if payload.title is not None:
        ev.title = payload.title
    if payload.starts_at is not None:
        ev.starts_at = payload.starts_at
    if payload.ends_at is not None:
        ev.ends_at = payload.ends_at
    # Map legacy `location` to `location_name` if provided
    if payload.location is not None:
        ev.location_name = payload.location
    if payload.location_name is not None:
        ev.location_name = payload.location_name
    if payload.location_address is not None:
        ev.location_address = payload.location_address
    if payload.address_maps_link is not None:
        ev.address_maps_link = str(payload.address_maps_link) if payload.address_maps_link else None
    if payload.location_getting_there is not None:
        ev.location_getting_there = payload.location_getting_there
    if payload.contact_phone is not None:
        ev.contact_phone = payload.contact_phone
    if payload.contact_email is not None:
        ev.contact_email = str(payload.contact_email) if payload.contact_email else None
    if payload.contact_url is not None:
        ev.contact_url = str(payload.contact_url) if payload.contact_url else None
    if payload.capacity is not None:
        ev.capacity = payload.capacity

    db.add(ev)
    db.commit()
    db.refresh(ev)
    return ev


@router.post("/{event_id}/seed")
def seed_event_tickets(event_id: int, db: Session = Depends(db_session)):
    ev = db.get(Event, event_id)
    if not ev:
        raise HTTPException(status_code=404, detail="Event not found")

    existing = db.query(Ticket).filter(Ticket.event_id == event_id).count()
    to_create = max(ev.capacity - existing, 0)
    if to_create > 0:
        db.add_all([Ticket(event_id=event_id) for _ in range(to_create)])
        db.commit()
    return {"event_id": event_id, "capacity": ev.capacity, "existing": existing, "created": to_create}


@router.get("/{event_id}/tickets", response_model=list[TicketRead])
def list_event_tickets(
    event_id: int,
    status: Literal["available", "assigned", "delivered", "checked_in", "void"] | None = Query(None),
    db: Session = Depends(db_session),
):
    ev = db.get(Event, event_id)
    if not ev:
        raise HTTPException(status_code=404, detail="Event not found")

    q = db.query(Ticket).filter(Ticket.event_id == event_id)
    if status:
        q = q.filter(Ticket.status == status)
    tickets = q.order_by(Ticket.id.asc()).all()
    return tickets


@router.get("/{event_id}/attendees", response_model=list[AttendeeRead])
def list_event_attendees(event_id: int, db: Session = Depends(db_session)):
    ev = db.get(Event, event_id)
    if not ev:
        raise HTTPException(status_code=404, detail="Event not found")

    rows = (
        db.execute(
            select(
                Ticket.id.label("ticket_id"),
                Ticket.short_code,
                Ticket.status,
                Ticket.payment_status,
                Ticket.checked_in_at,
                Customer.id.label("customer_id"),
                Customer.first_name,
                Customer.last_name,
                Customer.email,
                Customer.phone,
            )
            .join(Customer, Customer.id == Ticket.customer_id)
            .where(Ticket.event_id == event_id)
            .order_by(Ticket.id.asc())
        )
        .mappings()
        .all()
    )
    return [dict(r) for r in rows]


@router.get("/{event_id}/ticket_types", response_model=list[TicketTypeRead])
def list_ticket_types(event_id: int, db: Session = Depends(db_session)):
    ev = db.get(Event, event_id)
    if not ev:
        raise HTTPException(status_code=404, detail="Event not found")
    items = db.query(TicketType).filter(TicketType.event_id == event_id).order_by(TicketType.id.asc()).all()
    return items


@router.post("/{event_id}/ticket_types", response_model=TicketTypeRead, status_code=201)
def create_ticket_type(event_id: int, payload: TicketTypeCreate, db: Session = Depends(db_session)):
    ev = db.get(Event, event_id)
    if not ev:
        raise HTTPException(status_code=404, detail="Event not found")
    # Enforce sum of max_quantity of active types does not exceed event capacity (ignoring None)
    existing_sum = (
        db.query(func.coalesce(func.sum(TicketType.max_quantity), 0))
        .filter(TicketType.event_id == event_id, TicketType.active == True, TicketType.max_quantity.isnot(None))
        .scalar()
    )
    add_qty = payload.max_quantity or 0
    if existing_sum + add_qty > ev.capacity:
        raise HTTPException(status_code=400, detail="Total ticket type quantities exceed event capacity")
    tt = TicketType(
        event_id=event_id,
        name=payload.name,
        price_baht=payload.price_baht,
        max_quantity=payload.max_quantity,
        active=payload.active,
    )
    db.add(tt)
    db.commit()
    db.refresh(tt)
    return tt


@router.patch("/ticket_types/{ticket_type_id}", response_model=TicketTypeRead)
def update_ticket_type(ticket_type_id: int, payload: TicketTypeUpdate, db: Session = Depends(db_session)):
    tt = db.get(TicketType, ticket_type_id)
    if not tt:
        raise HTTPException(status_code=404, detail="Ticket type not found")
    ev = db.get(Event, tt.event_id)
    # Compute prospective sum if changing max_quantity or active
    new_active = tt.active if payload.active is None else payload.active
    new_max = tt.max_quantity if payload.max_quantity is None else payload.max_quantity
    # Sum other active types
    others_sum = (
        db.query(func.coalesce(func.sum(TicketType.max_quantity), 0))
        .filter(
            TicketType.event_id == tt.event_id,
            TicketType.id != tt.id,
            TicketType.active == True,
            TicketType.max_quantity.isnot(None),
        )
        .scalar()
    )
    candidate_sum = others_sum + (new_max or 0)
    if new_active and candidate_sum > ev.capacity:
        raise HTTPException(status_code=400, detail="Total ticket type quantities exceed event capacity")
    if payload.name is not None:
        tt.name = payload.name
    if payload.price_baht is not None:
        tt.price_baht = payload.price_baht
    if payload.max_quantity is not None:
        tt.max_quantity = payload.max_quantity
    if payload.active is not None:
        tt.active = payload.active
    db.add(tt)
    db.commit()
    db.refresh(tt)
    return tt
