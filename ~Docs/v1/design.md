# Design (Lean)

Scope
- Shared tokens, UI principles, and minimal component rules.
- Keep concise; defer specifics to code and future Detailed doc.

Detailed rules
- See `Detailed/design-rules.md` for the full UI rulebook (tokens, components, interactions, accessibility).

Foundations
- Tokens: Tailwind + shadcn/ui; see `frontend/components.json` and `tailwind.config.ts`.
- Colors: use theme tokens; avoid hardcoded hex in components.
- Typography: system defaults via shadcn presets; scale from `globals.css`.
- Spacing: Tailwind scale; consistent `gap-*` in stacks/grids.

Components
- Buttons: primary/secondary/destructive/ghost per shadcn; `size=sm|md` only.
- Forms: use `FormField` wrappers; inline validation under field; required indicators via label `*`.
- Tables: headers short; right-align numeric; truncate long text with tooltip.
- Badges: status via semantic colors (paid, unpaid, waived, refunded).
- Dialogs: confirm destructive actions; keep copy under 2 lines.

Interaction rules
- CopyButton: on click, change icon to a check and show a brief "Copied" tooltip/toast; revert in 1.2s.
- Resend actions: optimistic UI with toast; disable while in-flight.
- AsyncButton: show spinner; prevent duplicate submits.
- Error messages: clear, single-line; no stack traces; suggest next step.

Layouts
- Page header: title + primary action on the right.
- Section spacing: consistent `mt-6` under headers.
- Mobile: sheet menu closes on navigation; tables become cards at `sm`.

References
- Code: `frontend/src/components/kit` and `frontend/src/components/ui`.
- Style tokens: `frontend/components.json`, `frontend/src/styles/globals.css`.
- Patterns: see Attendees and Purchase details pages as reference implementations.
