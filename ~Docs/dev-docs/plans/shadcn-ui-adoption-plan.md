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
- [x] Install Tailwind and tooling in `frontend/` (package.json updated)
  - [x] Add deps: `tailwindcss postcss autoprefixer clsx tailwind-merge` (in package.json)
  - [x] Init Tailwind config (added `tailwind.config.ts`)
  - [x] Configure `tailwind.config.ts` (content paths, theme.extend, radius, container)
  - [x] Add global CSS: `src/styles/globals.css` with Tailwind layers and tokens
- [ ] Install shadcn and init
  - [ ] `npx shadcn@latest init` (Vite + React + TS)
  - [ ] Confirm primitives path `src/components/ui`
- [x] App shell plumbing
  - [x] Add `ThemeProvider` (class-based `.dark`) and `Toaster` at app root
  - [x] Add aliases: `@/components`, `@/ui`, `@/kit`, `@/lib`
- [x] Tokens & theme
  - [x] Define CSS variables for brand: `--brand`, `--brand-foreground`, `--success`, `--warning`, `--danger`, neutral scale
  - [x] Establish focus ring + radius defaults

## M1 — Primitives + Core Kit
- [x] Add shadcn primitives (via CLI):
  - [x] `button`, `input`, `textarea`, `select`, `checkbox`, `radio-group`, `switch`
  - [x] `dialog`, `alert-dialog`, `popover`, `sheet`, `tooltip`, `dropdown-menu`, `tabs`, `accordion`, `card`, `separator`, `scroll-area`, `breadcrumb`, `badge`, `skeleton`, `toast`, `table`
- [x] Add dependencies:
  - [x] `@radix-ui/react-*`, `lucide-react`, `@tanstack/react-table`, `react-hook-form`, `zod`
- [x] Create shared utils in `src/lib`
  - [x] `cn` (clsx + tailwind-merge)
  - [x] date/currency helpers (`format.ts`)
- [x] Build core kit in `src/components/kit` (wrapping shadcn primitives):
  - [x] FormGrid (standard form layout grid)
  - [x] FormField (label/help/error wrapper)
  - [x] DateInput (dd/mm/yy text input; calendar later)
  - [ ] DateRangeInput (date-only range)
  - [x] MoneyInput (THB, numeric value, formatted display)
  - [x] Combobox (select-based)
  - [x] StatusBadge (paid, unpaid, assigned, delivered, waived, checkedIn)
  - [x] QRCodeDisplay (API image)
  - [x] CopyButton (with feedback)
  - [x] TokenLink (renders/copies payment/ticket token URLs)
  - [x] DataTable (tanstack table styled like shadcn `Table`)
  - [x] Stat (metric tile)
  - [x] KeyValue (description list)
  - [x] EmptyState (icon, title, description, primary action)
  - [x] AsyncButton (loading state, promise-aware)
  - [x] ConfirmDialog (standard confirm, variants)
  - [x] Toolbar (filters/actions bar)
  - [x] PageHeader (title, subtitle, actions)
  - [x] AppShell (topbar, sidebar, content; `Sheet` mobile nav later)
- [ ] Add `Storybook`/`Ladle` stories for kit components (optional but recommended)

## M2 — Page Templates + Early Migration
- [ ] Add page templates in `src/components/templates`
  - [ ] List Template: `PageHeader` + `Toolbar` + `DataTable` + `EmptyState`
  - [ ] Form Template: `PageHeader` + `Card` + `FormGrid` + sticky actions
  - [ ] Details Template: `PageHeader` + `Stat` group + `Card` sections + `KeyValue`
  - [ ] Wizard Template: multi-step with progress
- [x] Migrate Payment flow first
  - [x] Convert `PaymentPage.tsx` to Card-based flow (lookup → pay → ticket)
  - [x] Use `StatusBadge`, `QRCodeDisplay`, `AsyncButton`
- [x] Migrate Assign flow
  - [x] Convert `AssignPage.tsx` to Form Template + Select/Combobox
  - [x] Improve preview layout with Cards and actions

## M3 — Events Page Migration
- [x] Convert `EventsPage.tsx` to use `Tabs` for Edit / Attendees / Ticket types
- [x] Add summary at top with `Stat` tiles (Paid, Unpaid, Revenue, etc.)
- [x] Use `DataTable` for Events list and Attendees
- [x] Use `DataTable` for Ticket Types with inline edit
- [x] Replace date inputs with `DateInput` (native calendar)
- [x] Integrate `ThaiAddressFields` kit into the Edit form

## M4 — Content Management + Purchase
- [x] Convert `ContentPage.tsx` to List Template with `Accordion` for ticket types
- [x] Replace raw links with copyable links (`CopyButton`)
- [x] Convert `PurchasePage.tsx` to Form Template and standard inputs

## M5 — Sweep, Guardrails, Docs
- [x] Add templates: List, Form, Wizard under `src/components/templates`
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
