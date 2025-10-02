# Migration Plan: Vite (React Router) → Next.js (App Router)

## Goals & Constraints

- Keep functional parity and existing UX patterns (events-first workflow).
- Preserve subroute structure for sections (e.g., `/events/:id/attendees`, `/attendees/:id/purchases`).
- Reuse the current component library (Tailwind + shadcn/ui).
- Keep the FastAPI backend unchanged; use same-origin requests via rewrites in dev and prod.
- Minimize flicker by leveraging server rendering where beneficial; keep client interactivity where needed.
- Incremental, low-risk rollout with clear rollback path.

## Target Stack

- Next.js 14+ (App Router, `/app` directory) with TypeScript.
- Tailwind CSS, shadcn/ui, next-themes.
- next/link, next/navigation (replace react-router-dom).
- `next/font` for fonts, `next/image` where image optimization helps.
- Environment vars via `NEXT_PUBLIC_*` and Next runtime config.

## URL & Routing Map (Parity)

- `/events` → `app/events/page.tsx` (list)
- `/events/[id]` (editor base → “Details”)
  - `/events/[id]/overview`
  - `/events/[id]/attendees`
  - `/events/[id]/purchases`
  - `/events/[id]/ticket-types`
  - `/events/[id]/promote`
  - `/events/[id]/invite`
- `/attendees` → `app/attendees/page.tsx`
- `/attendees/[id]`
  - `/attendees/[id]/overview`
  - `/attendees/[id]/tickets`
  - `/attendees/[id]/purchases`
- `/pay` (query: `purchase`, `token`) → `app/pay/page.tsx`
- `/ticket` (query: `ref`, `token`, `code`) → `app/ticket/page.tsx`
- `/invoice/[id]`, `/promo/[id]`, `/checkin`, `/reports`, `/content`, `/admin/email-logs`
- Default `/` → redirect to `/events`.

Notes:
- Use nested segments for section subroutes to mirror current structure and maintain deep-linking.
- For search params pages (`/pay`, `/ticket`), use `searchParams` in Next App Router.

## Data Fetching Strategy

- Keep the existing `api` layer but adapt env handling to `NEXT_PUBLIC_*`.
- Dev: configure Next rewrites so that `/api/*` goes to FastAPI (`http://localhost:8000` or docker `backend` service).
- Prefer server components for initial list/detail loads to remove flicker; elevate to client components where interactivity/state is heavy (tables, filters, toasts).
- Keep optimistic UI/toasts patterns as-is in client components.

## Environment, Rewrites, and Config

- `next.config.js` rewrites:
  - `{ source: '/api/:path*', destination: 'http://localhost:8000/:path*' }` in dev.
  - In prod, point to your backend host (env-driven).
- Replace `import.meta.env` usage with `process.env.NEXT_PUBLIC_*` in the API client.
- Add `.env.local` with `NEXT_PUBLIC_API_BASE=/api` for same-origin calls.

## Project Layout & Shared UI

- Create `/app` with `layout.tsx` that renders the existing AppShell-like navigation and theming.
- Move/shared components to `/components` unchanged where possible; extract any Vite-specific imports.
- Global styles: import Tailwind in `app/globals.css` and port `frontend/src/styles/globals.css`.
- Aliases: configure `@/` to project root (tsconfig and `next.config.js`).

## Coexistence Strategy (Duplicate App)

- Keep current Vite app intact under `/frontend` (no functional freeze initially).
- Create a separate Next.js app under `/web` and migrate feature-by-feature.
- Run both apps concurrently in dev (ports 5173 and 3000). Backend FastAPI continues on 8000.
- Production cutover uses routing at the edge (reverse proxy) or a separate host (e.g., `next.example.com`) during the pilot.
- Backend endpoints and DB remain unchanged, minimizing risk.

### Dev Ports & Commands

- Backend: `:8000` (unchanged)
- Vite app: `:5173` (unchanged)
- Next app: `:3000` (new)
- Rewrites: Next proxies `/api/*` → backend.

