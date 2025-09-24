from datetime import datetime
from pydantic import BaseModel


class TicketRead(BaseModel):
    id: int
    event_id: int
    customer_id: int | None
    short_code: str | None
    status: str
    checked_in_at: datetime | None

    class Config:
        from_attributes = True


class AttendeeRead(BaseModel):
    ticket_id: int
    short_code: str | None
    status: str
    payment_status: str | None = None
    checked_in_at: datetime | None
    customer_id: int
    first_name: str | None
    last_name: str | None
    email: str | None
    phone: str | None

    class Config:
        from_attributes = True
