# Folder & File Structure — MVP (React + TypeScript + FastAPI + Postgres in Docker)

Goals: fastest path to a functional prototype, minimal layering, no HubSpot, 3‑digit check‑in codes. Run app and DB via Docker (two containers).

## Project Tree (MVP)
```
fa-tickets/
├── dev-docs/
│   └── ...
├── compose.yaml                # Docker Compose (app + db)
├── backend/                     # FastAPI app (Python)
│   ├── Dockerfile
│   ├── pyproject.toml or requirements.txt
│   ├── alembic.ini              # if using Alembic
│   ├── .env                     # backend-only env (ignored in VCS)
│   └── app/
│       ├── main.py              # FastAPI app, include routers
│       ├── api/
│       │   ├── deps.py          # common dependencies (db session)
│       │   └── routes/
│       │       ├── events.py
│       │       ├── tickets.py
│       │       ├── customers.py
│       │       ├── checkin.py   # POST /checkin (event_id, code)
│       │       └── reports.py
│       ├── core/
│       │   ├── config.py        # settings (DATABASE_URL, email creds)
│       │   └── logging.py
│       ├── db/
│       │   ├── session.py       # SQLAlchemy engine/session (Postgres psycopg)
│       │   ├── base.py          # Base = declarative_base()
│       │   ├── models/
│       │   │   ├── event.py
│       │   │   ├── ticket_type.py
│       │   │   ├── ticket.py    # short_code CHAR(3), uuid
│       │   │   ├── customer.py
│       │   │   └── person.py
│       │   └── migrations/      # Alembic versions
│       ├── schemas/             # Pydantic models
│       │   ├── event.py
│       │   ├── ticket.py
│       │   ├── customer.py
│       │   ├── checkin.py
│       │   └── common.py
│       ├── services/
│       │   ├── events.py
│       │   ├── tickets.py       # generate short_code, state transitions
│       │   ├── customers.py
│       │   ├── checkin.py       # validate event + code, mark checked_in
│       │   └── reports.py
│       ├── processes/           # Cross-module orchestration
│       │   ├── assign_ticket.py # find/create customer, assign ticket, send email
│       │   ├── deliver_code.py  # resend
│       │   ├── checkin_by_code.py
│       │   └── reconciliation.py
│       ├── integrations/
│       │   └── email/
│       │       ├── service.py   # send_code_email(), resend()
│       │       └── gmail_client.py
│       └── utils/
│           ├── codes.py         # 3-digit code generation (leading zeros allowed)
│           └── time.py
├── frontend/                    # React + TypeScript (Vite)
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── pages/
│       │   ├── EventsPage.tsx
│       │   ├── AssignPage.tsx
│       │   ├── CheckinPage.tsx  # event selector + numeric keypad
│       │   └── ReportsPage.tsx
│       ├── components/
│       │   ├── NumericKeypad.tsx
│       │   └── EventForm.tsx
│       ├── lib/
│       │   ├── api/
│       │   │   ├── client.ts    # fetch wrapper
│       │   │   └── types.ts     # optional, generated from OpenAPI
│       │   └── utils.ts
│       └── styles/
├── scripts/
│   ├── dev.sh                   # optional helper to run both apps
│   └── seed.py                  # optional: seed DB
├── .env                         # top-level env if desired
└── .env.example                 # document required env vars
```

## Notes
- Keep it thin: services talk directly to SQLAlchemy (no repository layer for MVP).
- Postgres via Docker (official image). Use Alembic for migrations.
- Email via Gmail (SMTP with OAuth2 or Google API). Wrap in `integrations/email` for easy swapping later.
- 3-digit codes: generate in `utils/codes.py`, enforce uniqueness per event in the DB (UNIQUE(event_id, short_code)). Allow leading zeros.
- Optional: generate API types in frontend via `openapi-typescript` from FastAPI’s OpenAPI spec to keep TS types in sync.

## MVP Endpoints (Backend)
- POST `/events` — create event (title, starts_at, ends_at, location, capacity)
- POST `/events/{id}/seed` — seed tickets for capacity (or per ticket_type)
- POST `/assign` — assign ticket to a customer and send code
- POST `/resend` — resend code email
- POST `/checkin` — body `{ event_id, code }` → marks checked_in
- GET `/reports/reconciliation?event_id=...` — counts + CSV

## Why this works for MVP
- React + TypeScript on the frontend keeps UI iteration fast.
- FastAPI + Postgres in Docker keeps backend simple to run and closer to production.
- Clear places for processes (assign, resend, check-in, reconcile) without over-structuring.