## Migration Strategy (Phased)

Phase 0 — Plan, Duplicate, and Baseline
- [x] Decide coexistence approach and folder layout: add `/web` for Next.js.
- [x] Freeze new feature development in `/frontend` (critical fixes only).
- [x] Create Next app: `npx create-next-app@latest --ts` in `/web`.
- [x] Add Tailwind and next-themes; initial globals.
- [x] Add `next.config.js` rewrite for `/api/:path*` → backend.
- [x] Add `.env.local` with `NEXT_PUBLIC_API_BASE=/api` and optional token.
- [ ] CI: add a job to build `/web` to avoid drift.
- [x] CI: add a job to build `/web` to avoid drift.

Acceptance:
- [x] Next dev server runs; `/` redirects to `/events`; header/nav renders (Dashboard hidden).

Phase 1 — Shared Libs and API Client
- [x] Port `lib/api/client.ts` (use `process.env.NEXT_PUBLIC_*`).
- [x] Port `lib/format.ts` helpers.
- [x] Support SSR fetch base (use `BACKEND_ORIGIN` on server; `/api` on client).
- [ ] Port remaining shared libs (utils/devlog as needed).
- [ ] (Optional) Add `utils/router.ts` shim.

Acceptance:
- [x] Events page calls backend via `api.listEvents()` through `/api` rewrite.

Phase 2 — App Layout & Navigation
- [x] Implement `app/layout.tsx` (AppShell-lite): branding + top nav.
- [x] Hide Dashboard; default `/` → redirect to `/events`.
- [x] Tailwind config migrated; next-themes provider enabled (darkMode: class).
- [x] Add ThemeToggle and polish active nav states.
- [ ] Add mobile sheet (after shadcn/ui integration).

Acceptance:
- [x] `/events` page shell renders in Next with nav and theming.

Phase 3 — Events List (Server + Client)
- [x] Create `app/events/page.tsx` with server-side fetch.
- [x] Add client widgets for search/filters.
- [x] Fetch reconciliation stats and ticket types in parallel; show KPIs.
- [x] Actions/links parity (Details/Tickets/Invite/Promote/Attendees).
- [x] Add "New Event" button and creation form under `/events/new`.

 Acceptance:
 - [ ] Visual and functional parity for `/events` list (counts, badges, actions, links).

Phase 4 — Event Editor + Subroutes
- [x] Add placeholder `/events/[id]/overview`.
- [x] Add `/events/[id]` base redirect and shared layout with tabs.
- [x] Add `Details` tab and make it default.
- [x] Port Overview (server stats) and Attendees (basic list).
- [x] Add remaining tab subroutes (Purchases, Ticket Types, Promote, Invite).
- [x] Optimize with loading UI (route segment `loading.tsx` skeletons).
- [ ] Evaluate caching for server fetches (revalidate) after UX review.

Acceptance:
- [ ] Navigating between event tabs via subroutes works smoothly and matches Vite.

Phase 5 — Attendees (List + Detail)
- [x] Add placeholder `/attendees` page.
- [x] Implement `/attendees` list with client search.
- [x] Implement `/attendees/[id]/overview|tickets|purchases` with shared layout + tabs.
- [x] Add loading UIs; preserve deep links and smooth tab switches.

Acceptance:
- [ ] Lists, detail, and actions (assign/unassign, resend, copy links) match behavior.

Phase 6 — Payments, Tickets, Public Pages
- [x] `/pay` with `searchParams` for `purchase` and `token`.
- [x] `/ticket` with `ref|token|code` handling; QR display via `/api/qr`.
- [x] `/promo/[id]` (Public event page).

Acceptance:
- [ ] GUID-based flows open and function; emails link to Next routes successfully in staging.

Phase 7 — Admin, Reports, Check-in, Content
- [x] Email Logs: list + search + copy + send test email.
- [x] Reports: event selection + reconciliation summary.
- [x] Check-in: event selection, code validation, check-in action.
- [x] Content: events list with ticket type links and copy.

