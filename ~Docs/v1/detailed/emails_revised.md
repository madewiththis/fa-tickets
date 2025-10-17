# Emails — Revised Plan (YAML Spec)

QA Checklist (tick when tested)

Ready to Test

- [x] Reservation Confirmation (Buyer) — id: `reservation_confirmation_buyer`
  - Trigger: Step 2 “Reserve and continue”
- [ ] Reserved Assignment (Holder) — id: `reserved_assignment_holder`
  - Trigger: Step 3 “Assign and finish” after reserve
- [ ] Purchased & Assigned (Holder) — id: `purchased_assigned_holder`
  - Trigger: Send tickets and finish / payment success
- [ ] Reserved Now Paid Activation (Holder) — id: `reserved_now_paid_activation_holder`
  - Trigger: Reserved tickets paid
- [ ] Resent Ticket Link (Holder) — id: `resend_ticket_link`
  - Trigger: Resend ticket link
- [ ] Unassigned Notice (Holder) — id: `unassigned_notice_holder`
  - Trigger: Unassign ticket
- [ ] Refund In Process (Buyer) — id: `refund_in_process_buyer`
  - Trigger: Admin initiates refund

Not Yet Wired

- [ ] Purchase Confirmation (Buyer) — id: `purchase_confirmation_buyer`
  - Trigger: Buy Now completes
- [ ] Unassigned Notice (Buyer) — id: `unassigned_notice_buyer`
  - Trigger: Unassign ticket (buyer copy)

The following YAML defines each email template, recipients, content templates, variables and triggers. This supersedes the informal notes below.

Template Locations (for implementers)

- Renderer: `backend/app/integrations/email/renderer.py` (loads `.subject.j2`, `.txt.j2`, `.html.j2` files)
- Registry (id → code): `backend/app/integrations/email/registry.py`
  - Example codes: `000_test_email`, `001_confirm_ticket_reservation`, `002_reserved_assignment_holder`, `003_ticket_email`, `004_unassign_email`, `005_refund_initiated_email`
- Templates directory: `backend/app/integrations/email/templates/`
  - Example files: `001_confirm_ticket_reservation.subject.j2`, `.txt.j2`, `.html.j2`
- Orchestrator (send + log): `backend/app/services/emailer.py`
  - Uses `send_and_log` in `backend/app/integrations/email/service.py` → writes to `email_log`
- Test email endpoint: `POST /test_email` (uses template id `test_email` → code `000_test_email`)
  - Admin UI: App Admin → Email Logs → “Send test email”

