from pydantic import BaseModel, EmailStr


class CheckoutCustomer(BaseModel):
    email: EmailStr
    first_name: str | None = None
    last_name: str | None = None
    phone: str | None = None


class CheckoutRequest(BaseModel):
    event_id: int
    ticket_type_id: int
    customer: CheckoutCustomer


class CheckoutResponse(BaseModel):
    ticket_id: int
    event_id: int
    ticket_type_id: int
    email: str
    token: str

