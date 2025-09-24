from pydantic import BaseModel, EmailStr, Field
from typing import Literal
from datetime import datetime


class AssignCustomer(BaseModel):
    email: EmailStr
    first_name: str | None = Field(default=None, max_length=100)
    last_name: str | None = Field(default=None, max_length=100)
    phone: str | None = Field(default=None, max_length=50)


class AssignRequest(BaseModel):
    event_id: int
    customer: AssignCustomer
    ticket_type_id: int | None = None
    payment_status: Literal['unpaid','paid','waived'] | None = None
    desired_short_code: str | None = Field(default=None, min_length=3, max_length=3)


class AssignPreviewRequest(BaseModel):
    event_id: int


class AssignPreviewResponse(BaseModel):
    event_id: int
    short_code: str
    event_title: str
    starts_at: datetime


class AssignResponse(BaseModel):
    ticket_id: int
    event_id: int
    customer_email: EmailStr
    short_code: str
    status: str
