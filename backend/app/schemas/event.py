from datetime import datetime
from typing import Any
from pydantic import BaseModel, Field, EmailStr, AnyUrl


class EventCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    starts_at: datetime
    ends_at: datetime | None = None
    # Legacy field maintained for compatibility; maps to location_name
    location: str | None = Field(default=None, max_length=255)
    # New fields
    location_name: str | None = Field(default=None, max_length=255)
    location_address: dict[str, Any] | None = None
    address_maps_link: AnyUrl | None = None
    location_getting_there: str | None = None
    contact_phone: str | None = Field(default=None, max_length=64)
    contact_email: EmailStr | None = None
    contact_url: AnyUrl | None = None
    capacity: int = Field(ge=1)


class EventRead(BaseModel):
    id: int
    title: str
    starts_at: datetime
    ends_at: datetime | None
    # Legacy name retained, backed by Event.location property
    location: str | None
    # New fields available to clients migrating to enhanced model
    location_name: str | None = None
    location_address: dict[str, Any] | None = None
    address_maps_link: AnyUrl | None = None
    location_getting_there: str | None = None
    contact_phone: str | None = None
    contact_email: EmailStr | None = None
    contact_url: AnyUrl | None = None
    capacity: int

    class Config:
        from_attributes = True


class EventUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    # Legacy field maintained for compatibility; maps to location_name
    location: str | None = Field(default=None, max_length=255)
    # New fields
    location_name: str | None = Field(default=None, max_length=255)
    location_address: dict[str, Any] | None = None
    address_maps_link: AnyUrl | None = None
    location_getting_there: str | None = None
    contact_phone: str | None = Field(default=None, max_length=64)
    contact_email: EmailStr | None = None
    contact_url: AnyUrl | None = None
    capacity: int | None = Field(default=None, ge=1)
