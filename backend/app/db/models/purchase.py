from sqlalchemy import Integer, String, DateTime, func, ForeignKey
import uuid as uuidlib
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class Purchase(Base):
    __tablename__ = "purchase"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    uuid: Mapped[str | None] = mapped_column(String(36), nullable=True, default=lambda: str(uuidlib.uuid4()))
    buyer_contact_id: Mapped[int] = mapped_column(ForeignKey("contact.id", ondelete="CASCADE"), nullable=False)
    external_payment_ref: Mapped[str | None] = mapped_column(String(100), nullable=True)
    total_amount: Mapped[int | None] = mapped_column(Integer, nullable=True)
    currency: Mapped[str | None] = mapped_column(String(10), nullable=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    buyer_contact = relationship("Contact")
