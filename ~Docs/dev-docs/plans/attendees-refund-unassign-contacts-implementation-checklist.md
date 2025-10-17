# Implementation Checklist: Refund/Unassign, Unified Contacts, Ticket View

Purpose: A step-by-step, checkbox-driven plan with explicit test points to implement and validate the Unassign/Refund flows, unified Contacts model (buyers and holders), and the enhanced Ticket View.

References:
- High-level plan: attendees-unassign-refund-holder-separation-and-ticket-view.md
- Backend: FastAPI + SQLAlchemy
- Frontend: React/TS + Tailwind + shadcn/ui

---

## Acceptance Criteria

- [x] Attendees page surfaces the correct actions per row:
  - [x] NOT Paid → Unassign
  - [x] Paid or Waived → Refund (even if Checked In)
  - [x] Checked In + NOT Paid → Unassign
- [x] Unassign releases the ticket number and sends unassign email.
- [x] Refund initiates refund/void, releases ticket number, sets status refunding/voiding, emails buyer and holder.
- [x] Unified Contacts model exists; tickets link to a holder_contact_id, purchases link to a buyer_contact_id.
- [x] Ticket View page shows all required fields and QR; reflects refunding/refunded/voided states.

---

## 0) Prep & Inventory

- [x] Review current DB models and migrations for tickets, orders/purchases, and emails.
- [x] Confirm existing payment statuses and whether waived is modeled.
- [x] Identify where ticket number allocation occurs today.
- [x] Identify email service and template locations.

Test Points
- [x] Document current enums/status fields and where they are enforced.
- [x] Note any areas that will need backfill or data derivation.

---

## 1) Database & Models

Schema Changes
- [x] Create `contacts` table
  - [x] Columns: id (pk), email (unique, not null), first_name, last_name, phone, created_at, updated_at
- [x] Create/confirm `purchases` (orders) table
  - [x] Columns: id (pk), buyer_contact_id (fk -> contacts.id), external_payment_ref, total_amount, currency, created_at
- [x] Tickets table updates
  - [x] Add `holder_contact_id` (fk -> contacts.id)
  - [x] Add `attendance_refunded` boolean default false
  - [x] Make `ticket_number` nullable and unique when non-null
  - [x] Extend `payment_status` accepted values to include: refunding, refunded; if using comps: voiding, voided
- [x] Indexes
  - [x] tickets(code), tickets(ticket_number), tickets(holder_contact_id), purchases(buyer_contact_id)

ORM Updates
- [x] SQLAlchemy models for Contact, Purchase, Ticket updated
- [x] Relationships: Ticket.holder_contact, Purchase.buyer_contact
- [x] Enum/constraints updated for payment_status

Data Migration & Backfill
- [x] Backfill contacts from distinct emails found in tickets (holder) and purchases/orders (buyer)
- [x] Set holder_contact_id on tickets using prior holder email
- [ ] Set buyer_contact_id on purchases using prior buyer email (future when multi-ticket checkout implemented)
- [x] Validate uniqueness and resolve duplicates

Test Points
- [ ] Migration up/down works on a snapshot db
- [x] Backfill script produces 1:1 mapping for emails and populates fks
- [x] Constraints (unique email, nullable ticket_number) enforce as expected

---

## 2) Ticket Number Allocation/Release

Allocator
- [x] Implement TicketNumberAllocator service
  - [x] allocate_next(event_id) for new numbers
  - [ ] release(event_id, number) for unassigned/refunded tickets (not needed; we allocate smallest missing)
  - [x] Avoid reusing numbers for checked-in tickets; reuse from unassigned/refunded pools (achieved by freeing ticket_number on unassign/refund)
  - [x] Transactions to prevent race conditions (advisory locks)

Integration
- [x] Replace any ad-hoc allocation with allocator calls

Test Points
- [ ] Concurrency test (simulate 10+ allocations) avoids collisions
- [x] Release then allocate returns released numbers when appropriate

---

## 3) API Endpoints & Contracts

Unassign
- [x] POST `/tickets/unassign`
  - [x] Validation: NOT Paid (monetary) only
  - [x] Effects: clear ticket_number, set available, clear customer link
  - [x] Emails: unassign notice to holder

Refund (initiation)
- [x] POST `/tickets/refund`
  - [x] Validation: Paid or Waived; allowed even if Checked In
  - [x] Effects: clear ticket_number, set payment_status=refunding|voiding; set attendance_refunded=true if previously checked-in
  - [ ] Gateway: initiate refund when available; store refund reference
  - [x] Emails: refund-init notice to buyer and holder

Ticket Resolve (for Ticket View)
- [x] GET `/tickets/by-code/{code}`
  - [x] Payload includes: event name/date, location, ticket type, payment status, ticket number, holder contact, attendance_refunded

Audit
- [ ] Capture actor, reason, timestamp, before/after snapshot ids/keys (future audit table)

Test Points
- [ ] Unit tests for validation and state transitions
- [ ] Manual calls with invalid states return correct errors
- [ ] Emails triggered and contain correct links and content

---

## 4) Email Templates & Service

Templates
- [x] Unassign email (holder)
  - [x] Includes event name and what changed
- [x] Refund initiated (buyer & holder)
  - [x] Includes event details and reference (optional reason)
- [x] Ticket email
  - [x] Contains PNG QR for ticket code and link to `/ticket?code=...`
  - [x] Includes Ticket Number when present

Service
- [ ] Add robust fallback to console logging for dev
- [ ] Ensure transport errors are handled gracefully

