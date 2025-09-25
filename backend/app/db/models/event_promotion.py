from sqlalchemy import Integer, ForeignKey, DateTime, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class EventPromotion(Base):
  __tablename__ = 'event_promotion'

  id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
  event_id: Mapped[int] = mapped_column(Integer, ForeignKey('event.id', ondelete='CASCADE'), unique=True, index=True, nullable=False)
  content: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
  created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
  updated_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

