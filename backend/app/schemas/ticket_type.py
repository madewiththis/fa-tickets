from pydantic import BaseModel, Field


class TicketTypeRead(BaseModel):
    id: int
    event_id: int
    name: str
    price_baht: int | None
    max_quantity: int | None
    active: bool

    class Config:
        from_attributes = True


class TicketTypeCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    price_baht: int | None = Field(default=None, ge=0)
    max_quantity: int | None = Field(default=None, ge=0)
    active: bool = True


class TicketTypeUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    price_baht: int | None = Field(default=None, ge=0)
    max_quantity: int | None = Field(default=None, ge=0)
    active: bool | None = None

