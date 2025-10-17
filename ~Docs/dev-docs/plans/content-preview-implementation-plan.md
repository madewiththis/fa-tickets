# Content Preview (Internal Admin) – Implementation Plan

Goal: Add an internal "Content Management" section that previews public-facing content without building a separate public site. It lists events, shows each event’s ticket types and a per-type purchase link. A mock purchase page collects basic contact details and then routes to payment, after which the user receives the ticket email.

## Scope
- Internal-only pages and routes (no auth changes required beyond existing admin auth).
- Reuse current token-based payment flow (/#pay?token=...).
- No DB schema changes.

## Backend
- [x] Add `POST /content/checkout` endpoint
  - Request: `{ event_id, ticket_type_id, customer: { email, first_name?, last_name?, phone? } }`
  - Behavior: assign an available ticket for the event and ticket_type with `payment_status='unpaid'`; return `{ ticket_id, token }` where token = `ticket.uuid`.
  - Email: For MVP, suppress sending the payment email (frontend will send the user straight to the payment page). Keep a query/body flag (e.g. `send_email=false`) to control this.
  - Validation: Event exists, ticket type belongs to event, capacity and type max checks.
- [x] Keep existing payment flow as-is:
  - `GET /tickets/lookup?token=...` hides code until paid.
  - `POST /tickets/pay` with `{ token }` marks paid and sends ticket email + QR.

## Frontend
- [x] Navigation: add a new main tab `Content Management`.
- [x] Page: `ContentPage`
  - [x] Fetch events (reuse admin list API) and render a simple list/table.
  - [x] For each event, fetch and render `ticket_types` below it (name, price, active flag).
  - [x] Show a purchase link per ticket type: `/#purchase?event_id=:id&ticket_type_id=:ttid`.
  - [x] Add a “Copy link” button for convenience.
- [x] Page: `PurchasePage`
  - [x] Read `event_id` and `ticket_type_id` from the URL (hash query).
  - [x] Fetch event + ticket_type details and display a simple summary (title, date(s), price).
  - [x] Collect basic contact details: email (required), first name, last name, phone.
  - [x] On submit, call `POST /content/checkout` with `send_email=false`.
  - [x] Redirect to `/#pay?token=...` using the returned token.
  - [ ] Optional: show a “Proceed to payment” button with link for copy/paste.
- [x] Reuse existing `PaymentPage` for completing payment.

## API Client
- [x] Add `contentCheckout(body)` method to `frontend/src/lib/api/client.ts` → POST `/content/checkout`.
- [x] Add `loadEvent(id)` and `listTicketTypes(event_id)` reuse existing client methods.

## UX/Copy
- [ ] ContentPage: concise layout (event card with nested ticket types + links).
- [ ] PurchasePage: simple form with validations (email) and brief event/ticket summary.
- [ ] After payment, rely on existing ticket email and QR.

## Observability
- [ ] Log `/content/checkout` invocations and outcomes (success/failure).
- [ ] Confirm SendGrid emails fire on payment.

## Testing
- [ ] Happy path: Create event + ticket type → purchase link → purchase form → checkout → payment → ticket email received.
- [ ] Capacity/type max errors are shown.
- [ ] Invalid IDs or missing params show friendly errors.

## Rollout
- [ ] Behind existing admin auth; deploy with admin app.
- [ ] Share purchase links with internal stakeholders for previewing flows.

