# Attendees Directory (Buyers & Holders)

## Purpose
- Provide a unified “Attendees” interface for people (buyers and ticket holders).
- Enable search and role-based filtering; drill down to a person’s purchases and tickets across events.
- Support purchase detail views (event details, receipts/invoices, total paid) and a consolidated list of tickets held by the person.

## Scope
- New main nav item: `Attendees` → index list and contact detail views.
- Leverage existing models: `contact`, `purchase`, `ticket`, `event`.
- Derive roles based on usage:
  - Buyer: appears as `purchases.buyer_contact_id`.
  - Holder: appears as `tickets.holder_contact_id` (fallback: infer from `customer.email` when holder contact is not wired for old records).

---

## High-Level UX

Attendees index (list):
- Search box (text): name/email/phone.
- Role filter (multi-select): Buyer, Holder.
- Table columns: Name, Email, Phone, Counts, Last Activity, Actions.
  - Counts uses icons, no explicit Roles column:
    - evts: hand-coins (events purchased)
    - tix: ticket-check (tickets held)
- Actions: View (opens contact detail).

Contact detail:
- Header: Name, Email, Phone, Role chips, quick stats (#Events Purchased, #Tickets Held, Last Activity).
- Tabs/sections: Overview, Buyer, Holder.
  - Buyer: Events purchased, per-event ticket counts, total paid; link to per-purchase/receipt/invoice.
  - Holder: Tickets issued (across events) with status and links to ticket view.

---

## ASCII Wireframes

Attendees index

```
+----------------------------------------------------------------------------------+
| Attendees                                                                        |
| [Search: ______________________ ]  Roles: [x] Buyer  [x] Holder   [Load]         |
+----------------------------------------------------------------------------------+
| Name                | Email                    | Phone       |  Counts        |   |
|---------------------+--------------------------+-------------+----------------+---|
| Jane Doe            | jane@ex.com              | +66...      | 🖐️ 3  🎟️ 0   | V |
| Bob Smith           | bob@ex.com               | +66...      | 🖐️ 0  🎟️ 2   | V |
| Alex Chan           | alex@ex.com              | +66...      | 🖐️ 1  🎟️ 1   | V |
+----------------------------------------------------------------------------------+
Legend: 🖐️ = hand-coins (evts), 🎟️ = ticket-check (tix)
```

Contact detail (Overview)

```
+----------------------------------------------------------------------------+
| Jane Doe   <jane@ex.com>  (Buyer)  Phone: +66 ...                          |
| Stats: Events Purchased: 3 • Tickets Held: 0 • Last Activity: 2025-09-25   |
+----------------------------------------------------------------------------+
| Overview | Buyer | Holder                                                  |
|----------------------------------------------------------------------------|
| Buyer (by event)                                                            |
|  - Event A (2 tickets) — Total Paid: 1,000 THB [View Purchases]            |
|  - Event B (1 ticket) — Total Paid:   500 THB [View Purchases]             |
|                                                                            |
| Holder (tickets)                                                            |
|  - Event C • Ticket No. 42 • Code ABC • paid • checked in ✦                |
+----------------------------------------------------------------------------+
```

Buyer tab → View Purchases (for an event)

```
+--------------------------------------------------------------+
| Event A — Purchases                                          |
| Total Paid: 1,000 THB                                        |
+--------------------------------------------------------------+
| Purchase ID | Payment Ref | Date/Time        | Tickets | View |
|-------------+-------------+------------------+---------+------|
| 123         | tok_...     | 2025-09-24 10:31 | 2       | ▸    |
+--------------------------------------------------------------+
| ▸ expands: list tickets (No./Code/Status/Payment) + Receipt/Invoice links |
+----------------------------------------------------------------------------+
```

Holder tab → Tickets list

```
+----------------------------------------------------------------------------------+
| Event             | Ticket No. | Code | Payment | Status     | Checked-in | View |
|-------------------+------------+------+---------+------------+------------+------|
| Event C           | 42         | ABC  | paid    | delivered  | 2025-09-24 | ▸    |
+----------------------------------------------------------------------------------+
```

Legend: V = View button; ▸ = Open details (ticket view/purchase detail)

---

## Data Model (recap)
- `contact` (id, email unique, first_name, last_name, phone, created_at, updated_at)
- `purchase` (id, buyer_contact_id -> contact.id, external_payment_ref, total_amount, currency, created_at)
- `ticket` (id, event_id, ticket_type_id, holder_contact_id -> contact.id, purchase_id -> purchase.id, short_code, ticket_number, status, payment_status, checked_in_at, attendance_refunded)
- `event` (id, title, starts_at, ends_at, ...)

Role derivation:
- Buyer: EXISTS purchase with buyer_contact_id = contact.id
- Holder: EXISTS ticket with holder_contact_id = contact.id (fallback: map via customer.email during transition)

---

## Backend APIs

Index & profile
- GET `/contacts?search=&roles=buyer,holder&limit=50&offset=0`
  - Returns: `[ { id, first_name, last_name, email, phone, roles: ['buyer','holder'],
                 stats: { events_purchased, tickets_held, last_activity } } ]`
- GET `/contacts/{id}`
  - Returns: `{ id, first_name, last_name, email, phone, roles, stats,
                buyer: { events: [ { event_id, title, tickets_count, total_paid, purchase_ids[] } ] },
                holder: { tickets_count } }`

Detail lists
- GET `/contacts/{id}/purchases?event_id=optional`
  - Returns: list of purchases (id, external_payment_ref, created_at, total_amount, currency, tickets_count) optionally filtered by event.
- GET `/contacts/{id}/holder_tickets`
  - Returns: list of tickets where holder_contact_id = id, with joined event and type.
- Existing: GET `/purchases/{purchase_id}` (already implemented)
- Existing: GET `/tickets/by-code/{code}` (ticket view)

Notes
- Provide pagination on list endpoints; include simple ordering (last_activity desc).
- last_activity can be max(created_at/checked_in_at/delivered_at) across tickets and purchases for the contact.

---

## Frontend

Routes
- `/attendees` — index list
- `/attendees/:id` — contact profile (Overview, Buyer, Holder tabs)
- Drill-ins: open purchase dialog (reuse existing purchase view) or new page `/purchases/:id` (optional)

Index UI
- Search input (debounced).
- Role filter (multi-select with chips: Buyer, Holder). Default both selected.
- Table columns:
  - Name (First Last), Email, Phone
  - Roles (pill badges), Buyer (X events), Holder (Y tickets)
  - Last Activity
  - Actions (View)

Detail UI
- Header with name/email/phone and role chips.
- Overview tab: 
  - Buyer by event summary with totals + link to View Purchases list.
  - Holder summary with a few recent tickets.
- Buyer tab:
  - Event rows with totals and a child list of purchases (purchase ID, ref, time, tickets) with a right-side action to open Purchase detail dialog.
- Holder tab:
  - Table of tickets: Event, Ticket No., Code, Payment, Status, Checked-in At, Action (Open Ticket).

---

## Queries & Aggregations

Contacts index
- Query contacts where (exists buyer or holder depending on roles filter).
- Compute per-contact stats:
  - events_purchased = count(distinct purchase.event_id or derive via joined ticket.event_id by purchase)
  - tickets_held = count(tickets where holder_contact_id = contact.id)
  - last_activity = GREATEST(MAX(purchase.created_at), MAX(ticket.created_at, ticket.checked_in_at, ticket.delivered_at))

Contact detail
- Buyer summary by event: group tickets by event via purchases for buyer_contact_id, sum tickets and sum amounts (fallback to ticket_type price if total_amount is null).
- Holder tickets: select tickets where holder_contact_id = contact.id, join events and ticket_types.

---

## Permissions & Security
- Same auth policy as existing admin API (`X-Auth-Token`).
- No PII beyond what’s already stored (email/phone) is newly exposed.

---

## Implementation Steps

1) Backend: endpoints
- [ ] GET `/contacts` with roles filter and search; compute stats.
- [ ] GET `/contacts/{id}` with buyer and holder summaries.
- [ ] GET `/contacts/{id}/purchases` (optional if embedded in detail).
- [ ] GET `/contacts/{id}/holder_tickets` (or embed, with pagination).
- [ ] Ensure indexes: contacts.email, tickets.holder_contact_id, purchases.buyer_contact_id, tickets.event_id, purchases.created_at.

