# FlowEvents Next.js App (/web)

This is the new Next.js app being migrated from the existing Vite-based frontend under `/frontend`.

## Dev

1) Ensure the backend is running (Docker Compose or scripts/run_local_backend.sh):

   - Backend: http://localhost:8000
   - Database: Postgres via Docker Compose

2) In `/web`:

```
npm install
cp .env.local.example .env.local # then edit if needed
npm run dev
```

Open http://localhost:3000

## Environment

- `NEXT_PUBLIC_API_BASE=/api` (recommended; relies on Next rewrites)
- Optional: `NEXT_PUBLIC_API_TOKEN` if your backend requires it.
- Optional: `BACKEND_ORIGIN` in `next.config.js` (defaults to `http://localhost:8000`).

## Rewrites

Requests to `/api/*` are proxied to the FastAPI backend. See `next.config.js`.

## Next Steps

- Port pages route-by-route per Docs/planning/nextjs-migration.md
- Start with `/events` list, then Event editor tabs, then Attendees.
