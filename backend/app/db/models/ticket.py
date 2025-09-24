import uuid as uuidlib
from sqlalchemy import (
    Integer,
    String,
    DateTime,
    ForeignKey,
    func,
    Enum,
    UniqueConstraint,
    Index,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class Ticket(Base):
    __tablename__ = "ticket"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    uuid: Mapped[str] = mapped_column(UUID(as_uuid=False), unique=True, nullable=False, default=lambda: str(uuidlib.uuid4()))
    event_id: Mapped[int] = mapped_column(ForeignKey("event.id", ondelete="CASCADE"), nullable=False)
    ticket_type_id: Mapped[int | None] = mapped_column(ForeignKey("ticket_type.id", ondelete="SET NULL"), nullable=True)
    customer_id: Mapped[int | None] = mapped_column(ForeignKey("customer.id", ondelete="SET NULL"), nullable=True)
    short_code: Mapped[str | None] = mapped_column(String(3), nullable=True)
    status: Mapped[str] = mapped_column(
        Enum("available", "assigned", "delivered", "checked_in", "void", name="ticket_status"),
        nullable=False,
        server_default="available",
    )
    payment_status: Mapped[str] = mapped_column(
        Enum("unpaid", "paid", "waived", name="payment_status"),
        nullable=False,
        server_default="unpaid",
    )
    delivery_status: Mapped[str] = mapped_column(
        Enum("not_sent", "sent", "bounced", name="delivery_status"),
        nullable=False,
        server_default="not_sent",
    )
    assigned_by_person_id: Mapped[int | None] = mapped_column(ForeignKey("person.id", ondelete="SET NULL"), nullable=True)
    assigned_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    delivered_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    checked_in_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    event = relationship("Event")
    ticket_type = relationship("TicketType")
    customer = relationship("Customer")

    __table_args__ = (
        UniqueConstraint("uuid", name="uq_ticket_uuid"),
        # unique per event when short_code is set; handled as partial index in migration
        Index("ix_ticket_event_id", "event_id"),
        Index("ix_ticket_customer_id", "customer_id"),
        Index("ix_ticket_ticket_type_id", "ticket_type_id"),
    )