2) Frontend: routes & pages
- [ ] Add main nav item `Attendees`.
- [ ] Implement `/attendees` list with search + role filter (multi-select) and table.
- [ ] Implement `/attendees/:id` detail with tabs (Overview, Buyer, Holder).
- [ ] Reuse purchase dialog/view for buyer drill-in; add links to Ticket View for holder tickets.

3) Data consistency & backfill
- [ ] Ensure holder_contact_id is filled for legacy records (migration already in place via backfill from customers).
- [ ] Optional: expose a maintenance script to sync holder_contact_id if any new legacy tickets appear.

4) UX polish
- [ ] Debounced search; empty states; loading skeletons; role chips.
- [ ] Date/time formatting; THB total formatting; pill styles for roles.

5) Testing
- [ ] Contacts index returns expected roles and counts (manual checks with seed data).
- [ ] Filters: Buyer-only, Holder-only, both, none.
- [ ] Contact detail: buyer events summary tallies with purchases; holder tickets list matches tickets.
- [ ] Drill-ins: purchase dialog opens and ticket view links work.

---

## Test Cases
- Search by partial email matches expected contacts.
- Filter Buyer only → only contacts with purchases shown; Holder only → only contacts with tickets as holders.
- Contact with both roles shows both chips and combined stats.
- Buyer summary counts tickets across multiple purchases for same event; totals add up.
- Holder tickets table shows Ticket No., Code, Payment, Status, Checked-in times correctly.
- Large lists paginate without performance issues.

---

## Risks & Considerations
- Performance: aggregate queries on large datasets should use indexes; consider materialized views or cached stats if needed later.
- Data cleanliness: ensure emails are normalized for contact uniqueness; continue to backfill holder_contact_id from customer email until full UI migration.
- Receipts/Invoices: link to or embed existing receipt storage when available; placeholder links in MVP.

---

## Out-of-Scope (MVP)
- Full contact profile edits/merge tooling.
- Advanced reporting across contacts.
- Bulk email/send to attendees from this screen.

---

## Follow-ups
- Contact profile editing and merge (dedupe by email/phone).
- Purchases list admin page with filters/date range/export.
- Attendance history charts per contact.
- Audit log linking actions on tickets/purchases to contacts.
