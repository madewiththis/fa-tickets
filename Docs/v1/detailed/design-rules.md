# Design Rules — Detailed

Purpose
- Canonical, actionable UI rules that keep the app consistent.
- Maps rules to code locations for easy implementation.

References
- Tokens: `frontend/components.json`, `frontend/tailwind.config.ts`, `frontend/src/styles/globals.css`.
- Components: `frontend/src/components/ui/*`, `frontend/src/components/kit/*`.

Tokens & Theming
- Do not hardcode colors; use CSS variables from `components.json` via Tailwind.
- Support dark mode automatically; avoid non-contrast-safe color overrides.
- Z-index: use Tailwind layers; modals/dialogs above sheets; toasts above dialogs.

Layout & Spacing
- Page shells use `PageHeader` + content with `mt-6` section spacing.
- Vertical stacks: prefer `space-y-*` or `gap-*` with flex/stack utilities.
- Max content width: leave responsive; don’t lock pages to fixed px widths.

Typography
- Use shadcn defaults; avoid custom font sizes unless necessary.
- Headings: h1 for page titles only; sub-sections use h2/h3 styled via utility classes.

Color & Status
- Status badges: map states to semantic colors
  - paid: green, unpaid: gray, waived: blue, refunding/refunded: yellow/amber, voiding/voided: red.
- Link colors: use theme link styles; add `underline-offset-2` on focus.

Components
- Buttons
  - Variants: `primary`, `secondary`, `destructive`, `ghost` (shadcn). Sizes: `sm`, `default`.
  - Loading: use `AsyncButton`; disable during requests; include spinner icon.
  - Icon-only buttons must have an `aria-label`.

- Forms
  - Wrap with `FormField`; show inline validation under fields.
  - Required fields: indicate with `*` in label; don’t rely on placeholder.
  - Input sizes: default; compact only for numeric quantity inputs in public checkout.
  - Error text: single line, concise, no stack traces.

- Tables
  - Column headers are brief; numbers right-aligned; long text truncated with tooltip on hover.
  - Row actions consolidated into a single “Actions” button expanding a toolbar.
  - Empty state: use `EmptyState` component.

- Badges
  - Use `StatusBadge` for payment/status; keep labels in Title Case.

- Dialogs
  - Confirm destructive actions (refund, unassign); keep body copy under 2 lines.
  - Pressing Escape or outside click closes unless mid-submit.

- Toasts
  - Use `use-toast` hook; success ≤ 2s, error 4–6s; be specific, e.g., “Tickets resent”.

- Copy Button
  - On click: copy to clipboard, change icon to check, show brief “Copied” tooltip/toast, revert icon in ~1.2s.
  - Provide `aria-live="polite"` feedback for screen readers.

Navigation
- Global nav icons: Dashboard/LayoutDashboard, Events/Drama, Tickets/Search, Check-in/ScanQrCode, Reports/ChartLine.
- Mobile: sheet closes on link click; ensure focus is restored to the triggering control.

Feedback & Loading
- Any async action must show a busy state and prevent double-submit.
- Long lists should show skeletons (`Skeleton` components) during load.

Accessibility
- All interactive controls must be keyboard-accessible and focusable.
- Provide `aria-label` for icon-only controls; ensure visible focus rings.
- Color contrast meets WCAG AA; don’t imply state with color alone—include icons/text.

Responsive
- Breakpoints: default Tailwind. Tables collapse to cards on small screens.
- Hide non-essential columns on `sm` via utility classes; preserve primary actions.

Patterns (reference implementations)
- Purchase details inline view: table row “View” expands a detail panel below with resend/refund actions grouped below the table.
- Tickets list actions: per-row Actions → toolbar with Preview, Resend, Copy link, Reassign.
- Public checkout: quantity +/- controls with 3-digit numeric input, delete to clear, selected rows highlighted.

Do/Don’t
- Do prefer existing kit components (`kit/*`) before introducing new primitives.
- Do keep copy concise and action-led.
- Don’t introduce bespoke paddings/margins; use Tailwind scales.
- Don’t add new colors without updating tokens.

Date Formats
- Always dd/mm/yyyy never month before date
- timezone assumed to be GMT+7

Number Formats
- all numbers (including currency) should have thousands separators