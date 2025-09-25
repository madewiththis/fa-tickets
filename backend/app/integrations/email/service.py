import os
from typing import Optional, Any
import smtplib
import ssl
from email.message import EmailMessage
import json
from urllib import request, error
from app.integrations.email import templates


def _transport() -> str:
    # Choose transport:
    # - If EMAIL_TRANSPORT is set, honor it
    # - Otherwise, prefer sendgrid when SENDGRID_API_KEY is present; fall back to console
    env_transport = (os.getenv("EMAIL_TRANSPORT", "") or "").strip().lower()
    if env_transport:
        transport = env_transport
    else:
        transport = "sendgrid" if os.getenv("SENDGRID_API_KEY") else "console"
    return transport


def _send_email(to_email: str, subject: str, text: str, html: Optional[str] = None) -> bool:
    transport = _transport()

    def _console_fallback() -> bool:
        print("=== EMAIL (console transport) ===")
        print(f"To: {to_email}\nSubject: {subject}\n\n{text}")
        if html:
            print("--- HTML body present (not rendered in console) ---")
        print("=== END EMAIL ===")
        return True

    if transport == "console":
        return _console_fallback()

    if transport == "sendgrid":
        api_key = os.getenv("SENDGRID_API_KEY", "").strip()
        from_addr = os.getenv("EMAIL_FROM", "no-reply@example.com").strip()

        if not api_key:
            print("[email] SENDGRID_API_KEY not set; falling back to console.")
            return _console_fallback()

        payload = {
            "personalizations": [
                {"to": [{"email": to_email}], "subject": subject}
            ],
            "from": {"email": from_addr},
            "content": ([{"type": "text/plain", "value": text}] + ([{"type": "text/html", "value": html}] if html else [])),
        }

        data = json.dumps(payload).encode("utf-8")
        req = request.Request(
            "https://api.sendgrid.com/v3/mail/send",
            data=data,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            method="POST",
        )

        try:
            with request.urlopen(req, timeout=15) as resp:
                # SendGrid returns 202 Accepted on success
                if 200 <= resp.status < 300:
                    return True
                else:
                    print(f"[email] SendGrid non-success status: {resp.status}; falling back to console.")
                    return _console_fallback()
        except error.HTTPError as e:
            try:
                err_body = e.read().decode("utf-8")
            except Exception:
                err_body = "<no body>"
            print(f"[email] SendGrid HTTPError {e.code}: {err_body}; falling back to console.")
            return _console_fallback()
        except Exception as exc:
            print(f"[email] SendGrid send failed: {exc}; falling back to console.")
            return _console_fallback()

    if transport == "smtp":
        host = os.getenv("SMTP_HOST", "").strip()
        port = int(os.getenv("SMTP_PORT", "587") or 587)
        user = os.getenv("SMTP_USER", "").strip()
        password = os.getenv("SMTP_PASSWORD", "").strip()
        from_addr = os.getenv("EMAIL_FROM", "no-reply@example.com")

        if not host:
            print("[email] SMTP_HOST not set; falling back to console.")
            return _console_fallback()

        # Build message
        msg = EmailMessage()
        msg["From"] = from_addr
        msg["To"] = to_email
        msg["Subject"] = subject
        msg.set_content(text)

        # Try HTML alternative for nicer rendering
        if html:
            try:
                msg.add_alternative(html, subtype="html")
            except Exception:
                pass

        try:
            if port == 465:
                context = ssl.create_default_context()
                with smtplib.SMTP_SSL(host, port, context=context) as server:
                    if user and password:
                        server.login(user, password)
                    server.send_message(msg)
            else:
                with smtplib.SMTP(host, port, timeout=15) as server:
                    server.ehlo()
                    try:
                        server.starttls(context=ssl.create_default_context())
                        server.ehlo()
                    except Exception:
                        # Server may not support STARTTLS; continue best-effort
                        pass
                    if user and password:
                        server.login(user, password)
                    server.send_message(msg)
            return True
        except Exception as exc:
            print(f"[email] SMTP send failed: {exc}; falling back to console.")
            return _console_fallback()

    # Fallback when EMAIL_TRANSPORT is unrecognized
    print("EMAIL_TRANSPORT set to unsupported value; defaulting to console")
    return _console_fallback()


def send_and_log(
    *,
    to_email: str,
    subject: str,
    text: str,
    html: Optional[str],
    template_name: str,
    context: Optional[dict[str, Any]] = None,
    db: Any = None,
    related: Optional[dict[str, Any]] = None,
) -> bool:
    ok = _send_email(to_email, subject, text, html)
    try:
        if db is not None:
            # Lazy import to avoid circular deps
            from app.db.models.email_log import EmailLog
            status = 'sent' if ok else 'failed'
            ev_id = (related or {}).get('event_id')
            ticket_id = (related or {}).get('ticket_id')
            purchase_id = (related or {}).get('purchase_id')
            row = EmailLog(
                to_email=to_email,
                subject=subject,
                text_body=text,
                html_body=html,
                template_name=template_name,
                context=context or {},
                status=status,
                error_message=None,
                event_id=ev_id,
                ticket_id=ticket_id,
                purchase_id=purchase_id,
            )
            db.add(row)
            db.commit()
    except Exception as e:
        print(f"[email] log failed: {e}")
    return ok


def send_payment_email(to_email: str, event_title: str, event_when: str, payment_link: str, qr_url: Optional[str] = None) -> bool:
    subject, text, html = templates.payment_email(event_title, event_when, payment_link, qr_url)
    return _send_email(to_email, subject, text, html)


def send_ticket_email(to_email: str, event_title: str, event_when: str, code: str, qr_url: Optional[str] = None, view_link: Optional[str] = None, ticket_number: Optional[str] = None) -> bool:
    subject, text, html = templates.ticket_email(event_title, event_when, code, qr_url, view_link, ticket_number)
    return _send_email(to_email, subject, text, html)


def send_unassign_email(to_email: str, event_title: str, event_when: str, reason: Optional[str] = None) -> bool:
    subject, text, html = templates.unassign_email(event_title, event_when, reason)
    return _send_email(to_email, subject, text, html)


def send_refund_initiated_email(to_email: str, event_title: str, event_when: str, reason: Optional[str] = None, is_comp: bool = False) -> bool:
    subject, text, html = templates.refund_initiated_email(event_title, event_when, reason, is_comp)
    return _send_email(to_email, subject, text, html)


def send_reservation_confirm_email(to_email: str, event_title: str, event_when: str, hold_hours: int | None = None) -> bool:
    subject, text, html = templates.confirm_ticket_reservation(event_title, event_when, hold_hours)
    return _send_email(to_email, subject, text, html)


# Backward compatibility (older callers)
def send_code_email(
    to_email: str,
    event_title: str,
    event_when: str,
    code: str,
    payment_link: Optional[str] = None,
) -> bool:
    if payment_link:
        # Bias toward payment emails if a link is present
        return send_payment_email(to_email, event_title, event_when, payment_link)
    # Otherwise, send ticket email with code only
    return send_ticket_email(to_email, event_title, event_when, code)
