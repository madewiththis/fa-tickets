from __future__ import annotations

from typing import Optional, Tuple


def _join_lines(lines):
    return "\n".join([l for l in lines if l is not None and l != ""])


def reservation_confirmation_buyer(
    *,
    event_title: str,
    event_datetime: str,
    ticket_count: int,
    ticket_lines: str,
    total_thb: str,
    reservation_expires_at: str,
    secure_payment_link: Optional[str] = None,
) -> Tuple[str, str, str]:
    subject = f"Reservation confirmed: {event_title}"
    text = _join_lines([
        f"You have reserved {ticket_count} tickets to {event_title}.",
        f"Your reservation will expire on {reservation_expires_at}.",
        "",
        "Event Details",
        event_title,
        event_datetime,
        "",
        "Tickets",
        ticket_lines,
        f"Total due: {total_thb}",
        "",
        (f"Secure your tickets: {secure_payment_link}" if secure_payment_link else None),
    ])
    _lines_html = (ticket_lines or "").replace("\n", "<br/>")
    html = _join_lines([
        f"<p>You have reserved {ticket_count} tickets to <strong>{event_title}</strong>.</p>",
        f"<p>Your reservation will expire on <strong>{reservation_expires_at}</strong>.</p>",
        f"<p><strong>Event Details</strong><br/>{event_title}<br/>{event_datetime}</p>",
        f"<p><strong>Tickets</strong><br/>{_lines_html}<br/><strong>Total due:</strong> {total_thb}</p>",
        (f"<p><a href=\"{secure_payment_link}\" style=\"background:#0b5fff;color:#fff;padding:8px 12px;border-radius:4px;text-decoration:none;\">Click here to secure your tickets</a></p>" if secure_payment_link else None),
    ])
    return subject, text, html


def ticket_email(event_title: str, event_when: str, code: str, qr_url: Optional[str] = None, view_link: Optional[str] = None, ticket_number: Optional[str] = None) -> Tuple[str, str, str]:
    subject = f"Your Ticket for {event_title}"
    text_lines = [
        f"Event: {event_title}",
        f"When: {event_when}",
        f"Your check-in code: {code}",
        "",
        "Present this code (or QR) at check-in.",
    ]
    if qr_url:
        text_lines.extend(["", f"QR: {qr_url}"])
    text = "\n".join(text_lines)
    html_lines = [
        f"<p><strong>Event:</strong> {event_title}</p>",
        f"<p><strong>When:</strong> {event_when}</p>",
        (f"<p><strong>Ticket Number:</strong> {ticket_number}</p>" if ticket_number else ""),
        f"<p><strong>Your check-in code:</strong> <code>{code}</code></p>",
        "<p>Present this code (or QR) at check-in.</p>",
    ]
    # Remove empty strings if ticket_number was not provided
    html_lines = [h for h in html_lines if h]
    if qr_url:
        html_lines.append(f"<p><img alt=\"Ticket QR\" src=\"{qr_url}\" style=\"width:180px;height:180px\"/></p>")
    if view_link:
        html_lines.append(f"<p><a href=\"{view_link}\" style=\"color:#0b5fff;\">View in browser</a></p>")
    html = "\n".join(html_lines)
    return subject, text, html


def unassign_email(event_title: str, event_when: str, reason: Optional[str] = None) -> Tuple[str, str, str]:
    subject = f"Your ticket has been unassigned for {event_title}"
    text_lines = [
        f"Event: {event_title}",
        f"When: {event_when}",
        "",
        "This ticket has been unassigned and its number released.",
    ]
    if reason:
        text_lines.extend(["", f"Reason: {reason}"])
    text = "\n".join(text_lines)
    html_lines = [
        f"<p><strong>Event:</strong> {event_title}</p>",
        f"<p><strong>When:</strong> {event_when}</p>",
        "<p>This ticket has been unassigned and its number released.</p>",
    ]
    if reason:
        html_lines.append(f"<p><strong>Reason:</strong> {reason}</p>")
    html = "\n".join(html_lines)
    return subject, text, html


def refund_initiated_email(event_title: str, event_when: str, reason: Optional[str] = None, is_comp: bool = False) -> Tuple[str, str, str]:
    subject = f"{('Void' if is_comp else 'Refund')} initiated for {event_title}"
    action = "void" if is_comp else "refund"
    text_lines = [
        f"Event: {event_title}",
        f"When: {event_when}",
        "",
        f"We have initiated a {action} for your ticket.",
    ]
    if reason:
        text_lines.append(f"Reason: {reason}")
    text = "\n".join(text_lines)
    html_lines = [
        f"<p><strong>Event:</strong> {event_title}</p>",
        f"<p><strong>When:</strong> {event_when}</p>",
        f"<p>We have initiated a {action} for your ticket.</p>",
    ]
    if reason:
        html_lines.append(f"<p><strong>Reason:</strong> {reason}</p>")
    html = "\n".join(html_lines)
    return subject, text, html


def confirm_ticket_reservation(
    event_title: str,
    event_datetime: str,
    ticket_count: int,
    ticket_lines: str,
    total_thb: str,
    reservation_expires_at: str,
    secure_payment_link: Optional[str] = None,
) -> Tuple[str, str, str]:
    return reservation_confirmation_buyer(
        event_title=event_title,
        event_datetime=event_datetime,
        ticket_count=ticket_count,
        ticket_lines=ticket_lines,
        total_thb=total_thb,
        reservation_expires_at=reservation_expires_at,
        secure_payment_link=secure_payment_link,
    )


def reserved_assignment_holder(
    *,
    buyer_name: str,
    event_title: str,
    event_datetime: str,
    ticket_type_name: str,
    reservation_expires_at: str,
    ticket_number: Optional[str] = None,
    view_ticket_link: Optional[str] = None,
    ticket_lines: Optional[str] = None,
    total_thb: Optional[str] = None,
) -> Tuple[str, str, str]:
    subject = f"Ticket reserved for you: {event_title}"
    text = _join_lines([
        f"{buyer_name} has reserved a {ticket_type_name} ticket for you to {event_title}.",
        f"Your reservation will expire on {reservation_expires_at} unless payment is completed.",
        "",
        "Event Details",
        event_title,
        event_datetime,
        "",
        ("Tickets\n" + ticket_lines if ticket_lines else None),
        (f"Total due: {total_thb}" if total_thb else None),
        "",
        "Ticket Details",
        (f"Ticket Number: {ticket_number}" if ticket_number else "Ticket Number: —"),
        (f"View your ticket: {view_ticket_link}" if view_ticket_link else None),
    ])
    _lines_html2 = (ticket_lines or "").replace("\n", "<br/>") if ticket_lines else None
    _view_link_html = f'<a href="{view_ticket_link}">Click here to see your ticket</a>' if view_ticket_link else ''
    html = _join_lines([
        f"<p><strong>{buyer_name}</strong> has reserved a <strong>{ticket_type_name}</strong> ticket for you to <strong>{event_title}</strong>.</p>",
        f"<p>Your reservation will expire on <strong>{reservation_expires_at}</strong> unless payment is completed.</p>",
        f"<p><strong>Event Details</strong><br/>{event_title}<br/>{event_datetime}</p>",
        (f"<p><strong>Tickets</strong><br/>{_lines_html2}<br/><strong>Total due:</strong> {total_thb}</p>" if _lines_html2 and total_thb else ""),
        f"<p><strong>Ticket Details</strong><br/>Ticket Number: {ticket_number or '—'}<br/>{_view_link_html}</p>",
    ])
    return subject, text, html
