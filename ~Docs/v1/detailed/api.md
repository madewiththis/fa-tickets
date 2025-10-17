# API — Detailed

Conventions
- Base path: `/` (FastAPI). JSON bodies, ISO 8601 timestamps.
- IDs: numeric unless noted; `public_id` for public event pages.
- Errors: HTTP status with `{ detail: string }` payload.

Tickets
- POST `/tickets/unassign`
  - Purpose: Unassign an unpaid/waived ticket.
  - Body: `UnassignRequest { ticket_id: int }`
  - Response: `UnassignResponse { ticket_id, event_id, payment_status, status, ticket_number }`
  - Errors: 404 not found; 409 invalid state.

- POST `/tickets/refund`
  - Purpose: Mark a paid ticket as refunding/voiding and set `attendance_refunded` if applicable.
  - Body: `RefundRequest { ticket_id: int }`
  - Response: `RefundResponse { ticket_id, event_id, payment_status, attendance_refunded, status }`
  - Errors: 404 not found; 409 invalid state.

- POST `/tickets/reassign`
  - Purpose: Change ticket holder contact; creates/links contact by email.
  - Body: `ReassignRequest { ticket_id: int, email: EmailStr, first_name?: string, last_name?: string, phone?: string }`
  - Response: `ReassignResponse { ticket_id, event_id, customer_email?, holder_contact_id?, short_code? }`
  - Errors: 404 not found; 409 invalid state.

- GET `/tickets/by-code/{code}`
  - Purpose: Ticket detail for public code views.
  - Response: `TicketByCodeResponse { event: { name, start_at, end_at, location }, ticket: { number, code, type_id, type_name, payment_status, status, attendance_refunded }, holder?: { first_name, last_name, email, phone } }`
  - Errors: 404 not found.

- GET `/tickets/lookup?code=ABC&event_id?=int&token?=uuid`
  - Purpose: Lookup by short code or token.
  - Response: `TicketLookupResponse { ticket_id, event_id, short_code?, payment_status, status, event_title? }`
  - Notes: when using `token` and ticket not paid, `short_code` is hidden.

- POST `/tickets/pay`
  - Purpose: Mark ticket paid (dev placeholder), associate purchase, send ticket email.
  - Body: `PayRequest { event_id?: int, code?: string, token?: string }`
  - Response: `PayResponse { ticket_id, event_id, short_code, payment_status, status }`

- POST `/tickets/resend_payment`
  - Purpose: Resend payment link email.
  - Body: `ResendRequest { ticket_id: int }`
  - Response: `{ resent: true }`

- POST `/tickets/resend_ticket`
  - Purpose: Resend ticket email (requires paid/waived and a short_code).
  - Body: `ResendRequest { ticket_id: int }`
  - Response: `{ resent: true }`

Contacts
- GET `/contacts?search?=string&roles?=buyer,holder&limit?=50&offset?=0`
  - Purpose: List contacts with counts and last activity.
  - Response: `[{ id, first_name, last_name, email, phone, events_purchased, tickets_held, last_activity }]`

- GET `/contacts/{id}`
  - Purpose: Contact profile summary.
  - Response: `{ id, first_name, last_name, email, phone, buyer: { events: [{ event_id, title, tickets }] }, holder: { tickets_count } }`

- GET `/contacts/{id}/purchases?event_id?=int`
  - Purpose: Purchases by contact (optionally filtered by event).
  - Response: `[{ id, external_payment_ref, total_amount, currency, created_at, tickets }]` where `tickets` is count.

- GET `/contacts/{id}/holder_tickets`
  - Purpose: Tickets where contact is holder.
  - Response: `[{ id, ticket_number, short_code, payment_status, status, checked_in_at, event_id, event_title, event_starts_at, event_ends_at, type_id, type_name }]`

