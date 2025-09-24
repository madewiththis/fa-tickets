from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = '20240924_0001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    person_role = sa.Enum('admin', 'seller', 'checker', name='person_role')
    ticket_status = sa.Enum('available', 'assigned', 'delivered', 'checked_in', 'void', name='ticket_status')
    payment_status = sa.Enum('unpaid', 'paid', 'waived', name='payment_status')

    person_role.create(op.get_bind(), checkfirst=True)
    ticket_status.create(op.get_bind(), checkfirst=True)
    payment_status.create(op.get_bind(), checkfirst=True)

    op.create_table(
        'event',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('starts_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('ends_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('location', sa.String(length=255), nullable=True),
        sa.Column('capacity', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        'customer',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('first_name', sa.String(length=100), nullable=True),
        sa.Column('last_name', sa.String(length=100), nullable=True),
        sa.Column('email', sa.String(length=255), nullable=True),
        sa.Column('phone', sa.String(length=50), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('ix_customer_email', 'customer', ['email'])

    op.create_table(
        'person',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('name', sa.String(length=150), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('role', person_role, nullable=False, server_default='seller'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('ix_person_email', 'person', ['email'])

    op.create_table(
        'ticket_type',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('event_id', sa.Integer(), sa.ForeignKey('event.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('price_baht', sa.Integer(), nullable=True),
        sa.Column('max_quantity', sa.Integer(), nullable=True),
        sa.Column('active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        'ticket',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('uuid', postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column('event_id', sa.Integer(), sa.ForeignKey('event.id', ondelete='CASCADE'), nullable=False),
        sa.Column('ticket_type_id', sa.Integer(), sa.ForeignKey('ticket_type.id', ondelete='SET NULL'), nullable=True),
        sa.Column('customer_id', sa.Integer(), sa.ForeignKey('customer.id', ondelete='SET NULL'), nullable=True),
        sa.Column('short_code', sa.String(length=3), nullable=True),
        sa.Column('status', ticket_status, nullable=False, server_default='available'),
        sa.Column('payment_status', payment_status, nullable=False, server_default='unpaid'),
        sa.Column('assigned_by_person_id', sa.Integer(), sa.ForeignKey('person.id', ondelete='SET NULL'), nullable=True),
        sa.Column('assigned_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('delivered_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('checked_in_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint('uuid', name='uq_ticket_uuid'),
    )

    # Indexes
    op.create_index('ix_ticket_event_id', 'ticket', ['event_id'])
    op.create_index('ix_ticket_customer_id', 'ticket', ['customer_id'])
    op.create_index('ix_ticket_ticket_type_id', 'ticket', ['ticket_type_id'])
    # Partial unique index for event+short_code when short_code is set
    op.create_index(
        'uq_ticket_event_short_code',
        'ticket',
        ['event_id', 'short_code'],
        unique=True,
        postgresql_where=sa.text('short_code IS NOT NULL')
    )


def downgrade() -> None:
    op.drop_index('uq_ticket_event_short_code', table_name='ticket')
    op.drop_index('ix_ticket_ticket_type_id', table_name='ticket')
    op.drop_index('ix_ticket_customer_id', table_name='ticket')
    op.drop_index('ix_ticket_event_id', table_name='ticket')
    op.drop_table('ticket')

    op.drop_table('ticket_type')

    op.drop_index('ix_person_email', table_name='person')
    op.drop_table('person')

    op.drop_index('ix_customer_email', table_name='customer')
    op.drop_table('customer')

    op.drop_table('event')

    # Drop enums
    payment_status = sa.Enum('unpaid', 'paid', 'waived', name='payment_status')
    ticket_status = sa.Enum('available', 'assigned', 'delivered', 'checked_in', 'void', name='ticket_status')
    person_role = sa.Enum('admin', 'seller', 'checker', name='person_role')
    payment_status.drop(op.get_bind(), checkfirst=True)
    ticket_status.drop(op.get_bind(), checkfirst=True)
    person_role.drop(op.get_bind(), checkfirst=True)

