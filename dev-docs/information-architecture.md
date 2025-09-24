# Information Architecture (Draft)

High-level structure for users, flows, and data.

## Roles
- Single role (MVP): Seller with full admin permissions. Future roles (admin/check-in) can be split later if needed.

## Core Flows
1) Create Event
   - Define event details (title, time, location) and capacity.
2) Prepare Inventory
   - System seeds tickets (available status) per event.
   - Support maximum number of tickets per event (and per ticket type if used).
3) Assign Ticket
   - Seller captures customer info and assigns ticket.
4) Deliver Ticket
   - System emails the 3-digit code to the customer; allow resend.
5) Check-in
   - Select event → enter 3-digit code → confirm attendee → mark checked_in.
6) Reconciliation
   - View counts (capacity, assigned, delivered, checked_in) and export CSV.

## Data Flow (Simplified)
- App → Email Provider → Customer inbox (3-digit code delivery)
- Check-in UI → App → Ticket status updated

## Navigation (MVP)
- Events: list, create, edit
- Tickets: per-event inventory and status
- Assign: simple form to assign + send
- Check-in: code entry view + attendee list
- Reports: reconciliation summary + export