---
emails:
  - id: reservation_confirmation_buyer
    persona: ticket_buyer
    template_name: confirm_ticket_reservation
    status: active
    subject_template: "Reservation confirmed: {event_title}"
    body_template: |
      You have reserved {ticket_count} tickets to {event_title}.
      Your reservation will expire on {reservation_expires_at}.

      Event Details
      {event_title}
      {event_datetime}

      Tickets
      {ticket_lines}
      Total due: {total_thb}

      {secure_payment_link}
    variables:
      - { name: event_title, type: string }
      - { name: event_datetime, type: string, example: "26/09/2025 9:00am to 28/09/2025 6:00pm" }
      - { name: ticket_count, type: integer }
      - { name: ticket_lines, type: text, description: "One line per type: '<qty> x <name> — <price> THB each'" }
      - { name: total_thb, type: currency, example: "3,500 THB" }
      - { name: reservation_expires_at, type: datetime }
      - { name: secure_payment_link, type: url, example: "https://app/pay?token=..." }
    triggers:
      - when: Buyer chooses “Reserve and continue” (Step 2)
        source: frontend/src/pages/MultiPurchasePage.tsx (Step 2)
        backend: POST /content/reserve_confirm -> templates.confirm_ticket_reservation

  - id: reserved_assignment_holder
    persona: ticket_holder
    template_name: ticket_assigned_reserved
    status: planned
    subject_template: "Ticket reserved for you: {event_title}"
    body_template: |
      {buyer_name} has reserved a {ticket_type_name} ticket for you to {event_title}.
      Your reservation will expire on {reservation_expires_at} unless payment is completed.

      Event Details
      {event_title}
      {event_datetime}

      Tickets
      {ticket_lines}
      Total due: {total_thb}

      Ticket Details
      Ticket Number: —
      {view_ticket_link}
    variables:
      - { name: buyer_name, type: string }
      - { name: ticket_type_name, type: string }
      - { name: reservation_expires_at, type: datetime }
      - { name: event_title, type: string }
      - { name: event_datetime, type: string }
      - { name: ticket_lines, type: text }
      - { name: total_thb, type: currency }
      - { name: view_ticket_link, type: url }
    triggers:
      - when: Buyer clicks “Assign and finish” after reserving (Step 3)
        source: frontend/src/pages/MultiPurchasePage.tsx (Step 3)
        backend: to be implemented

  - id: purchase_confirmation_buyer
    persona: ticket_buyer
    template_name: purchase_confirmation
    status: planned
    subject_template: "Purchase confirmed: {event_title}"
    body_template: |
      You have purchased {ticket_count} tickets to {event_title}.

      Event Details
      {event_title}
      {event_datetime}

      Tickets
      {ticket_lines}
      Total: {total_thb}

      {invoice_link}
    variables:
      - { name: ticket_count, type: integer }
      - { name: invoice_link, type: url }
      - { name: event_title, type: string }
      - { name: event_datetime, type: string }
      - { name: ticket_lines, type: text }
      - { name: total_thb, type: currency }
    triggers:
      - when: Buyer chooses “Buy now” and payment completes
        backend: POST /tickets/pay or purchase flow

  - id: purchased_assigned_holder
    persona: ticket_holder
    template_name: ticket_email
    status: active
    subject_template: "Your ticket for {event_title}"
    body_template: |
      {buyer_name} has purchased a {ticket_type_name} ticket for you to {event_title}.

      Event Details
      {event_title}
      {event_datetime}

      Ticket Details
      Ticket Number: {ticket_number}
      {view_ticket_link}
      {qr_image_url}
    variables:
      - { name: buyer_name, type: string }
      - { name: ticket_type_name, type: string }
      - { name: ticket_number, type: string }
      - { name: view_ticket_link, type: url }
      - { name: qr_image_url, type: url }
      - { name: event_title, type: string }
      - { name: event_datetime, type: string }
    triggers:
      - when: Buyer clicks “Send tickets and finish” after purchase
        backend: ticket issuance (paid) -> templates.ticket_email
      - when: Payment completed for token -> POST /tickets/pay

  - id: reserved_now_paid_activation_holder
    persona: ticket_holder
    template_name: ticket_email
    status: active
    subject_template: "Your {ticket_type_name} ticket is now active — {event_title}"
    body_template: |
      Your {ticket_type_name} ticket for {event_title} is now active.

      Event Details
      {event_title}
      {event_datetime}

      Ticket Details
      Ticket Number: {ticket_number}
      {view_ticket_link}
      {qr_image_url}
    variables:
      - { name: ticket_type_name, type: string }
      - { name: ticket_number, type: string }
      - { name: view_ticket_link, type: url }
      - { name: qr_image_url, type: url }
      - { name: event_title, type: string }
      - { name: event_datetime, type: string }
    triggers:
      - when: Reserved tickets are paid -> POST /tickets/pay

  - id: resend_ticket_link
    persona: ticket_holder
    template_name: ticket_email
    status: active
    subject_template: "Your ticket link — {event_title}"
    body_template: |
      Your {ticket_type_name} ticket for {event_title} is active.

      Event Details
      {event_title}
      {event_datetime}

      Ticket Details
      Ticket Number: {ticket_number}
      {view_ticket_link}
      {qr_image_url}
    variables:
      - { name: ticket_type_name, type: string }
      - { name: ticket_number, type: string }
      - { name: view_ticket_link, type: url }
      - { name: qr_image_url, type: url }
      - { name: event_title, type: string }
      - { name: event_datetime, type: string }
    triggers:
      - when: User requests resend -> POST /tickets/resend_ticket

  - id: unassigned_notice_holder
    persona: ticket_holder
    template_name: unassign_email
    status: active
    subject_template: "Ticket unassigned — {event_title}"
    body_template: |
      {buyer_name} has unassigned your {ticket_type_name} ticket for {event_title}.
      If you have any questions please contact {buyer_name}.
      To purchase another ticket, visit {ticket_page_link}.
    variables:
      - { name: buyer_name, type: string }
      - { name: ticket_type_name, type: string }
      - { name: ticket_page_link, type: url }
      - { name: event_title, type: string }
    triggers:
      - when: Unassign ticket -> POST /tickets/unassign

  - id: unassigned_notice_buyer
    persona: ticket_buyer
    template_name: buyer_unassigned_notice
    status: planned
    subject_template: "You unassigned {count} ticket(s) — {event_title}"
    body_template: |
      You have unassigned {count} × {ticket_type_name} ticket(s) for {event_title}.
      The ticket was previously assigned to {holder_name}.
    variables:
      - { name: count, type: integer }
      - { name: ticket_type_name, type: string }
      - { name: holder_name, type: string }
      - { name: event_title, type: string }
    triggers:
      - when: Unassign ticket -> POST /tickets/unassign (add buyer notice)

  - id: refund_in_process_buyer
    persona: ticket_buyer
    template_name: refund_initiated_email
    status: active
    subject_template: "Refund initiated — Purchase {purchase_number}"
    body_template: |
      Your refund for purchase {purchase_number} is now in process.

      Purchase details
      {purchase_lines}
      Total: {total_thb}
    variables:
      - { name: purchase_number, type: string }
      - { name: purchase_lines, type: text }
      - { name: total_thb, type: currency }
    triggers:
      - when: Admin initiates refund -> POST /tickets/refund
