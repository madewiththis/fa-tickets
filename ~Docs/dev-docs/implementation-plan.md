## Implementation Plan — MVP (React + TypeScript + FastAPI + Postgres via Docker)

Use this checklist to track progress. Each phase has tasks and a verification gate. Update checkboxes as we complete items.

## Phase 0 — Project Setup
- [x] Confirm stack: React (TypeScript), FastAPI, Postgres (Docker).
- [x] Create repo structure (`backend/`, `frontend/`, `dev-docs/`).
- [x] Backend scaffold: FastAPI app (`app/main.py`), base router, env config.
- [x] Dockerize backend (Dockerfile) and add `compose.yaml` with services `app` and `db` (Postgres).
- [x] DB setup: SQLAlchemy + Alembic; Postgres DSN via env `DATABASE_URL`.
- [x] Frontend scaffold: Vite React TS; minimal layout/shell.
- [x] Add `.env.example` and basic `scripts/dev.sh` (optional) to orchestrate.

Verification
- [ ] `docker compose up` starts `db` and `app`; healthcheck for Postgres passes.
- [ ] Backend reachable at `http://localhost:8000`, `GET /openapi.json` returns 200.
- [ ] Alembic creates baseline tables in Postgres (inspect with `psql` or Adminer/Beekeeper).
- [ ] Frontend runs (`vite dev`) and loads a placeholder page.

## Phase 1 — Data Model & Migrations
- [x] Define models: `event`, `ticket_type`, `ticket`, `customer`, `person`.
 - [x] Add `ticket.short_code CHAR(3)` and `UNIQUE(event_id, short_code)` (allow leading zeros).
 - [x] Add `ticket.uuid` (unique) for internal use.
- [x] Create initial Alembic migration (tables + indexes) and apply to Postgres.
 - [x] Seed script for dev: one sample event and customers (optional).

Verification
- [ ] Alembic upgrade/downgrade works cleanly inside the app container.
- [ ] Seeding creates event and N available tickets; counts match capacity.

## Phase 2 — Backend APIs: Events & Inventory
- [x] POST `/events` (create) and GET `/events/{id}` (details).
- [x] POST `/events/{id}/seed` to seed ticket inventory for capacity (or by ticket_type).
- [x] GET `/events/{id}/tickets?status=available|assigned|checked_in`.

Verification
- [ ] Creating an event returns 201 and persisted data is correct.
- [ ] Seeding produces the expected number of `available` tickets.
- [ ] Tickets list filters by status correctly.

## Phase 3 — Assignment & Delivery
- [x] Implement `assign_ticket` process: find/create customer, reserve available ticket, generate `short_code`.
- [x] POST `/assign` endpoint (customer + event → ticket assignment).
- [x] Email integration wrapper (`integrations/email/service.py`).
- [ ] Gmail client for dev (SMTP or Google API), plus a local console/file transport.
- [x] POST `/resend` to resend the code email.

Verification
- [ ] Assigning returns a ticket with `short_code`; DB shows `assigned` state in Postgres.
- [ ] Codes are unique per event; duplicates prevented by constraint and code path.
- [ ] Dev email (console/file) shows message with event info and 3-digit code.

## Phase 4 — Check-in
- [x] POST `/checkin` (body: `{ event_id, code }`) validates ticket and marks `checked_in`.
- [x] Handle invalid code, wrong event, or already checked-in with clear 4xx errors.
- [x] Add minimal audit timestamps (`checked_in_at`).

Verification
- [ ] First valid check-in returns success and sets `checked_in_at`.
- [ ] Re-check of same code returns a conflict/duplicate error (no state change).
- [ ] Wrong event or non-existent code returns 404/400.

## Phase 5 — Reports & Export
- [x] GET `/reports/reconciliation?event_id=...` returns counts (capacity, assigned, delivered, checked_in).
- [x] CSV export endpoint for reconciliation.

Verification
- [ ] Counts match DB state across flows; manual spot-check passes.
- [ ] CSV downloads and opens in Excel/Sheets with correct columns.

## Phase 6 — Frontend Pages (React + TS)
- [x] EventsPage: create event; seed inventory; list events.
- [x] AssignPage: form (customer name/email/phone, event picker) → call `/assign`; show code.
- [x] CheckinPage: event selector + numeric keypad UI → call `/checkin`; show success/duplicate.
- [x] ReportsPage: reconciliation counts + CSV export.
- [x] Add a small `lib/api/client.ts` wrapper and types (optionally generated from OpenAPI).

Verification
- [ ] End-to-end (via Compose): create event → seed tickets → assign → (dev email shows code) → check-in → reports reflect counts.
- [ ] Browser refresh preserves state where expected; errors are displayed clearly.

## Phase 7 — Polish & Readiness
- [x] Basic auth gate (single shared token header) to protect endpoints/pages.
- [x] Consistent error handling shape (JSON) and logging (minimal; HTTPException.detail used consistently).
- [x] Update `.env.example` and short runbook in README.
- [ ] Optional deploy notes (container or simple host instructions).

Verification
- [ ] Unauthorized access blocked; happy-path flows unaffected.
- [ ] Runbook steps reproduce a working demo from scratch.

## Optional — Automated Tests (Start Small)
- [ ] Pytest API smoke tests (assign, check-in, reports) against a temp SQLite DB.
- [ ] Unit tests for `utils/codes.py` (leading zeros, uniqueness strategy under constraint).
- [ ] Lightweight UI test (Playwright) for check-in keypad (optional).

## Demo Gate (Go/No-Go)
- [ ] Demonstrate full flow live: create event → seed → assign → verify email → check-in → export reconciliation CSV (contains the right numbers).
- [ ] Capture any gaps and loop back to the relevant phase checklist.
