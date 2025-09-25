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


class MultiAssignee(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    email: EmailStr


class MultiItem(BaseModel):
    ticket_type_id: int
    # Either provide explicit assignees (existing behaviour) or a qty to
    # create unassigned tickets owned by the buyer.
    assignees: list[MultiAssignee] | None = None
    qty: int | None = None


class MultiCheckoutRequest(BaseModel):
    event_id: int
    buyer: CheckoutCustomer
    items: list[MultiItem]
    # When true (default), tickets remain unpaid and we send reservation-style emails.
    # When false (Buy now), mark tickets as paid and send ticket emails.
    pay_later: bool | None = True


class MultiCheckoutResponse(BaseModel):
    purchase_id: int
    ticket_ids: list[int]


class ReserveConfirmItem(BaseModel):
    ticket_type_id: int
    qty: int


class ReserveConfirmRequest(BaseModel):
    event_id: int
    email: EmailStr
    hold_hours: int | None = None
    items: list[ReserveConfirmItem] | None = None


class ReserveConfirmResponse(BaseModel):
    ok: bool
