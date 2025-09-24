from pydantic import BaseModel, Field


class TicketLookupRequest(BaseModel):
    event_id: int | None = None
    code: str | None = Field(default=None, min_length=3, max_length=3)
    token: str | None = None


class TicketLookupResponse(BaseModel):
    ticket_id: int
    event_id: int
    short_code: str | None
    payment_status: str
    status: str
    event_title: str | None = None


class PayRequest(BaseModel):
    # Token-based pay (preferred)
    token: str | None = None
    # Legacy support: event_id + code
    event_id: int | None = None
    code: str | None = Field(default=None, min_length=3, max_length=3)


class PayResponse(BaseModel):
    ticket_id: int
    event_id: int
    short_code: str
    payment_status: str
    status: str
