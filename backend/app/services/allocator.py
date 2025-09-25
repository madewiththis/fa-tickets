from typing import Set
from sqlalchemy.orm import Session
from sqlalchemy import select, text
from app.db.models.ticket import Ticket


def _existing_numbers(db: Session, event_id: int) -> Set[int]:
    rows = db.execute(
        select(Ticket.ticket_number).where(Ticket.event_id == event_id, Ticket.ticket_number.isnot(None))
    ).scalars().all()
    nums: set[int] = set()
    for r in rows:
        try:
            n = int(str(r).strip())
            if n > 0:
                nums.add(n)
        except Exception:
            # ignore non-integer values
            continue
    return nums


def allocate_next_ticket_number(db: Session, *, event_id: int) -> str:
    # Use a per-event advisory lock to avoid race conditions
    try:
        db.execute(text("SELECT pg_advisory_xact_lock(:key)"), {"key": int(event_id)})
    except Exception:
        # If advisory lock not available, proceed best-effort
        pass

    used = _existing_numbers(db, event_id)
    # Find the smallest missing positive integer
    n = 1
    while n in used:
        n += 1
    return str(n)

