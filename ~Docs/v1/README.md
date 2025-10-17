# FA Tickets — Docs v1 (Lean)

Purpose: concise, need-to-know docs for engineers and PMs. Each page stays short and links to code when useful.

- What this covers: APIs, database, architecture/tech, navigation map.
- What this avoids: verbose tutorials, long narratives, screenshots that drift.
- How to use: skim sections, jump via inline anchors, keep PRs small.

Sections
- Architecture & Tech Stack: high-level system map, services, libraries.
- API Catalog (lean): endpoints grouped by domain; link to Detailed for full shapes.
- Database Schema (lean): core tables and relationships; link to Detailed for columns.
- Navigation Map: app menus and flow tree (developer view).

Detailed docs
- See `Docs/v1/Detailed/` for expanded references:
  - `Detailed/api.md`: request params and response JSON fields per endpoint.
  - `Detailed/database.md`: full table/column reference, keys, indexes, enums.
  - `Detailed/design.md` (future): component rules and UI patterns.

Files
- architecture.md
- api.md
- database.md
- navigation.md
 - design.md

Change discipline
- Keep examples minimal; prefer type/shape snippets.
- Update after schema/API changes in the same PR.
- Use TODO tags for deltas, remove within 1 business day.
