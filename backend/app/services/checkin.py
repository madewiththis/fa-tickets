from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.db.models.ticket import Ticket


def check_in_by_code(db: Session, *, event_id: int, code: str) -> Ticket:
    t = db.execute(
        select(Ticket).where(Ticket.event_id == event_id, Ticket.short_code == code)
    ).scalar_one_or_none()
    if not t:
        raise ValueError("Invalid code for event")
    if t.status == "checked_in":
        raise RuntimeError("Already checked in")

    previous = t.status
    t.status = "checked_in"
    t.checked_in_at = datetime.now(timezone.utc)
    db.add(t)
    db.commit()
    db.refresh(t)
    t.previous_status = previous  # attach transient for response composition
    return t

