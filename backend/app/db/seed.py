from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from app.db.session import SessionLocal, engine
from app.db.models.event import Event
from app.db.models.ticket import Ticket


def seed() -> None:
    with SessionLocal() as db:  # type: Session
        # Only seed if no events exist
        if db.query(Event).count() > 0:
            return
        now = datetime.now(timezone.utc)
        ev = Event(
            title="Sample FA Seminar",
            starts_at=now + timedelta(days=7),
            ends_at=now + timedelta(days=7, hours=2),
            location="Main Hall",
            capacity=50,
        )
        db.add(ev)
        db.flush()

        # Seed available tickets (no short_code yet)
        tickets = [Ticket(event_id=ev.id) for _ in range(ev.capacity)]
        db.add_all(tickets)
        db.commit()


if __name__ == "__main__":
    seed()

