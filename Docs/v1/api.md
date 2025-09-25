# API Catalog (Lean)

Conventions
- Base: `/` (FastAPI). JSON in/out. ISO dates.
- IDs: numeric DB ids; public ids for public event pages.
- Auth: TBD/none for current internal dev.

Detailed reference
- For request parameters and response JSON fields, see `Detailed/api.md`.

Tickets
- `POST /tickets/unassign`: Unassign unpaid/waived ticket.
- `POST /tickets/refund`: Refund paid ticket.
- `POST /tickets/reassign`: Change holder contact.
- `GET /tickets/by-code/{code}`: Lookup ticket by code.

Contacts
- `GET /contacts`: Search contacts.
- `GET /contacts/{id}`: Contact detail.
- `GET /contacts/{id}/purchases`: Purchases by contact (optional event filter).
- `GET /contacts/{id}/holder_tickets`: Tickets where contact is holder.

Purchases
- `GET /purchases/{id}`: Purchase detail incl. buyer and tickets.

Content / Checkout
- `POST /content/checkout_multi`: Record purchase + unpaid tickets; supports later pay/assign.

Events
- `GET /events/public/{public_id}`: Public event info for purchase page.
- Other: promotion, reconciliation summary/CSV (internal tooling).

Schemas
- See `backend/app/schemas/*.py` for request/response models.

Notes
- Email-related actions currently mocked (console log).