---

Legacy notes below will be kept until all templates are implemented.

## Reservation
- trigger: user has clicked on 'step 2 'reserve and continue'
- to: ticket_buyer (only)
- content:
  - you have reserved {#} tickets to {event name}
  - your reservation will expire on {expiry date/time}

Event Details:
- {title}
- {dates and time}

Tickets:
- # x {ticket-types} - {amount} each
- # x {ticket-types} - {amount} each
- total: {total due}

{link: click here to secure your tickets}

## Ticket Assigned
- trigger: user has clicked on 'step 3 'assign and finish'
- to: ticket_holders
- content:
  - {ticket-buyer} has reserved a {ticket-type} ticket for you to {event name}
  - your tickets reservation will expire on {expiry date/time} unless payment has been made.

Event Details:
- {title}
- {dates and time}

Tickets:
- # x {ticket-types} - {amount} each
- total: {total due}

Ticket Details
- Ticket Number:
- {link: click here to see your ticket}

We look forward to seeing you at the event.

## Refund In Process
- trigger: refund has been initated by admin
- prereq: ticket had been paid and refund has been initiated in admin
- to: ticket_buyer
- content:
  - your refund for purchase {purchase no} is now in process.

Purchase details:
- # x {ticket_type}
- # x {ticket_type}
- ...
- Total: {### thb}

## Ticket Unassigned by Buyer
- trigger: user has unassigned a ticket
- prereq: ticket had previously been assigned to a person
- to: ticket_holder
- content:
  - {ticker_buyer} has unassigned your{ticket-type} ticket for {event name}.
  - if you have any questions please contact {ticket_buyer}
  - if you would like to buy another ticket please visit {ticket_page}

## Ticket Unassigned by Buyer
- trigger: user has unassigned a ticket
- prereq: ticket had previously been assigned to a person
- to: ticket_buyer
- content:
  - you have unassigned # x {ticket-type} ticket(s) for {event name}.
  - the ticket was previous assigned to {ticket-holder}

## Resent Ticket Link
- trigger: user has requested ticket link to be resent
- to: ticket_holders
- content:
  - Your{ticket-type} ticket for {event name} is now active

Event Details:
- {title}
- {dates and time}

Ticket Details
- Ticket Number:
- {link: click here to see your ticket}
- [qr code of ticket number]

We look forward to seeing you at the event.

## Buy later ticket reserved is not paid
- trigger: user has now paid for reserved tickets
- to: ticket_holders
- content:
  - Your{ticket-type} ticket for {event name} is now active

Event Details:
- {title}
- {dates and time}

Ticket Details
- Ticket Number:
- {link: click here to see your ticket}
- [qr code of ticket number]

We look forward to seeing you at the event.

## Purchase
- trigger: user has clicked on 'step 2 'buy now and continue'
- prereq: user has purchased not buy later
- to: ticket_buyer (only)
- content:
  - you have purchase {#} tickets to {event name}

Event Details:
- {title}
- {dates and time}

Tickets:
- # x {ticket-types} - {amount} each
- # x {ticket-types} - {amount} each
- total: {total due}

{invoice link: click here to download your invoice}

We look forward to seeing you at the event.

## Purchased Ticket has been and Assigned
- trigger: user has clicked on 'step 3 'send tickets and finish'
- prereq: user has purchased not buy later
- to: ticket_holders
- content:
  - {ticket-buyer} has purchased a {ticket-type} ticket for you to {event name}

Event Details:
- {title}
- {dates and time}

Ticket Details
- Ticket Number:
- {link: click here to see your ticket}
- [qr code of ticket number]

We look forward to seeing you at the event.
