# Public Event Site – Planning Document

## Goals
- Public, unauthenticated event website that:
  - Lists upcoming events with essential details.
  - Shows an event details page (location, dates, description/getting there, contact, map link).
  - Lets users choose a ticket type (and quantity if applicable; MVP = 1 each) and enter their email.
  - Presents a payment link/flow and, upon “payment”, sends the ticket email with QR and 3‑digit code.
- Reuse the same backend instance, but expose a public API surface separate from the admin API (which stays behind auth).

## Non‑Goals (MVP)
- Real payment gateway integration (use mock payment flow already present).
- Complex ticket inventory across multiple quantities in a single checkout (single ticket per transaction is fine).
- Full content management for event descriptions (use existing fields: location, getting_there, contacts, maps link, address JSON).

## High‑Level Architecture
- Frontend: Public pages (SPA with Vite/React) routed under `/public` (or separate build) with no admin tabs.
- Backend: Public API routes (no `require_auth`) under `/public/*` for read/checkout.
- Email: SendGrid API via existing email service; templates centralized in `integrations/email/templates.py`.
- Data model: Reuse existing `Event`, `TicketType`, `Ticket`, and `Customer`.
- Tokens: Use `Ticket.uuid` as the payment token (already implemented) or a short‑lived payment token if we later want to decouple.

## Public API Surface (MVP)
- `GET /public/events?limit=&offset=` → list upcoming events (id, title, starts_at, ends_at, location_name, city/addr summary, ticket type summary).
- `GET /public/events/{id}` → event details (all public fields, `location_address`, `address_maps_link`, `getting_there`, `contact_*`, `ticket_types`).
- `POST /public/checkout` with body `{ event_id, ticket_type_id, email, first_name?, last_name?, phone? }` →
  - Creates or assigns an unpaid ticket; returns `{ ticket_id, token }`.
  - Optionally sends payment email, but for public UX we will redirect the user directly to `/#pay?token=...`.
- `GET /tickets/lookup?token=...` (already implemented) → hide code if unpaid.
- `POST /tickets/pay { token }` (already implemented) → marks ticket as paid, sends ticket email + QR.

Notes:
- Admin endpoints remain under auth (unchanged); public endpoints are read‑only except `checkout` and `pay`.
- Rate limiting and minimal anti‑abuse safeguards (basic request throttling) may be added later.

## Frontend Pages (Public)
- Event List page:
  - Cards with event title, date(s), location name, short blurb, “View details”.
  - Optional basic search/filter (MVP: none).
- Event Details page:
  - Title, date(s), location block with structured Thai address rendering and Google Maps link.
  - Getting there (textarea content), contacts (phone/email/url as links).
  - Ticket selector: list active `TicketType`s (name + price), email input, “Continue to payment”.
  - After submit, redirect to `/#pay?token=...`.
- Payment page: reuse existing `PaymentPage.tsx` (token‑based), ensure it’s reachable from public site nav.

## Email Templates
- Payment email: already centralized; uses `/#pay?token=...`.
- Ticket email: already centralized; includes QR and 3‑digit code.
- Branding/layout: optional wrapper; consolidate headings and copy in templates for consistent tone.

## Security & Auth
- Admin app remains behind `require_auth` and `X-Auth-Token` (or future auth layer).
- Public routes (`/public/*`, `/qr`, `/tickets/lookup`, `/tickets/pay`) remain open but limited to necessary data.
- Hide sensitive fields in public responses (e.g., hide `short_code` until paid via token path).

## Data and Inventory
- Checkout path assigns one unpaid ticket (or reserves from available pool) for the specified type.
- Capacity enforcement continues to use current rules (available → assigned).
- If out of capacity/type max, show an error.

## SEO & Performance (Later)
- Meta tags for event pages; SSR or pre‑render possible later.
- Caching on list endpoints.

## Observability
- Log public API calls and email outcomes (success/failure).
- Track funnel drop‑offs (list → details → checkout → payment → paid) later.

## Risks & Mitigations
- Token reuse and leakage: tokens are UUIDs; consider expiring unpaid tokens after N hours.
- Double booking: ensure idempotent checkout and guard against rapid repeat submissions.
- Inventory drift: rely on DB constraints and checks (current code does this) and surface polite errors.

