TEMPLATE_CODES = {
    'test_email': '000_test_email',
    'reservation_confirmation_buyer': '001_confirm_ticket_reservation',
    'reserved_assignment_holder': '002_reserved_assignment_holder',
    'ticket_email': '003_ticket_email',
    'unassign_email': '004_unassign_email',
    'refund_initiated_email': '005_refund_initiated_email',
}


def code_for(template_id: str) -> str:
    if template_id not in TEMPLATE_CODES:
        raise KeyError(f"Unknown template id: {template_id}")
    return TEMPLATE_CODES[template_id]
