# Database Structure (Draft)

Keep it simple for MVP. Names and fields may change as we iterate.

## Tables

### event
- id (pk)
- title
- starts_at, ends_at (with timezone)
- location
- capacity
- created_at, updated_at

### ticket_type
- id (pk)
- event_id (fk → event)
- name
- price_baht (authoritative price for this type)
- max_quantity (maximum tickets of this type for the event)
- active (boolean)
- created_at, updated_at



### ticket
- id (pk)
- uuid (unique)
- event_id (fk → event)
- ticket_type_id (fk → ticket_type, nullable for MVP)
- customer_id (fk → customer, nullable until assignment)
- short_code CHAR(3) — event-scoped code for check-in (leading zeros allowed)
- status: available | assigned | delivered | checked_in | void
- payment_status: unpaid | paid | waived (manual)
- assigned_by_person_id (fk → person)
- assigned_at, delivered_at, checked_in_at
- created_at, updated_at

### customer
- id (pk)
- first_name, last_name
- email
- phone (optional)
- created_at, updated_at

### person (seller/staff)
- id (pk)
- name
- email (login)
- role: admin | seller | checker
- created_at, updated_at

### ticket_customer (if many-to-one changes are needed later)
- For MVP, each ticket maps to one customer via `ticket.customer_id`.
- If needed later, introduce a join table for flexibility.

## Unique Constraints & Indexes (initial)
- ticket: UNIQUE(event_id, short_code)
- ticket: uuid UNIQUE
- ticket: idx(event_id), idx(customer_id), idx(ticket_type_id)
- customer: idx(email)
- person: idx(email)

## Notes
- No QR codes for MVP; check-in uses a 3-digit `short_code` per event (leading zeros allowed). Event must be selected at check-in.
- If events exceed ~100 attendees later, migrate to 4 digits by altering column to `CHAR(4)` and reseeding.
- Keep authoritative pricing on `ticket_type`. If needed later, snapshot price onto `ticket` at assignment.
- Soft deletes not required for MVP; use status fields.
- Auditing minimal via `assigned_by_*` and timestamps.
