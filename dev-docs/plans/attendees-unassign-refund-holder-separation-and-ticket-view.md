# Attendees Unassign/Refund, Holder Separation, and Ticket View Enhancements

## Problems

- Attendee actions unclear and incomplete:
  - When a ticket is Assigned and NOT Paid, action should be Unassign.
  - When a ticket is Assigned and Paid, action should be Refund.
  - When a ticket is Checked In, no actions should be available.
- Unassign and Refund semantics not implemented end-to-end:
  - Unassign should release the ticket number back to the pool and notify the user.
  - Refund should be possible even after check-in when the attendee is dissatisfied; notify the user(s), release the ticket number, and set payment status to "refunding" while preserving the record for tracking.
- Ticket model couples “ticket number” to the record, preventing number reuse during refunding workflows.
- System does not support multiple tickets per buyer email properly; need a unified contacts model that distinguishes roles for buyer and/or ticket holder so we can track purchases vs attendance across events.
- Public ticket view page (`/ticket?code=...`) lacks essential fields (ticket number/QR, event info, ticket type, payment status, and assignee contact).

## Solutions

- Define action rules in Attendees grid based on Ticket and Payment status:
  - Assigned + NOT Paid: show Unassign.
  - Any Ticket Status + Paid or Waived: show Refund (allowed even if Checked In).
  - Checked In + NOT Paid: show Unassign if truly unpaid; otherwise show Refund for waived/paid.
- Implement Unassign flow:
  - Clear `ticket_number` on the ticket (release number back to pool) and mark as unassigned.
  - Keep booking/code intact; do not modify payment status.
  - Send notification email to the current ticket holder indicating the ticket has been unassigned.
  - Log audit entry.
- Implement Refund (initiation) flow:
  - Allow for Paid (monetary) or Waived (complimentary) tickets regardless of check-in.
  - Clear `ticket_number` (release) and set `payment_status = refunding` (or `voiding` for waived) with eventual terminal states `refunded`/`voided`.
  - Send email to buyer and holder indicating unassignment and refund/void initiation and reason.
  - Keep the ticket record for tracking; retain check-in history if any and mark as `attendance_refunded=true` when applicable.
  - Record a refund reference/id if supported by the payment gateway; log audit entry.
- Support number reuse safely:
  - Make `ticket_number` nullable and unique when present.
  - Use a number allocator that can return freed numbers to the available pool (with safeguards to avoid conflicts).
- Unified Contacts model for Buyer and Holder:
  - Introduce a `contacts` table that stores people once (email unique), with attributes: `first_name`, `last_name`, `email`, `phone`, and role flags or derived roles.
  - Tickets reference `holder_contact_id`; payment grouping (order/purchase) references `buyer_contact_id`.
  - Support multiple tickets under the same buyer with different holders and enable queries like “events purchased by buyer” and “events attended by holder”.
- Enhance the Ticket View page (`/ticket?code=`):
  - Show: Ticket Number, Ticket Number QR (QR of the ticket code used for check-in), Event Name, Event Date, Ticket Type, Ticket Payment Status.
  - Show Ticket Assigned To block: First Name Last Name, Email, Phone.
  - Ensure links from emails open this page; handle missing/invalid code states gracefully.

## Foundational Changes

- Database/model changes:
  - Make `ticket_number` nullable and keep it unique when non-null.
  - Add `payment_status` value `refunding` and terminal `refunded`; for waived comps, support `voiding` → `voided`.
  - Add `attendance_refunded` boolean on ticket (or separate linkage) to note refunds after check-in without deleting attendance history.
  - Add unified `contacts` table:
    - `contacts`: `id`, `email` (unique), `first_name`, `last_name`, `phone`, `created_at`, `updated_at`.
    - Add `holder_contact_id` on `tickets` and introduce `purchases` (or `orders`) table with `buyer_contact_id` to group payments and multiple tickets.
  - Keep or add holder inline fields if needed for denormalized snapshots, but treat `holder_contact_id` as source of truth.
  - Add `audit_log` (or reuse existing) to capture unassign/refund actions with reasons.
- Allocation logic:
  - Abstract a TicketNumberAllocator that can allocate next available number and accept released numbers.
  - Ensure atomicity when clearing/allocating numbers to prevent collisions under concurrency.
