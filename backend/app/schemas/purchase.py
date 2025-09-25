from __future__ import annotations

from pydantic import BaseModel
from datetime import datetime


class PurchaseTicket(BaseModel):
    id: int
    event_id: int
    event_title: str | None = None
    event_starts_at: datetime | None = None
    event_ends_at: datetime | None = None
    ticket_number: str | None = None
    short_code: str | None = None
    status: str
    payment_status: str
    holder_contact_id: int | None = None
    type_id: int | None = None
    type_name: str | None = None
    type_price: int | None = None


class PurchaseRead(BaseModel):
    id: int
    buyer: dict
    external_payment_ref: str | None = None
    total_amount: int | None = None
    currency: str | None = None
    created_at: datetime | None = None
    tickets: list[PurchaseTicket]