Purchases
- GET `/purchases/{id}`
  - Purpose: Purchase detail with buyer and line items.
  - Response: `PurchaseRead { id, buyer: { id, first_name, last_name, email, phone }, external_payment_ref?, total_amount?, currency?, created_at?, tickets: PurchaseTicket[] }`
  - `PurchaseTicket { id, event_id, event_title, event_starts_at, event_ends_at, ticket_number, short_code, status, payment_status, type_id, type_name }`
  - Example
    - Response
      ```json
      {
        "id": 77,
        "buyer": {
          "id": 15,
          "first_name": "Alex",
          "last_name": "Ng",
          "email": "buyer@example.com",
          "phone": null
        },
        "external_payment_ref": null,
        "total_amount": 120000,
        "currency": "THB",
        "created_at": "2024-09-25T12:34:56Z",
        "tickets": [
          {
            "id": 501,
            "event_id": 12,
            "event_title": "Tech Conf BKK",
            "event_starts_at": "2024-10-10T09:00:00+07:00",
            "event_ends_at": "2024-10-10T17:00:00+07:00",
            "ticket_number": "A-00123",
            "short_code": "ABC",
            "status": "assigned",
            "payment_status": "unpaid",
            "type_id": 31,
            "type_name": "General"
          }
        ]
      }
      ```

Content / Checkout
- POST `/content/checkout`
  - Purpose: Single-ticket checkout (dev/test).
  - Body: `CheckoutRequest { event_id, ticket_type_id, customer: { email, first_name?, last_name?, phone? } }`
  - Response: `CheckoutResponse { ticket_id, event_id, ticket_type_id, email, token }`

- POST `/content/checkout_multi`
  - Purpose: Multi-item purchase; creates purchase + multiple unpaid tickets with holders.
  - Body: `MultiCheckoutRequest { event_id, buyer: { email, first_name?, last_name?, phone? }, items: [{ ticket_type_id, assignees: [{ email, first_name?, last_name? }] }] }`
  - Response: `MultiCheckoutResponse { purchase_id, ticket_ids }`
  - Example
    - Request
      ```json
      {
        "event_id": 12,
        "buyer": {"email": "buyer@example.com", "first_name": "Alex", "last_name": "Ng"},
        "items": [
          {"ticket_type_id": 31, "assignees": [
            {"email": "sam@example.com", "first_name": "Sam"},
            {"email": "lee@example.com", "first_name": "Lee"}
          ]},
          {"ticket_type_id": 32, "assignees": [
            {"email": "pat@example.com"}
          ]}
        ]
      }
      ```
    - Response
      ```json
      {"purchase_id": 77, "ticket_ids": [501, 502, 503]}
      ```

Events
- GET `/events?limit?=50&offset?=0`
  - Response: `EventRead[]`
- POST `/events`
  - Body: `EventCreate`
  - Response: `EventRead`
- GET `/events/{event_id}`
  - Response: `EventRead`
- PATCH `/events/{event_id}`
  - Body: `EventUpdate`
  - Response: `EventRead`
- POST `/events/{event_id}/seed`
  - Purpose: Top up available tickets to capacity.
  - Response: `{ event_id, capacity, existing, created }`
- GET `/events/{event_id}/tickets?status?=assigned|available|checked_in|void`
  - Response: `TicketRead[]`
- GET `/events/{event_id}/attendees`
  - Response: `AttendeeRead[]`
- GET `/events/{event_id}/ticket_types`
  - Response: `TicketTypeRead[]`
- POST `/events/{event_id}/ticket_types`
  - Body: `TicketTypeCreate`
  - Response: `TicketTypeRead`
- GET `/events/public/{public_id}`
  - Response: `EventRead`
- GET `/events/{event_id}/promotion`
  - Response: `EventPromotionRead`
- PUT `/events/{event_id}/promotion`
  - Body: `EventPromotionUpsert`
  - Response: `EventPromotionRead`

Check-in
- POST `/checkin`
  - Body: `CheckinRequest { event_id, code }`
  - Response: `CheckinResponse { ticket_id, event_id, short_code, previous_status, new_status, checked_in_at }`

Schemas
- See `backend/app/schemas/*.py` for field types and validation rules.
