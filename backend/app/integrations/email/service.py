import os
from typing import Optional
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

    if transport == "console":
        print("=== EMAIL (console transport) ===")
        print(f"To: {to_email}\nSubject: {subject}\n\n{text}")
        print("=== END EMAIL ===")
        return True

    if transport == "sendgrid":
        api_key = os.getenv("SENDGRID_API_KEY", "").strip()
        from_addr = os.getenv("EMAIL_FROM", "no-reply@example.com").strip()

        if not api_key:
            print("[email] SENDGRID_API_KEY not set; cannot send. Falling back to console dump.")
            print(f"To: {to_email}\nSubject: {subject}\n\n{body}")
            return False

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
                    print(f"[email] SendGrid non-success status: {resp.status}")
                    return False
        except error.HTTPError as e:
            try:
                err_body = e.read().decode("utf-8")
            except Exception:
                err_body = "<no body>"
            print(f"[email] SendGrid HTTPError {e.code}: {err_body}")
            return False
        except Exception as exc:
            print(f"[email] SendGrid send failed: {exc}")
            return False

    if transport == "smtp":
        host = os.getenv("SMTP_HOST", "").strip()
        port = int(os.getenv("SMTP_PORT", "587") or 587)
        user = os.getenv("SMTP_USER", "").strip()
        password = os.getenv("SMTP_PASSWORD", "").strip()
        from_addr = os.getenv("EMAIL_FROM", "no-reply@example.com")

        if not host:
            print("[email] SMTP_HOST not set; cannot send. Falling back to console dump.")
            print(f"To: {to_email}\nSubject: {subject}\n\n{text}")
            return False

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
            print(f"[email] SMTP send failed: {exc}")
            return False

    # Fallback when EMAIL_TRANSPORT is unrecognized
    print("EMAIL_TRANSPORT set to unsupported value; defaulting to console")
    print(f"To: {to_email}\nSubject: {subject}\n\n{text}")
    return False


def send_payment_email(to_email: str, event_title: str, event_when: str, payment_link: str) -> bool:
    subject, text, html = templates.payment_email(event_title, event_when, payment_link)
    return _send_email(to_email, subject, text, html)


def send_ticket_email(to_email: str, event_title: str, event_when: str, code: str, qr_url: Optional[str] = None) -> bool:
    subject, text, html = templates.ticket_email(event_title, event_when, code, qr_url)
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
