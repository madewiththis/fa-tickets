# shadcn/ui Adoption Plan (Checklist)

Purpose: adopt shadcn/ui with Tailwind and Radix, introduce a small reusable component kit, and migrate key pages incrementally while keeping the UI DRY and consistent.

## Milestones
- [ ] M0: Base setup and theme tokens
- [ ] M1: Primitives installed + core kit components
- [ ] M2: Payment and Assign pages migrated
- [ ] M3: Events page migrated (Edit, Attendees, Ticket types)
- [ ] M4: Content + Purchase pages migrated
- [ ] M5: Sweep + guardrails + docs

## Pre‑flight
- [ ] Confirm Node.js version and Vite React setup in `frontend/`
- [ ] Align brand colors/typography and dark mode needs with stakeholders
- [ ] Decide on initial icon set (lucide-react) and usage guidelines

## M0 — Base Setup
- [ ] Install Tailwind and tooling in `frontend/`
  - [ ] Add deps: `tailwindcss postcss autoprefixer clsx tailwind-merge`
  - [ ] Init Tailwind: `npx tailwindcss init -p`
  - [ ] Configure `tailwind.config.{js,ts}` (content paths, theme.extend, radius, container, etc.)
  - [ ] Add global CSS: `src/styles/globals.css` with `@tailwind base; @tailwind components; @tailwind utilities;`
- [ ] Install shadcn and init
  - [ ] `npx shadcn@latest init` (Vite + React + TS)
  - [ ] Confirm primitives path `src/components/ui`
- [ ] App shell plumbing
  - [ ] Add `ThemeProvider` (class-based `.dark`) and `Toaster` at app root
  - [ ] Add aliases: `@/components`, `@/ui`, `@/kit`, `@/lib`
- [ ] Tokens & theme
  - [ ] Define CSS variables for brand: `--brand`, `--brand-foreground`, `--success`, `--warning`, `--danger`, neutral scale
  - [ ] Set typography scale and font families
  - [ ] Establish focus ring + radius defaults

## M1 — Primitives + Core Kit
- [ ] Add shadcn primitives (via CLI):
  - [ ] `button`, `input`, `textarea`, `select`, `checkbox`, `radio-group`, `switch`, `slider`
  - [ ] `dialog`, `alert-dialog`, `popover`, `sheet`, `tooltip`, `dropdown-menu`, `tabs`, `accordion`, `card`, `separator`, `scroll-area`, `breadcrumb`, `badge`, `skeleton`, `toast`, `table`
- [ ] Add dependencies:
  - [ ] `@radix-ui/react-*`, `lucide-react`, `@tanstack/react-table`
- [ ] Create shared utils in `src/lib`
  - [ ] `cn` (clsx + tailwind-merge)
  - [ ] date helpers (dd/mm/yy) and currency helpers (THB)
- [ ] Build core kit in `src/components/kit` (wrapping shadcn primitives):
  - [ ] FormGrid (standard form layout grid)
  - [ ] FormField (label/help/error with react-hook-form binding)
  - [ ] DateInput (dd/mm/yy) with `Calendar + Popover` (th locale)
  - [ ] DateRangeInput (date-only range)
  - [ ] MoneyInput (THB, numeric value, formatted display)
  - [ ] Combobox (searchable select)
  - [ ] StatusBadge (paid, unpaid, assigned, delivered, waived, checkedIn)
  - [ ] QRCodeDisplay (inline canvas or API image)
  - [ ] CopyButton (with toast feedback)
  - [ ] TokenLink (renders/copies payment/ticket token URLs)
  - [ ] DataTable (tanstack table styled like shadcn `Table`)
  - [ ] Stat (metric tile: value, label, optional delta)
  - [ ] KeyValue (description list for details)
  - [ ] EmptyState (icon, title, description, primary action)
  - [ ] AsyncButton (loading state, promise-aware)
  - [ ] ConfirmDialog (standard confirm, variants)
  - [ ] Toolbar (filters/actions bar)
  - [ ] PageHeader (title, subtitle, breadcrumbs, actions)
  - [ ] AppShell (topbar, sidebar, content; `Sheet` mobile nav)
