# Public Event Site – Implementation Plan

This plan outlines concrete steps to deliver the public‑facing event site on the same instance, with the admin app behind auth. Use this as a task checklist.

## Backend – Public APIs
- [ ] Create `public` router without auth dependency.
- [ ] `GET /public/events` list: filter upcoming, include essential fields.
- [ ] `GET /public/events/{id}`: include `location_*`, `location_address`, `ticket_types` (active only).
- [ ] `POST /public/checkout`: body `{ event_id, ticket_type_id, email, first_name?, last_name?, phone? }` → assigns an unpaid ticket and returns `{ ticket_id, token }`.
- [ ] Do not send email on checkout; frontend redirects to `/#pay?token=...`.
- [ ] Ensure `GET /tickets/lookup?token` hides `short_code` until paid (already implemented).
- [ ] Ensure `POST /tickets/pay { token }` marks paid and sends ticket email (already implemented).
- [ ] Guardrails: capacity/type checks; return 409 when full; validate email.
- [ ] Add minimal rate limiting or logging hooks (optional, later).

## Email
- [ ] Reuse centralized templates (`payment_email`, `ticket_email`).
- [ ] Confirm from address and SendGrid settings in `.env`.
- [ ] Add optional template wrapper for branding (later).

## Frontend – Public UI
- [ ] Add a public entry (e.g., `PublicApp.tsx`) that renders only public pages.
- [ ] Public Event List page: fetch `/public/events`, render cards.
- [ ] Public Event Details page: fetch `/public/events/{id}`, show location, address, getting there, contacts, ticket types.
- [ ] Ticket selection + email input form with client validations.
- [ ] On submit, call `/public/checkout`, then redirect to `/#pay?token=...`.
- [ ] Payment page: reuse existing `PaymentPage.tsx` (token support in place).
- [ ] After successful payment, show success state; no further action needed (email is sent by backend).

## Admin App Separation
- [ ] Keep admin routes under auth; no changes to existing admin tabs.
- [ ] Expose public build or public routes alongside admin app (e.g., add a “Public” nav only in dev for testing).

## Data & States
- [ ] Confirm ticket assignment sets `payment_status=unpaid` and `status=assigned`.
- [ ] Confirm post‑payment sets `payment_status=paid`, sends ticket email, and updates `delivery_status`.
- [ ] Confirm reconciliation shows `paid_count`, `unpaid_count`, `revenue_baht` (done).

## Observability & Ops
- [ ] Log key events: checkout, pay success/failure, email send success/failure.
- [ ] Document environment variables: `PUBLIC_APP_ORIGIN`, `PUBLIC_API_ORIGIN`, SendGrid vars.
- [ ] Smoke tests: create sample event, types, run through checkout and payment.

## Stretch (Later)
- [ ] Quantity >1 per checkout and price totals.
- [ ] Payment provider integration (Stripe/Omise), webhooks, receipt emails.
- [ ] Token expiry and re‑issue flow.
- [ ] SEO: pre‑render/public metadata.

