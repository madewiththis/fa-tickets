# Tech Stack — MVP

This MVP uses React (TypeScript) + FastAPI (Python) + Postgres, all run locally via Docker Desktop with Docker Compose (two containers: app + db).

## Backend
- Framework: FastAPI (Python 3.11+), ASGI server: Uvicorn (or Gunicorn+Uvicorn workers).
- Data: SQLAlchemy 2.x ORM + Alembic migrations targeting Postgres.
- Auth: minimal gate (single shared code or simple login); roles simplified to one Seller/admin for MVP.
- Codes: 3-digit per-event `short_code`; enforce `UNIQUE(event_id, short_code)` with leading zeros allowed.

## Frontend
- React + TypeScript (Vite).
- UI: Material 3 components OR Tailwind (keep one primary; both acceptable for MVP if kept simple).
- Check-in: numeric keypad code entry UI with event selector.

## Database
- Postgres running in Docker (official image).
- Schema entities: event, ticket_type, ticket, customer, person.
- Constraints: `UNIQUE(event_id, short_code)` on ticket; indexes per dbs_structure.md.

## Infrastructure
- Docker Compose with two services:
  - `db` (Postgres): persistent volume, healthcheck.
  - `app` (FastAPI): depends_on db (with healthcheck), mounts code for live reload in dev.
- Environments: local dev via Compose; production TBD.

Example compose (sketch):
```
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_USER: app
      POSTGRES_PASSWORD: app
      POSTGRES_DB: fa_tickets
    ports: ["5432:5432"]
    volumes: ["db_data:/var/lib/postgresql/data"]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U app -d fa_tickets"]
      interval: 5s
      timeout: 5s
      retries: 10
  app:
    build: ./backend
    environment:
      DATABASE_URL: postgresql+psycopg://app:app@db:5432/fa_tickets
    ports: ["8000:8000"]
    depends_on:
      db:
        condition: service_healthy
    volumes:
      - ./backend:/app
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
volumes:
  db_data:
```

## Integrations
- Email: Gmail via SMTP (OAuth2/app password) using Python (`smtplib` + OAuth2 or a small client library). Wrap behind `integrations/email` for easy provider swap later.

## Observability & Ops
- Basic structured logs; minimal metrics.
- Error reporting: Sentry or equivalent (optional).

## Security & Privacy
- Least-privilege DB user; secrets via env.
- Collect minimal PII; document retention.

Notes
- MVP does not use QR codes; check-in uses 3-digit codes.
- Frontend can run outside Docker during dev; the app container refers to the backend FastAPI service.
