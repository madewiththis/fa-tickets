# Architecture & Tech Stack (Need-to-know)

Scope
- System boundaries and data flow at a glance.
- Key frameworks/libraries and why chosen.

Overview
- Frontend: React + Vite + TypeScript, Tailwind + shadcn/ui.
- Backend: FastAPI + SQLAlchemy, Alembic migrations.
- DB: PostgreSQL.
- Infra (dev): Docker Compose services for API + DB.
- Email: console/mock service (dev) with templates.

Data flow (high-level)
- Public: Event page → Purchase flow (/purchase2) → Invoice → Assign tickets → Emails.
- Internal: Dashboard → Events, Tickets (Attendees), Purchases, Check-in, Reports.

Service responsibilities
- API: auth (if any), CRUD for events/tickets/contacts/purchases, ticket actions, content/checkout.
- Email: render templates and send (mocked in dev).
- Reports: reconciliation summaries and CSV.

Tech choices
- FastAPI: type-first, async-friendly, quick to document.
- SQLAlchemy + Alembic: explicit models, safe migrations.
- React + shadcn/ui: accessible primitives, consistent UI tokens.
- Tailwind: speed + consistency.

Operational notes
- Migrations live under `backend/app/db/migrations`.
- Routes under `backend/app/api/routes`.
- Feature pages under `frontend/src/pages`.