- [ ] Add `Storybook`/`Ladle` stories for kit components (optional but recommended)

## M2 — Page Templates + Early Migration
- [ ] Add page templates in `src/components/templates`
  - [ ] List Template: `PageHeader` + `Toolbar` + `DataTable` + `EmptyState`
  - [ ] Form Template: `PageHeader` + `Card` + `FormGrid` + sticky actions
  - [ ] Details Template: `PageHeader` + `Stat` group + `Card` sections + `KeyValue`
  - [ ] Wizard Template: multi-step with progress
- [ ] Migrate Payment flow first
  - [ ] Convert `PaymentPage.tsx` to Card-based wizard (lookup → pay → ticket)
  - [ ] Use `StatusBadge`, `QRCodeDisplay`, `AsyncButton`, `TokenLink`
- [ ] Migrate Assign flow
  - [ ] Convert `AssignPage.tsx` to Form Template + `Combobox`
  - [ ] Replace preview with `TokenLink` + `CopyButton`

## M3 — Events Page Migration
- [ ] Convert `EventsPage.tsx` to use `Tabs` for Edit / Attendees / Ticket types
- [ ] Add summary at top with `Stat` tiles (Paid, Unpaid, Revenue, etc.)
- [ ] Use `DataTable` for Attendees and Ticket Types
- [ ] Replace date fields with `DateInput` and `DateRangeInput` (date-only)
- [ ] Integrate `ThaiAddressFields` kit into the Edit form

## M4 — Content Management + Purchase
- [ ] Convert `ContentPage.tsx` to List Template with `Accordion` for ticket types
- [ ] Replace raw links with `TokenLink` + `CopyButton`
- [ ] Convert `PurchasePage.tsx` to Form Template and standard inputs

## M5 — Sweep, Guardrails, Docs
- [ ] Sweep for raw inputs/buttons; replace with kit components
- [ ] ESLint import rule: forbid direct `@/components/ui` and `@radix-ui/*` in pages; allow `@/kit`
- [ ] Optional Stylelint/Tailwind class ordering rules
- [ ] Docs: `dev-docs/ui.md` usage guidelines with examples
- [ ] Visual QA on target browsers and color contrast checks

## Commands Reference
- Install base deps:
  - `npm i -D tailwindcss postcss autoprefixer clsx tailwind-merge`
- Init Tailwind:
  - `npx tailwindcss init -p`
- Install shadcn and add components:
  - `npx shadcn@latest init`
  - `npx shadcn@latest add button input textarea select checkbox radio-group switch slider dialog alert-dialog popover sheet tooltip dropdown-menu tabs accordion card separator scroll-area breadcrumb badge skeleton toast table`
- UI utilities:
  - `npm i lucide-react @tanstack/react-table`

## Acceptance Criteria
- [ ] Consistent theme tokens (colors/typography) applied across pages
- [ ] PaymentPage and AssignPage use kit + templates with no regressions
- [ ] EventsPage tabs and summaries implemented with standardized components
- [ ] Content and Purchase flows use kit components and templates
- [ ] No page imports shadcn primitives directly; pages rely on `@/kit`
- [ ] Documentation exists for how to build new pages with templates

## Risks & Mitigations
- [ ] CSS regressions — mitigate with incremental rollout and visual checks
- [ ] Accessibility gaps — use Radix primitives and audit focus/aria
- [ ] Bundle bloat — tree-shake icons, only add required shadcn components
- [ ] Developer adoption — provide examples, lints, and scaffolds

## Mapping (Current → Kit)
- [ ] `PaymentPage.tsx` → Wizard Template + `StatusBadge` + `QRCodeDisplay` + `AsyncButton`
- [ ] `AssignPage.tsx` → Form Template + `Combobox` + `TokenLink`
- [ ] `EventsPage.tsx` → Tabs + `Stat` tiles + `DataTable` + `ThaiAddressFields`
- [ ] `ContentPage.tsx` → List Template + `Accordion` + `TokenLink` + `CopyButton`
- [ ] `PurchasePage.tsx` → Form Template + `FormGrid` inputs

