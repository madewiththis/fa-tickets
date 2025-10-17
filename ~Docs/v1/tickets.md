Ticket States and Flow

- States: available, held, assigned, checked_in, void
- Payment: unpaid, paid, waived, refunding, refunded, voiding, voided
- Delivery: not_sent, sent, bounced

State definitions

- available: Inventory placeholder only. Not allocated to a buyer or holder.
- held: Allocated to a buyer but no holder assigned yet. Consumes ticket-type quantity caps. Used when the buyer skips assignment post‑purchase.
- assigned: Holder is set (holder_contact_id) and ticket has a short code. Payment may be unpaid/paid/waived. Emails may or may not have been sent; delivery is tracked separately.
- checked_in: Ticket was validated at the event entrance.
- void: Invalidated ticket (e.g., after refund/void completion).

Payment statuses

- unpaid: No payment received yet (includes Pay later reservations).
- paid: Payment completed.
- waived: No payment required (comped).
- refunding/voiding: A refund/void operation is in progress.
- refunded/voided: Refund/void operation completed.

Delivery statuses

- not_sent: No email sent yet.
- sent: Email successfully sent (e.g., ticket email).
- bounced: Delivery failed.

Typical sequences

1) Pay later + assign now
- available → assigned (unpaid, not_sent) → reserved-assignment email to holder
- Later: unpaid → paid, then ticket email to holder (delivery: sent)

2) Pay later + skip assignment
- available → held (unpaid, not_sent) → reservation email to buyer (from purchase step)
- Later: held → assigned on first assignment action for a holder

3) Buy now + assign now
- available → assigned (paid) → ticket email sent to holder (delivery: sent)

4) Buy now + skip assignment
- available → held (paid) → ticket email(s) sent to buyer (delivery: sent)
- Later: held → assigned on first assignment action

5) Reassign
- assigned (unpaid) → assigned (same code) and send reservation‑style email to new holder
- assigned (paid/waived) → assigned (same code) and send ticket email to new holder

6) Unassign
- Only allowed for unpaid/waived tickets.
- assigned → available (releases number; delivery reset). Sends unassign email to prior holder if we have their email.

Counting & capacity

- Ticket‑type max_quantity counts held, assigned, and checked_in as “used”.
- Reports can show “held” separately from “assigned” if needed; “registered” typically includes assigned + checked_in.

Notes

- We track email delivery separately from status to avoid conflating assignment with delivery.
- “delivered” status exists in the enum for backward compatibility but is not used; delivery_status tracks email sends.
