import random
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.db.models.ticket import Ticket


def generate_short_code(db: Session, event_id: int, max_attempts: int = 20) -> str:
    """
    Generate a 3-digit code (000-999) unique per event.
    Tries random attempts first, then falls back to scanning.
    """
    for _ in range(max_attempts):
        code = f"{random.randint(0, 999):03d}"
        if _is_code_free(db, event_id, code):
            return code

    # Fallback: scan sequentially
    used = set(
        r[0] for r in db.execute(
            select(Ticket.short_code).where(Ticket.event_id == event_id, Ticket.short_code.isnot(None))
        ).all()
    )
    for i in range(1000):
        code = f"{i:03d}"
        if code not in used:
            return code

    raise RuntimeError("No available short codes for event; increase capacity or use 4 digits")


def _is_code_free(db: Session, event_id: int, code: str) -> bool:
    exists = db.execute(
        select(Ticket.id).where(Ticket.event_id == event_id, Ticket.short_code == code)
    ).first()
    return exists is None