- API endpoints and contracts:
  - POST `/tickets/{id}/unassign` → clears `ticket_number`, sets `assigned=false`, sends unassign email, logs audit.
  - POST `/tickets/{id}/refund` → allowed for Paid/Waived regardless of checked-in; clears `ticket_number`, sets `payment_status=refunding|voiding`, sets `attendance_refunded=true` if previously checked-in, sends email(s), logs audit, triggers gateway refund if supported.
  - GET `/tickets/{code}` (or existing resolver) returns enhanced payload including event info, ticket type, holder contacts, payment status, ticket number, and `attendance_refunded`.
- Email templates/services:
  - New/updated templates for Unassign and Refund Initiated.
  - Ensure transport fallback to console is retained for dev.
  - Include “View Ticket” link to `/ticket?code=...` and QR (PNG) of the ticket code for ticket emails.
- Frontend Attendees UI:
  - Render actions per updated rules; Unassign for NOT Paid, Refund for Paid/Waived even if Checked In.
  - Add Unassign and Refund buttons with confirmations and inline toasts.
  - Refresh list and counters after actions.
- Ticket View page (`/ticket`):
  - Add the specified fields and layout; display QR for the ticket code used for check-in.
  - Handle error/empty states (invalid code, refunded/refunding, unassigned, etc.).

## Steps

1) Data model and migrations
- Add/modify columns: nullable `ticket_number` (unique), `payment_status` states `refunding`/`refunded`, plus `voiding`/`voided` for comps; add `attendance_refunded` boolean.
- Introduce `contacts` table and backfill from existing distinct emails (holders and buyers); add `holder_contact_id` to tickets and `buyer_contact_id` to purchases/orders.
- If purchases/orders not present, add `purchases` table to group tickets under a single payment.
- Create indexes for `ticket_number`, `code`, and `holder_contact_id` lookups.

2) Number allocation and release
- Implement TicketNumberAllocator with: allocate(), release(number), and allocate_next() semantics.
- Ensure allocator avoids reusing numbers currently tied to Checked In tickets; prefer reusing from unassigned/refunded tickets only.
- Wrap allocate/release in transactions to prevent race conditions.

3) API enhancements
- Add POST `/tickets/{id}/unassign`:
  - Auth + validation: only for NOT Paid (monetary) tickets.
  - Clear `ticket_number`, set `assigned=false`, persist, audit, send unassign email.
- Add POST `/tickets/{id}/refund`:
  - Auth + validation: Paid or Waived; allowed even if Checked In.
  - Clear `ticket_number`, set `payment_status=refunding|voiding`, set `attendance_refunded=true` if previously checked-in, persist, audit, send refund/void initiation email(s), and start refund flow if gateway available.
- Extend ticket resolver payload to include event name/date, type, payment status, ticket number, holder contacts, and `attendance_refunded`.

4) Email templates and services
- Implement Unassign email: subject/body explaining unassignment, include event name, ticket type, and support contact.
- Implement Refund Initiated email: subject/body explaining refund is in progress, expected timeline, and event details.
- Ensure ticket emails include: ticket view link and QR (PNG) for the ticket code.

5) Frontend Attendees page (at `/events/:id/attendees`)
- Compute per-row actions from Ticket and Payment Status.
- Add Unassign and Refund buttons with confirmation dialog and success/error toasts.
- On Unassign: call API, refresh row; keep payment status unchanged.
- On Refund: call API, set row to refunding/voiding, refresh counters; show banner if attendance was refunded.
- Checked In rows: show Refund if Paid/Waived; otherwise Unassign if unpaid.

6) Ticket View page (`/ticket?code=...`)
- Fetch by code; render:
  - Ticket Number, Ticket Number QR (QR of ticket code), Event Name, Event Date, Ticket Type, Ticket Payment Status.
  - Ticket Assigned To: First Name Last Name, Email, Phone.
- Handle states: unassigned (no ticket number) shows explicit note; refunding/refunded shows banner; checked-in can show a subtle status line.

7) QA and edge cases
- Verify number reuse across many unassign/refund cycles without collision.
- Confirm no action visibility on Checked In rows.
- Verify email copy and links in dev (console) and in prod with configured transport.
- Validate `/ticket` page on mobile and desktop; QR readability at check-in.

8) Rollout
- Apply DB migrations.
- Gate refund gateway integration behind config; allow manual refunds to set final `refunded` status when completed.
- Add admin-only report for unassigned and refunding tickets for monitoring.

## Notes

- “Ticket Number” refers to the human-readable/printed number that may be allocated and later released; the immutable check-in credential is the ticket code used for QR.
- Unassign does not alter payment status; Refund sets `refunding` and eventually `refunded` once completed.
- Multiple tickets per buyer are supported via `orders`/`customer` separation; each ticket keeps its own holder details for check-in and communications.
