# Plan: Dashboard, Events Enhancements, and Ticket Statuses

Goals
- Add a blank Dashboard page in the frontend.
- Improve Events list display: show date as dd/mm/yy with time on a second line under the date.
- Extend Events data model: rename `location` to `location_name`; add `location_address` (JSON), `address_maps_link` (URL), `location_getting_there` (text), and contact fields (phone, email, url).
- Ensure ticket payment status is distinct from delivery status (introduce separate delivery status column and stop overloading the main status).

Scope
- Backend: database migrations, SQLAlchemy models, Pydantic schemas, and route updates. Adjust reports to use new delivery status.
- Frontend: new Dashboard page/tab; Events page formatting change; form and read views prepared for new event fields (can phase UI field inputs after backend lands).
- Data migration and compatibility: preserve backward compatibility where feasible during transition.

Non‑Goals
- Full email deliverability tracking (only a simple delivery status).
- Advanced address validation or geocoding.
- Breaking API changes without a transitional path.

Deliverables
- Alembic migration for event fields and ticket delivery status.
- Updated models/schemas/routes for events and tickets.
- Updated reports logic (delivered count derived from delivery status).
- Frontend: Dashboard page, Events list date formatting.

Phases and Tasks

1) Frontend: Dashboard Page (blank)
- Add `frontend/src/pages/DashboardPage.tsx` with a simple placeholder.
- Update `frontend/src/App.tsx` tabs to include a new first tab `{ key: 'dashboard', label: 'Dashboard' }` and set it as default active.
- Acceptance: App renders a “Dashboard” tab; content shows a blank placeholder.

2) Frontend: Events List Formatting
- File: `frontend/src/pages/EventsPage.tsx`.
- Change the “Starts” column rendering to:
  - Date: dd/mm/yy (e.g., 05/11/24) using `toLocaleDateString('en-GB')` or a manual formatter.
  - Time below date: hh:mm (24h) using `toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })`.
- Acceptance: Events table shows date on first line, time on second line, with dd/mm/yy formatting.

3) Backend: Events Model & Schema Changes
- Database (Alembic migration):
  - Rename column `event.location` → `location_name` (String(255), nullable).
  - Add `location_address` JSONB (nullable), storing address lines/parts (e.g., `{ line1, line2, city, state, postcode, country }`).
  - Add `address_maps_link` String(1024), nullable (Google Maps URL).
  - Add `location_getting_there` Text, nullable.
  - Add `contact_phone` String(64), `contact_email` String(255), `contact_url` String(1024), all nullable.
- Models: Update `backend/app/db/models/event.py` accordingly (use `from sqlalchemy.dialects.postgresql import JSONB`).
- Schemas (`backend/app/schemas/event.py`):
  - EventCreate/Update: accept new fields; keep a temporary compatibility alias: accept `location` and map it to `location_name` if provided.
  - EventRead: return `location_name` (consider also mirroring legacy `location` during transition).
- Routes (`backend/app/api/routes/events.py`):
  - Map payload `location` → `location_name` for compatibility.
  - Set new fields on create/update; include in read responses via schema.
- Acceptance: Creating/updating events works with new fields; old `location` still accepted during transition; EventRead includes `location_name`.

4) Backend: Ticket Delivery vs Payment Status
- Rationale: Stop overloading `Ticket.status` with a “delivered” state; track email delivery separately.
- Database (Alembic migration):
  - Add `delivery_status` Enum(`not_sent`, `sent`, `bounced`) with default `not_sent`.
  - One‑time data migration: for rows where `status == 'delivered'`, set `delivery_status = 'sent'` and update `status = 'assigned'`.
  - Keep existing `status` enum values for now to avoid immediate breaking changes; later migration can remove `delivered` from the enum.
- Models: Update `backend/app/db/models/ticket.py` with `delivery_status`.
- Services:
  - `services/tickets.assign_ticket`: after email send, set `delivery_status='sent'` and keep `status='assigned'` (stop setting `status='delivered'`).
  - `services/reports.py`: compute delivered count via `delivery_status='sent'` instead of `status='delivered'`.
- API:
  - `GET /events/{id}/tickets`: keep `status` filter for compatibility; optionally add `delivery_status` filter (docs TBD).
  - `GET /reports/reconciliation`: reflects delivered via new delivery status.
- Acceptance: Assign flow sets `delivery_status`; reports show correct counts; check‑in unaffected; payment status remains separate (`paid/unpaid/waived`).

5) Frontend: Events Form (Follow‑up – optional in this batch)
- Extend event create/edit form to capture and render:
  - `location_name` (rename “Location” label).
  - `location_address` as a set of fields (line1, line2, city, state, postcode, country) or a freeform textarea for MVP.
  - `address_maps_link`, `location_getting_there` (textarea), `contact_phone`, `contact_email`, `contact_url`.
- Acceptance: Saved values round‑trip and appear when editing an event.

6) Data & Rollout
- Migration ordering: events fields first, then tickets delivery status.
- Backfill: run the one‑time update for tickets where `status=delivered`.
- Compatibility window:
  - Accept `location` in EventCreate/Update for at least one release; deprecate and remove later.
  - Keep `status` filter working but internally map/report delivered via `delivery_status`.
- Docs: Update README env/usage notes after changes; add API docs snippets for new fields.

Open Questions / Decisions
- `location_address` shape: fixed keys vs. freeform list of lines; proposal: object with common keys plus allow extra keys.
- `delivery_status` states: MVP uses `not_sent`/`sent`; `bounced` optional (requires webhook/provider feedback to set).
- Whether to remove `delivered` from `Ticket.status` in the immediate next migration or keep for longer while clients update.

Risks
- Enum/column migrations require careful deploy and DB compatibility checks.
- Frontend/Backend drift if UI field changes lag behind backend changes; mitigate with compatibility mapping and feature flags.

Estimates (rough)
- Migrations + backend changes: 0.5–1 day.
- Frontend Dashboard + Events formatting: 0.5 day.
- Frontend form follow‑up for event fields: 0.5–1 day.

Acceptance Criteria Summary
- Dashboard tab exists and renders a blank page.
- Events list “Starts” shows dd/mm/yy with time on second line.
- Event endpoints support new fields; `location_name` replaces `location` server‑side; legacy `location` input accepted during transition.
- Ticket `delivery_status` stored separately; assignment sets it to `sent`; reports derive delivered from `delivery_status`.
