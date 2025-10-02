from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Literal

from app.api.deps import db_session
from app.db.models.event import Event
from app.db.models.ticket import Ticket
from app.schemas.event import EventCreate, EventRead, EventUpdate
import uuid
from app.schemas.ticket import TicketRead, AttendeeRead
from app.schemas.ticket_type import TicketTypeRead, TicketTypeCreate, TicketTypeUpdate
from app.db.models.event_promotion import EventPromotion
from app.schemas.event_promotion import EventPromotionRead, EventPromotionUpsert
from app.db.models.customer import Customer
from app.db.models.ticket_type import TicketType
from app.db.models.contact import Contact
from app.db.models.purchase import Purchase
from sqlalchemy import func, case
from app.db.models.purchase import Purchase
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
        # Capacity is deprecated; default to a high number if not provided
        capacity=payload.capacity or 1_000_000,
        location_name=location_name,
        location_address=payload.location_address,
        address_maps_link=str(payload.address_maps_link) if payload.address_maps_link else None,
        location_getting_there=payload.location_getting_there,
        contact_phone=payload.contact_phone,
        contact_email=str(payload.contact_email) if payload.contact_email else None,
        contact_url=str(payload.contact_url) if payload.contact_url else None,
        public_id=str(uuid.uuid4()),
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
    if not ev.public_id:
        ev.public_id = str(uuid.uuid4())
        db.add(ev)
        db.commit()
        db.refresh(ev)
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
    status: Literal["available", "held", "assigned", "delivered", "checked_in", "void"] | None = Query(None),
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
                Ticket.uuid.label("ticket_uuid"),
                Ticket.short_code,
                Ticket.ticket_number,
                Ticket.status,
                Ticket.payment_status,
                Ticket.ticket_type_id,
                Ticket.checked_in_at,
                Ticket.purchase_id,
                Purchase.external_payment_ref,
                Customer.id.label("customer_id"),
                Customer.first_name,
                Customer.last_name,
                Customer.email,
                Customer.phone,
            )
            .join(Customer, Customer.id == Ticket.customer_id)
            .outerjoin(Purchase, Purchase.id == Ticket.purchase_id)
            .where(Ticket.event_id == event_id)
            .order_by(Ticket.id.asc())
        )
        .mappings()
        .all()
    )
    return [dict(r) for r in rows]


@router.get("/{event_id}/purchases")
def list_event_purchases(event_id: int, db: Session = Depends(db_session)):
    ev = db.get(Event, event_id)
    if not ev:
        raise HTTPException(status_code=404, detail="Event not found")
    q = (
        select(
            Purchase.id,
            Purchase.external_payment_ref,
            Purchase.total_amount,
            Purchase.currency,
            Purchase.created_at,
            func.count(Ticket.id).label("tickets"),
            func.coalesce(func.sum(TicketType.price_baht), 0).label("sum_price"),
            func.coalesce(func.sum(case((Ticket.payment_status == 'paid', 1), else_=0)), 0).label('paid_count'),
            func.coalesce(func.sum(case((Ticket.payment_status == 'unpaid', 1), else_=0)), 0).label('unpaid_count'),
            func.coalesce(func.sum(case((Ticket.payment_status == 'waived', 1), else_=0)), 0).label('waived_count'),
            Contact.first_name.label('buyer_first_name'),
            Contact.last_name.label('buyer_last_name'),
            Contact.email.label('buyer_email'),
            Contact.phone.label('buyer_phone'),
        )
        .join(Ticket, Ticket.purchase_id == Purchase.id)
        .join(Contact, Contact.id == Purchase.buyer_contact_id)
        .outerjoin(TicketType, TicketType.id == Ticket.ticket_type_id)
        .where(Ticket.event_id == event_id)
        .group_by(
            Purchase.id,
            Purchase.external_payment_ref,
            Purchase.total_amount,
            Purchase.currency,
            Purchase.created_at,
            Contact.first_name,
            Contact.last_name,
            Contact.email,
            Contact.phone,
        )
        .order_by(Purchase.created_at.desc())
    )
    rows = db.execute(q).mappings().all()
    result = []
    for r in rows:
        d = dict(r)
        d['buyer'] = {
            'first_name': d.pop('buyer_first_name', None),
            'last_name': d.pop('buyer_last_name', None),
            'email': d.pop('buyer_email', None),
            'phone': d.pop('buyer_phone', None),
        }
        result.append(d)
    return result


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
    # Event capacity constraint removed; rely on per-type max_quantity only.
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


@router.get("/public/{public_id}", response_model=EventRead)
def resolve_event(public_id: str, db: Session = Depends(db_session)):
    ev = db.query(Event).filter(Event.public_id == public_id).first()
    if not ev:
        raise HTTPException(status_code=404, detail="Event not found")
    return ev


@router.get("/{event_id}/promotion", response_model=EventPromotionRead)
def get_event_promotion(event_id: int, db: Session = Depends(db_session)):
    ev = db.get(Event, event_id)
    if not ev:
        raise HTTPException(status_code=404, detail="Event not found")
    ep = db.query(EventPromotion).filter(EventPromotion.event_id == event_id).one_or_none()
    content = ep.content if ep and ep.content else {}
    return {
        "event_id": event_id,
        "description": content.get("description"),
        "speakers": content.get("speakers"),
        "audience": content.get("audience"),
    }


@router.put("/{event_id}/promotion", response_model=EventPromotionRead)
def upsert_event_promotion(event_id: int, payload: EventPromotionUpsert, db: Session = Depends(db_session)):
    ev = db.get(Event, event_id)
    if not ev:
        raise HTTPException(status_code=404, detail="Event not found")
    ep = db.query(EventPromotion).filter(EventPromotion.event_id == event_id).one_or_none()
    content = {
        "description": payload.description,
        "speakers": payload.speakers,
        "audience": payload.audience,
    }
    if not ep:
        ep = EventPromotion(event_id=event_id, content=content)
        db.add(ep)
    else:
        ep.content = content
        db.add(ep)
    db.commit()
    return {
        "event_id": event_id,
        "description": content.get("description"),
        "speakers": content.get("speakers"),
        "audience": content.get("audience"),
    }


@router.patch("/ticket_types/{ticket_type_id}", response_model=TicketTypeRead)
def update_ticket_type(ticket_type_id: int, payload: TicketTypeUpdate, db: Session = Depends(db_session)):
    tt = db.get(TicketType, ticket_type_id)
    if not tt:
        raise HTTPException(status_code=404, detail="Ticket type not found")
    ev = db.get(Event, tt.event_id)
    # Event capacity constraint removed; rely on per-type max_quantity only.
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
