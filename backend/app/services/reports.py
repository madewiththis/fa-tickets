from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.models.event import Event
from app.db.models.ticket import Ticket
from app.db.models.ticket_type import TicketType


def reconciliation_summary(db: Session, *, event_id: int) -> dict:
    ev = db.get(Event, event_id)
    if not ev:
        raise ValueError("Event not found")

    q = db.query(Ticket.status, func.count(Ticket.id)).filter(Ticket.event_id == event_id).group_by(Ticket.status)
    counts_by_status = {row[0]: int(row[1]) for row in q}

    total_tickets = sum(counts_by_status.values())
    assigned = counts_by_status.get("assigned", 0)
    checked_in = counts_by_status.get("checked_in", 0)
    available = counts_by_status.get("available", 0)
    # Delivered (emails sent) is tracked via delivery_status
    delivered_sent = (
        db.query(func.count(Ticket.id))
        .filter(Ticket.event_id == event_id, Ticket.delivery_status == "sent")
        .scalar()
    ) or 0
    # Registered = non-available tickets (assigned + checked_in)
    registered = assigned + checked_in

    # Revenue: sum price_baht for tickets that are marked as paid
    revenue_baht = 0
    try:
        revenue_baht = (
            db.query(func.coalesce(func.sum(TicketType.price_baht), 0))
            .join(TicketType, TicketType.id == Ticket.ticket_type_id)
            .filter(Ticket.event_id == event_id, Ticket.payment_status == "paid")
            .scalar()
        )
    except Exception:
        # In case the table or column is missing on an un-migrated DB, fall back gracefully
        revenue_baht = 0

    # Payment counts
    q_pay = (
        db.query(Ticket.payment_status, func.count(Ticket.id))
        .filter(Ticket.event_id == event_id)
        .group_by(Ticket.payment_status)
        .all()
    )
    counts_by_payment = {row[0]: int(row[1]) for row in q_pay}
    paid_count = counts_by_payment.get("paid", 0)
    unpaid_count = counts_by_payment.get("unpaid", 0)
    waived_count = counts_by_payment.get("waived", 0)

    return {
        "event": {"id": ev.id, "title": ev.title, "capacity": ev.capacity, "starts_at": ev.starts_at, "ends_at": ev.ends_at},
        "tickets_total": total_tickets,
        "available": available,
        "assigned": assigned,
        "delivered": int(delivered_sent),
        "checked_in": checked_in,
        "void": counts_by_status.get("void", 0),
        "registered": registered,
        "revenue_baht": int(revenue_baht or 0),
        "paid_count": paid_count,
        "unpaid_count": unpaid_count,
        "waived_count": waived_count,
    }


def reconciliation_csv(summary: dict) -> str:
    lines = [
        "metric,value",
        f"event_id,{summary['event']['id']}",
        f"event_title,{summary['event']['title']}",
        f"capacity,{summary['event']['capacity']}",
        f"tickets_total,{summary['tickets_total']}",
        f"available,{summary['available']}",
        f"assigned,{summary['assigned']}",
        f"delivered,{summary['delivered']}",
        f"checked_in,{summary['checked_in']}",
        f"void,{summary['void']}",
    ]
    return "\n".join(lines) + "\n"