Test Points
- [ ] Trigger emails locally; verify console output and templates
- [ ] Verify QR renders as PNG and the link opens Ticket View

---

## 5) Frontend: Attendees Page (`/events/:id/attendees`)

UI Behavior
- [x] Compute row actions using Ticket Status and Payment Status
  - [x] NOT Paid → Unassign button
  - [x] Paid or Waived → Refund button (even if Checked In)
  - [x] Checked In + NOT Paid → Unassign
- [x] Success/error toasts and row refresh
- [ ] Counters update accordingly

API Wiring
- [x] Call unassign/refund endpoints
- [x] Handle 4xx/5xx with clear messaging

Test Points
- [ ] Visual check: buttons appear only per allowed states
- [ ] Execute actions and verify state changes without reloads
- [ ] Counters remain consistent with list state

---

## 6) Frontend: Ticket View (`/ticket?code=...`)

Fields
- [x] Ticket Number
- [x] Ticket Number QR (QR of ticket code)
- [x] Event Name
- [x] Event Date
- [x] Ticket Type
- [x] Ticket Payment Status
- [x] Ticket Assigned To: First Name Last Name, Email, Phone

States
- [x] Unassigned: show explicit note (no ticket number yet)
- [x] Refunding/Voiding: show banner explaining status
- [x] Refunded/Voided: show terminal status; ticket not valid for entry
- [x] Checked In: show subtle checked-in marker

Test Points
- [ ] Valid, assigned, paid ticket renders all fields and QR
- [ ] Invalid code shows error and guidance
- [ ] Refunding/refunded/voided states render as designed

---

## 7) Reporting & Queries (Contacts)

Buyer vs Holder
- [x] Query: events purchased by a buyer (by buyer_contact_id) — via `/purchases/{id}` endpoint foundation
- [ ] Query: events attended by a holder (by holder_contact_id + check-in records)

UI Surfacing (optional milestone)
- [ ] Contact profile page surfacing purchase and attendance history

Test Points
- [ ] Spot-check queries return expected rows after backfill
- [ ] Large contact with many tickets performs within acceptable bounds

---

## 8) QA Scenarios & E2E

Refund Allowed Post Check-in
- [ ] Create paid ticket, check-in, then refund; status transitions to refunding and attendance_refunded=true
- [ ] Emails sent to buyer and holder

Unassign Not Paid
- [ ] Create assigned, unpaid ticket; unassign releases ticket number and sends email

Multiple Tickets per Buyer
- [ ] One buyer purchases 3 tickets for 3 holders; contacts de-duplicate correctly; holders differ

Allocator Robustness
- [ ] Bulk allocate 100 tickets, unassign 20, allocate again; released numbers are reused safely

Ticket View Integrity
- [ ] Email link opens Ticket View and all fields match DB
- [ ] QR scans correctly with check-in tool

---

## 9) Rollout & Ops

Migrations
- [ ] Alembic upgrade head in staging then prod
- [x] Backfill migration run and validated (dev)

Feature Flags / Config
- [ ] Enable refund capability in environments as needed
- [x] Configure email transport or use console fallback

Monitoring & Logs
- [ ] Add audit log dashboard/filter for unassign/refund
- [ ] Alert on refund API failures

Rollback Plan
- [ ] Keep reversibility for migrations; ensure data snapshot before changes
- [ ] If issues found, pause refund/unassign endpoints and revert migrations if necessary

---

## 10) Documentation & Handover

- [x] Update README or dev docs with new endpoints and models (internal docs updated)
- [x] Document refund/unassign policy (in planning docs)
- [x] Note contact model and how to query buyer vs holder histories (in planning docs)

---

## Follow-up Ideas

- [ ] Audit log: add `audit_log` table and record actor, reason (optional), and before/after snapshots for unassign/refund.
- [ ] Contact profiles: admin UI to view a contact’s purchase and attendance history; link from Attendees and Purchases.
- [ ] Grouped purchases: support multi-ticket checkout to group multiple tickets under one purchase with totals and line items.
- [ ] Refund completion: integration with payment gateway to move refunding→refunded and voiding→voided automatically; expose refund reference and status.
- [ ] Ticket number formatting: consider zero-padding or prefix for display; ensure uniqueness per event remains intact.
- [ ] Holder vs buyer in UI: shift Attendees to show holder_contact data when available; allow transfer of holder.
- [ ] Purchases list: admin page to list purchases with filters, date range, and export.
- [ ] Tests: add unit tests for allocator and service transitions; add API tests for unassign/refund.

---

## Quick API Contracts (for reference)

- POST `/tickets/{id}/unassign`
  - Request: `{ reason?: string }`
  - Response: `{ id, ticket_number: null, payment_status, holder_contact_id, audit_id }`

- POST `/tickets/{id}/refund`
  - Request: `{ reason: string }`
  - Response: `{ id, ticket_number: null, payment_status: "refunding"|"voiding", attendance_refunded: boolean, refund_ref?: string, audit_id }`

- GET `/tickets/by-code/{code}`
  - Response: `{ event: { name, start_at, end_at, venue }, ticket: { number, type, payment_status, code, attendance_refunded }, holder: { first_name, last_name, email, phone } }`

---

## Notes

- Refund (paid) vs Void (complimentary) are separate but symmetric flows; both should clear ticket_number and make the ticket invalid for entry.
- Contacts unify buyer and holder; role is derived from usage (buyer_contact_id in purchases vs holder_contact_id in tickets).
- Keep the immutable ticket code for verification and history, even when the printed number is released.
