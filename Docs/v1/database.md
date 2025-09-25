# Database Schema (Need-to-know)

Conventions
- PostgreSQL via SQLAlchemy ORM. Migrations with Alembic.
- Models in `backend/app/db/models`. Enums as Python Enums.

Detailed reference
- Full table and column list with indexes and enums: see `Detailed/database.md`.

Core tables
- `event`: event meta; public_id, start/end, location, capacity.
- `ticket_type`: per-event ticket SKUs; price, capacity.
- `ticket`: issued tickets; status, payment_status, holder_contact_id, ticket_number, purchase_id.
- `contact`: unified person/contact; name, email, phone.
- `purchase`: buyer, totals, payment status; links to tickets.
- `customer`/`person` (legacy/aux if present): historical or auxiliary records.
- `event_promotion`: promotion settings per event.

Key enums
- `ticket_status`: available, assigned, delivered, checked_in, void.
- `payment_status`: unpaid, paid, waived, refunding, refunded, voiding, voided.
- `delivery_status`: not_sent, sent, bounced.
- `person_role`: admin, seller, checker.

Relationships
- event 1—N ticket_type
- event 1—N ticket
- ticket_type 1—N ticket
- purchase 1—N ticket
- contact 1—N purchase (buyer)
- contact 1—N ticket (holder via holder_contact_id)

Migrations (milestones)
- 0002: event field expansions; add delivery_status.
- 0003–0004: event_promotion; public_id.
- 0005: contacts, purchases, ticket updates.
- 0006: backfill contacts + link holders.
- 0007: ticket.purchase_id FK.

See also
- Code: `backend/app/db/models/*.py`
- Migrations: `backend/app/db/migrations/versions/*`
