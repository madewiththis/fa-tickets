
# Project: Sell Seminar App

## Summary
- Sell FA seminar tickets via phone, HubSpot form, email, call, and chat in advance.
- Create events with ticket inventories to sell/assign.
- Customer receives a ticket via email containing a 3-digit code.
- Manual payment verification in early phases.

## Objectives (MVP)
- Event management: create/update events and ticket inventory per event.
- Ticket assignment: sellers assign tickets to customers and capture minimal customer info.
- Ticket delivery: email tickets with unique 3-digit codes; allow resend.
- Check-in: enter 3-digit code and mark attendance; show who has/hasn’t checked in.
- Reconciliation: counts of capacity, sold/assigned, delivered, checked-in; simple export.

## Out of Scope (for now)
- Online self-checkout and card processing.
- Seat selection and complex pricing rules.
- Automated refunds/chargebacks.
- Multi-tenant orgs and advanced permissions.

## Users & Roles
- Single role (MVP): Seller with full admin permissions. Future roles (admin/check-in) can be split later.

## Core Entities (initial)
- customers
- people
- event
- tickets

## Key Use Cases
- Sellers assign a ticket to a customer and send it.
- Staff select event and enter 3-digit code at entry to mark attendance.
- Admin/Seller view for availability, sold, and reconciliation.

## Reporting & Reconciliation
- Tickets available vs. sold/assigned per event.
- Delivered emails vs. bounces (basic visibility).
- Checked-in vs. not checked-in.
- Simple CSV export for accounting.

## Open Questions
- Which email provider to use (e.g., Gmail API now; SES/SendGrid later) and template strategy?
- HubSpot integration depth (form embed vs. sync; bidirectional?)
- Check-in UX details: keypad layout, error states, duplicate entries, code length (3 vs 4) and leading zeros.
- Minimal customer data required (name, email, phone)?
- Timezones and event locations handling?

## Plan Overview
1) Foundations: finalize MVP scope, choose tech stack, define data model.
2) Core: events + ticket inventory + seller assignment UI.
3) Delivery: email tickets with 3-digit code + resend flow.
4) Check-in: code entry UI + attendee status + summaries.
5) Recon: dashboards + CSV export + basic audit trail.
6) Integrations: HubSpot form sync and light automation.

## Docs Output
- tech-stack.md
- dbs_structure.md
- information-architecture.md
- roadmap.md
 - implementation-plan.md
