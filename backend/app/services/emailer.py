from __future__ import annotations

from typing import Iterable, Optional
from sqlalchemy.orm import Session
import os
import datetime as dt

from app.integrations.email.service import send_and_log
from app.integrations.email.registry import code_for
from app.integrations.email.renderer import render


def _pad(n: int) -> str:
    return str(n).zfill(2)


def _time_hm(d: dt.datetime) -> str:
    h = d.hour
    m = d.minute
    am = h < 12
    h12 = (h % 12) or 12
    return f"{h12}{(':' + _pad(m)) if m else ''}{'am' if am else 'pm'}"


def format_event_datetime(start: dt.datetime, end: Optional[dt.datetime]) -> str:
    s = start.astimezone(dt.timezone.utc)
    e = end.astimezone(dt.timezone.utc) if end else None
    s_str = f"{_pad(s.day)}/{_pad(s.month)}/{s.year} {_time_hm(s)}"
    if not e:
        return s_str
    e_str = f"{_pad(e.day)}/{_pad(e.month)}/{e.year} {_time_hm(e)}"
    return f"{s_str} — {e_str}"


def build_ticket_lines(items: Iterable[tuple[str, int, int]]) -> tuple[str, str, int]:
    """Return (lines, total_thb_str, count) from (name, qty, price) tuples."""
    total = 0
    count = 0
    lines: list[str] = []
    for name, qty, price in items:
        lines.append(f"{qty} x {name} — {price} THB each")
        total += qty * (price or 0)
        count += qty
    return "\n".join(lines), f"{total} THB", count


def send_reservation_confirmation_buyer(
    db: Session,
    *,
    to_email: str,
    buyer_name: Optional[str] = None,
    event_title: str,
    event_dt_str: str,
    ticket_lines: str,
    total_thb: str,
    expires_str: str,
    secure_link: Optional[str] = None,
    related: Optional[dict] = None,
) -> bool:
    template_code = code_for('reservation_confirmation_buyer')
    count = max(1, sum(int(part.split(' x ')[0]) for part in ticket_lines.split('\n') if ' x ' in part))
    subject, text, html = render(template_code, {
        'buyer_name': buyer_name or '',
        'event_title': event_title,
        'event_datetime': event_dt_str,
        'ticket_count': count,
        'ticket_lines': ticket_lines,
        'total_thb': total_thb,
        'reservation_expires_at': expires_str,
        'secure_payment_link': secure_link or '',
    })
    return send_and_log(
        to_email=to_email,
        subject=subject,
        text=text,
        html=html,
        template_name='confirm_ticket_reservation',
        context={'total_thb': total_thb, 'expires_at': expires_str},
        db=db,
        related=related or {},
    )


def send_reserved_assignment_holder(
    db: Session,
    *,
    to_email: str,
    buyer_name: str,
    event_title: str,
    event_dt_str: str,
    ticket_type_name: str,
    expires_str: str,
    ticket_number: Optional[str],
    view_link: Optional[str],
    lines: Optional[str] = None,
    total_thb: Optional[str] = None,
    related: Optional[dict] = None,
) -> bool:
    template_code = code_for('reserved_assignment_holder')
    subject, text, html = render(template_code, {
        'buyer_name': buyer_name,
        'event_title': event_title,
        'event_datetime': event_dt_str,
        'ticket_type_name': ticket_type_name,
        'reservation_expires_at': expires_str,
        'ticket_number': ticket_number or '',
        'view_ticket_link': view_link or '',
        'ticket_lines': lines or '',
        'total_thb': total_thb or '',
    })
    return send_and_log(
        to_email=to_email,
        subject=subject,
        text=text,
        html=html,
        template_name='reserved_assignment_holder',
        context={'expires_at': expires_str},
        db=db,
        related=related or {},
    )


def send_ticket_email_active(
    db: Session,
    *,
    to_email: str,
    event_title: str,
    event_when_iso: str,
    short_code: str,
    ticket_number: Optional[str],
    token: Optional[str] = None,
    related: Optional[dict] = None,
) -> bool:
    api_origin = os.getenv("PUBLIC_API_ORIGIN", os.getenv("API_BASE_URL", "http://localhost:8000"))
    app_origin = os.getenv("PUBLIC_APP_ORIGIN", "http://localhost:5173")
    qr_url = f"{api_origin}/qr?data={short_code}&scale=6&format=png"
    view_link = f"{app_origin}/ticket?token={token}" if token else f"{app_origin}/ticket?code={short_code}"
    template_code = code_for('ticket_email')
    subject, text, html = render(template_code, {
        'event_title': event_title,
        'event_when': event_when_iso,
        'code': short_code,
        'qr_url': qr_url,
        'view_link': view_link,
        'ticket_number': ticket_number or '',
    })
    return send_and_log(
        to_email=to_email,
        subject=subject,
        text=text,
        html=html,
        template_name='ticket_email',
        context={'code': short_code},
        db=db,
        related=related or {},
    )
