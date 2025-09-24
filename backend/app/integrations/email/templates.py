from __future__ import annotations

from typing import Optional, Tuple


def payment_email(event_title: str, event_when: str, pay_link: str) -> Tuple[str, str, str]:
    subject = f"Complete Your Payment for {event_title}"
    text_lines = [
        f"Event: {event_title}",
        f"When: {event_when}",
        "",
        "Your ticket is reserved. Please complete payment to receive your ticket.",
        f"Pay here: {pay_link}",
    ]
    text = "\n".join(text_lines)
    html_lines = [
        f"<p><strong>Event:</strong> {event_title}</p>",
        f"<p><strong>When:</strong> {event_when}</p>",
        "<p>Your ticket is reserved. Please complete payment to receive your ticket.</p>",
        f"<p><a href=\"{pay_link}\" style=\"background:#0b5fff;color:#fff;padding:8px 12px;border-radius:4px;text-decoration:none;\">Pay Now</a></p>",
        f"<p>Or open this link: <br/><a href=\"{pay_link}\">{pay_link}</a></p>",
    ]
    html = "\n".join(html_lines)
    return subject, text, html


def ticket_email(event_title: str, event_when: str, code: str, qr_url: Optional[str] = None) -> Tuple[str, str, str]:
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
        f"<p><strong>Your check-in code:</strong> <code>{code}</code></p>",
        "<p>Present this code (or QR) at check-in.</p>",
    ]
    if qr_url:
        html_lines.append(f"<p><img alt=\"Ticket QR\" src=\"{qr_url}\" style=\"width:180px;height:180px\"/></p>")
    html = "\n".join(html_lines)
    return subject, text, html

