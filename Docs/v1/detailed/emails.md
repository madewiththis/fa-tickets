# Email Templates & Triggers — Detailed

This document catalogs all outbound emails, their internal template names, where their code lives, and what triggers them in the system. It is intended for engineering, QA, and operations to align on behavior and delivery paths.

## Conventions
- Templates: implemented in `backend/app/integrations/email/templates.py`.
- Send helpers: `backend/app/integrations/email/service.py` (chooses transport and dispatches).
- Transports: `EMAIL_TRANSPORT` env may be `sendgrid`, `smtp`, or defaults to `console`. Related env vars:
  - SendGrid: `SENDGRID_API_KEY`, `EMAIL_FROM`
  - SMTP: `SMTP_HOST`, `SMTP_PORT` (465 or 587), `SMTP_USER`, `SMTP_PASSWORD`, `EMAIL_FROM`
  - Public origins for links/QRs: `PUBLIC_APP_ORIGIN`, `PUBLIC_API_ORIGIN` (fallback to `API_BASE_URL`)

## Templates

### payment_email
- Location: `templates.payment_email(event_title, event_when, pay_link, qr_url?)`
- Sender: `service.send_payment_email(...)`
- Purpose: Notify buyer that a ticket is reserved and payment is required; includes payment link and QR to pay.
- Trigger points:
  - Assignment when `payment_status == 'unpaid'`: `backend/app/services/tickets.py` in `assign_ticket()`
  - Reassigning an unpaid ticket to a new holder: `services/tickets.py` in `reassign_ticket()`
  - Manual resend payment: `backend/app/api/routes/tickets.py` endpoint `POST /tickets/resend_payment`
  - Utility test: `backend/app/api/routes/utils.py` `POST /test_email` (via `send_code_email` wrapper when a pay link is present)
- Links/Assets: Payment link to `PUBLIC_APP_ORIGIN/pay?token=...`; QR generated via `PUBLIC_API_ORIGIN/qr?data=...&format=png`.

### ticket_email
- Location: `templates.ticket_email(event_title, event_when, code, qr_url?, view_link?, ticket_number?)`
- Sender: `service.send_ticket_email(...)`
- Purpose: Deliver the actual ticket (3‑digit code + optional QR and view link). Used after payment or waived status.
- Trigger points:
  - Assignment when `payment_status in ('paid','waived')`: `services/tickets.py` in `assign_ticket()`
  - After successful payment: `backend/app/api/routes/tickets.py` endpoint `POST /tickets/pay`
  - Reassigning a paid/waived ticket: `services/tickets.py` in `reassign_ticket()`
  - Manual resend ticket: `backend/app/api/routes/tickets.py` endpoint `POST /tickets/resend_ticket`
  - Utility test (no pay link): `backend/app/api/routes/utils.py` `POST /test_email` via `send_code_email`
- Links/Assets: QR for short code; optional “View in browser” link to `PUBLIC_APP_ORIGIN/ticket?code=...`.

### confirm_ticket_reservation
- Location: `templates.confirm_ticket_reservation(event_title, event_when, hold_hours?)`
- Sender: `service.send_reservation_confirm_email(...)`
- Purpose: Confirm that tickets have been reserved for a time window (e.g., 24 hours) when buyer chooses Pay later.
- Trigger points:
  - Reservation confirmation: `backend/app/api/routes/content.py` endpoint `POST /content/reserve_confirm`
    - Called by multi‑purchase Step 2 when user clicks “Reserve and continue”.

### unassign_email
- Location: `templates.unassign_email(event_title, event_when, reason?)`
- Sender: `service.send_unassign_email(...)`
- Purpose: Notify a prior holder that their ticket was unassigned.
- Trigger points:
  - Unassign action: `services/tickets.py` in `unassign_ticket()`

### refund_initiated_email
- Location: `templates.refund_initiated_email(event_title, event_when, reason?, is_comp=False)`
- Sender: `service.send_refund_initiated_email(...)`
- Purpose: Inform buyer that a refund (or void for comp) has been initiated.
- Trigger points:
  - Refund action: `services/tickets.py` in `refund_ticket()`

## Helper Wrapper

### send_code_email (wrapper)
- Location: `service.send_code_email(to_email, event_title, event_when, code, payment_link?)`
- Behavior: If `payment_link` is present, sends `payment_email`; otherwise sends `ticket_email`.
- Used by: `backend/app/api/routes/utils.py /test_email` for manual verification.

## Operational Notes
- All senders return a boolean; on transport errors the system falls back to console logs to avoid hard failures in non‑critical paths.
- Some business actions (assign, pay, reassign) wrap send calls in try/except to avoid breaking core flows if email fails.
- QR generation endpoint: `GET /qr?data=...&scale=..&format=svg|png` (module: `backend/app/api/routes/utils.py`).
- When building links in emails, the system prefers `PUBLIC_APP_ORIGIN` and `PUBLIC_API_ORIGIN` to create user‑accessible URLs.

### Logging
- Table: `email_log` (model `backend/app/db/models/email_log.py`, migration `20250925_0003_add_email_log.py`).
- Columns: `to_email`, `subject`, `text_body`, `html_body`, `template_name`, `context (JSONB)`, `status (sent|failed)`, `error_message`, `event_id?`, `ticket_id?`, `purchase_id?`, `created_at`.
- Automatically written by `send_and_log(...)` in `backend/app/integrations/email/service.py` used by all email send paths listed above.

## Quick Reference (Triggers → Template)
- Assign unpaid → payment_email
- Assign paid/waived → ticket_email
- Pay ticket → ticket_email
- Reassign unpaid → payment_email
- Reassign paid/waived → ticket_email
- Reserve (Pay later) confirmed → confirm_ticket_reservation
- Unassign → unassign_email
- Refund initiated → refund_initiated_email
- Resend payment → payment_email
- Resend ticket → ticket_email
