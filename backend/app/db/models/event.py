from sqlalchemy import Integer, String, DateTime, func, Text
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import JSONB
from app.db.base import Base


class Event(Base):
    __tablename__ = "event"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    starts_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), nullable=False)
    ends_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), nullable=True)
    # Renamed from `location` to `location_name` (compat property below)
    location_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    # Address details (JSON structure, e.g., { line1, line2, city, state, postcode, country })
    location_address: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    # Google Maps link for the address/location
    address_maps_link: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    # Freeform guidance on getting there
    location_getting_there: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Contact details for the event
    contact_phone: Mapped[str | None] = mapped_column(String(64), nullable=True)
    contact_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    contact_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    capacity: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Compatibility shim for old attribute name `location`
    @property
    def location(self) -> str | None:  # type: ignore[override]
        return self.location_name

    @location.setter
    def location(self, value: str | None) -> None:  # type: ignore[override]
        self.location_name = value