Acceptance:
- [ ] Parity with current actions and views; CSV links and QR flows verified.

Phase 8 — QA, Pilot, and A/B Routing
- [ ] Add e2e smoke flows (manual or Playwright) for critical paths.
- [ ] Pilot Next on a separate host/path.
- [ ] Feature flag email links to point to Next routes.

Acceptance:
- Key funnels verified; errors and logs monitored; greenlight for cutover.

Phase 9 — Cutover & Rollback
- [ ] Update reverse proxy to route primary host to Next app.
- [ ] Keep Vite deployment behind alternate path/host for rollback.
- [ ] Freeze Vite for new features; backport critical fixes during soak.

Acceptance:
- Production traffic served by Next; SLOs met; rollback plan documented.

Phase 10 — Decommission Vite
- [ ] Remove Vite app and config; or archive in a branch/tag.
- [ ] Clean up CI steps and docs; finalize onboarding for Next.

Acceptance:
- Repo simplified; all docs updated; onboarding reflects Next-only.

## Code Changes Checklist

- [x] Add `/web` (Next.js app).
- [x] Configure Tailwind and next-themes.
- [ ] Configure shadcn/ui in Next.
- [x] Add initial `globals.css` and Tailwind layers.
- [x] Create `app/layout.tsx` with nav (Dashboard hidden).
- [x] Add `app/page.tsx` redirect and `app/events/page.tsx` baseline list.
- [ ] Implement `app/events/[id]/(tabs)/...` structure for subroutes.
- [x] Port `lib/api/client.ts` to Next (envs → `process.env.NEXT_PUBLIC_*`).
- [x] Add `next.config.js` rewrites for backend API.
- [ ] Add QR endpoint rewrite validation; ensure `qrUrl` works.
- [ ] Port ui/kit components; replace any react-router imports with `next/link` and router.
- [ ] Replace direct `window.location` navigations with `router.push` where applicable.
- [ ] Replace `NavLink` active states with `usePathname` utilities.
- [ ] Confirm deep-link routes and email templates point to Next URLs.
- [ ] Add pilot flag to toggle app URL used in outbound emails.
- [ ] Add e2e smoke tests for purchases, assignment, and payment flows.

## Risks & Mitigations

- Routing differences: React Router → Next App Router nuances.
  - Mitigation: maintain subroute parity; create path helpers and test deep links early.
- Mixed server/client components complexity.
  - Mitigation: default to client components initially; refactor individual views to server components for performance later.
- Env/config drift (Vite → Next).
  - Mitigation: Introduce small compatibility wrapper for env access; document `.env.local` keys.
- Build/deploy changes.
  - Mitigation: Start side-by-side; switch traffic once validated.

Additional:
- Sharing components: if duplication becomes heavy, consider a small internal package or a `packages/ui` workspace to host shared components and lib (optional; not required for first pass).
- Performance: Once parity is met, selectively move heavy data pages to server components with caching/revalidation.

## Rollout Plan

1. Deliver `/events` and event editor subroutes in Next.
2. Pilot in a staging env behind a feature flag or alternate host.
3. Port attendees, payments, and public pages.
4. Finalize remaining pages (reports, admin, content).
5. Switch default frontend to Next; retire Vite after soak period.

## Timeline (Rough)

- Week 1: Bootstrap app, plumbing, Events list + layout + API rewrites.
- Week 2: Event editor tabs, Purchases section.
- Week 3: Attendees list/detail, Payment/Ticket/Public pages.
- Week 4: Reports, Check-in, Admin pages, QA hardening, deploy.

## Acceptance Criteria

- All legacy routes have Next equivalents with the same URL scheme.
- No blocking regressions in purchase, assignment, check-in, and email resend flows.
- Deep links in emails (GUID refs, purchase payment) open correct Next pages.
- Default `/` routes to `/events`; Dashboard not shown.
