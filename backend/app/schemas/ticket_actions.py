from pydantic import BaseModel, Field
from typing import Literal
from datetime import datetime


class UnassignRequest(BaseModel):
    ticket_id: int


class UnassignResponse(BaseModel):
    ticket_id: int
    event_id: int
    payment_status: Literal['unpaid','paid','waived','refunding','refunded','voiding','voided']
    status: str
    ticket_number: str | None = None


class RefundRequest(BaseModel):
    ticket_id: int


class RefundResponse(BaseModel):
    ticket_id: int
    event_id: int
    payment_status: Literal['refunding','voiding','refunded','voided']
    attendance_refunded: bool
    status: str


class TicketByCodeResponse(BaseModel):
    event: dict
    ticket: dict
    holder: dict | None = None


class ReassignRequest(BaseModel):
    ticket_id: int
    email: str
    first_name: str | None = None
    last_name: str | None = None
    phone: str | None = None


class ReassignResponse(BaseModel):
    ticket_id: int
    event_id: int
    customer_email: str | None = None
    holder_contact_id: int | None = None
    short_code: str | None = None
