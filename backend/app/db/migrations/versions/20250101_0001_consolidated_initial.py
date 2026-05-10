"""Consolidated initial migration - contains full schema for fresh deployments.

This migration consolidates all previous migrations (20240924_0001 through 20240925_0010)
into a single initial migration. Use this for new deployments instead of running
all individual migrations sequentially.

For existing databases, continue using the sequential migrations.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = '20250101_0001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create enums using raw SQL to ensure they exist
    # Then create enum objects with create_type=False for use in tables
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'person_role') THEN
                CREATE TYPE person_role AS ENUM ('admin', 'seller', 'checker');
            END IF;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ticket_status') THEN
                CREATE TYPE ticket_status AS ENUM ('available', 'held', 'assigned', 'delivered', 'checked_in', 'void');
            END IF;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
                CREATE TYPE payment_status AS ENUM ('unpaid', 'paid', 'waived', 'refunding', 'refunded', 'voiding', 'voided');
            END IF;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'delivery_status') THEN
                CREATE TYPE delivery_status AS ENUM ('not_sent', 'sent', 'bounced');
            END IF;
        END $$;
    """)
    
    # Create enum objects for use in table definitions with create_type=False
    # Using postgresql.ENUM directly to have better control
    person_role = postgresql.ENUM('admin', 'seller', 'checker', name='person_role', create_type=False)
    ticket_status = postgresql.ENUM('available', 'held', 'assigned', 'delivered', 'checked_in', 'void', name='ticket_status', create_type=False)
    payment_status = postgresql.ENUM('unpaid', 'paid', 'waived', 'refunding', 'refunded', 'voiding', 'voided', name='payment_status', create_type=False)
    delivery_status = postgresql.ENUM('not_sent', 'sent', 'bounced', name='delivery_status', create_type=False)

    # Event table
    op.create_table(
        'event',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('starts_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('ends_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('location_name', sa.String(length=255), nullable=True),
        sa.Column('location_address', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('address_maps_link', sa.String(length=1024), nullable=True),
        sa.Column('location_getting_there', sa.Text(), nullable=True),
        sa.Column('contact_phone', sa.String(length=64), nullable=True),
        sa.Column('contact_email', sa.String(length=255), nullable=True),
        sa.Column('contact_url', sa.String(length=1024), nullable=True),
        sa.Column('capacity', sa.Integer(), nullable=False),
        sa.Column('public_id', sa.String(length=64), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('uq_event_public_id', 'event', ['public_id'], unique=True)

    # Customer table
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

    # Person table
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

    # Contact table
    op.create_table(
        'contact',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('first_name', sa.String(length=100), nullable=True),
        sa.Column('last_name', sa.String(length=100), nullable=True),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('phone', sa.String(length=50), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('uq_contact_email', 'contact', ['email'], unique=True)

    # Ticket type table
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

    # Purchase table
    op.create_table(
        'purchase',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('buyer_contact_id', sa.Integer(), sa.ForeignKey('contact.id', ondelete='CASCADE'), nullable=False),
        sa.Column('external_payment_ref', sa.String(length=100), nullable=True),
        sa.Column('total_amount', sa.Integer(), nullable=True),
        sa.Column('currency', sa.String(length=10), nullable=True),
        sa.Column('uuid', sa.String(length=36), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # Ticket table
    op.create_table(
        'ticket',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('uuid', postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column('event_id', sa.Integer(), sa.ForeignKey('event.id', ondelete='CASCADE'), nullable=False),
        sa.Column('ticket_type_id', sa.Integer(), sa.ForeignKey('ticket_type.id', ondelete='SET NULL'), nullable=True),
        sa.Column('customer_id', sa.Integer(), sa.ForeignKey('customer.id', ondelete='SET NULL'), nullable=True),
        sa.Column('holder_contact_id', sa.Integer(), sa.ForeignKey('contact.id', ondelete='SET NULL'), nullable=True),
        sa.Column('purchase_id', sa.Integer(), sa.ForeignKey('purchase.id', ondelete='SET NULL'), nullable=True),
        sa.Column('short_code', sa.String(length=3), nullable=True),
        sa.Column('ticket_number', sa.String(length=20), nullable=True),
        sa.Column('status', ticket_status, nullable=False, server_default='available'),
        sa.Column('payment_status', payment_status, nullable=False, server_default='unpaid'),
        sa.Column('delivery_status', delivery_status, nullable=False, server_default='not_sent'),
        sa.Column('attendance_refunded', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('assigned_by_person_id', sa.Integer(), sa.ForeignKey('person.id', ondelete='SET NULL'), nullable=True),
        sa.Column('assigned_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('delivered_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('checked_in_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint('uuid', name='uq_ticket_uuid'),
    )

    # Event promotion table
    op.create_table(
        'event_promotion',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('event_id', sa.Integer(), sa.ForeignKey('event.id', ondelete='CASCADE'), nullable=False),
        sa.Column('content', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # Email log table
    op.create_table(
        'email_log',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('to_email', sa.String(length=255), nullable=False),
        sa.Column('subject', sa.Text(), nullable=False),
        sa.Column('text_body', sa.Text(), nullable=False),
        sa.Column('html_body', sa.Text(), nullable=True),
        sa.Column('template_name', sa.String(length=64), nullable=False),
        sa.Column('context', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('status', sa.String(length=16), nullable=False),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('event_id', sa.Integer(), nullable=True),
        sa.Column('ticket_id', sa.Integer(), nullable=True),
        sa.Column('purchase_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['event_id'], ['event.id']),
        sa.ForeignKeyConstraint(['ticket_id'], ['ticket.id']),
        sa.ForeignKeyConstraint(['purchase_id'], ['purchase.id']),
    )

    # Indexes
    op.create_index('ix_ticket_event_id', 'ticket', ['event_id'])
    op.create_index('ix_ticket_customer_id', 'ticket', ['customer_id'])
    op.create_index('ix_ticket_ticket_type_id', 'ticket', ['ticket_type_id'])
    op.create_index('ix_ticket_purchase_id', 'ticket', ['purchase_id'])
    op.create_index('uq_ticket_event_short_code', 'ticket', ['event_id', 'short_code'], unique=True, postgresql_where=sa.text('short_code IS NOT NULL'))
    op.create_index('uq_ticket_event_ticket_number', 'ticket', ['event_id', 'ticket_number'], unique=True, postgresql_where=sa.text('ticket_number IS NOT NULL'))
    op.create_index('ix_event_promotion_event_id', 'event_promotion', ['event_id'], unique=True)
    op.create_index('ix_email_log_to_email_created', 'email_log', ['to_email', 'created_at'])
    op.create_index('ix_email_log_template_created', 'email_log', ['template_name', 'created_at'])


def downgrade() -> None:
    # Drop indexes
    op.drop_index('ix_email_log_template_created', table_name='email_log')
    op.drop_index('ix_email_log_to_email_created', table_name='email_log')
    op.drop_index('ix_event_promotion_event_id', table_name='event_promotion')
    op.drop_index('uq_ticket_event_ticket_number', table_name='ticket')
    op.drop_index('uq_ticket_event_short_code', table_name='ticket')
    op.drop_index('ix_ticket_purchase_id', table_name='ticket')
    op.drop_index('ix_ticket_ticket_type_id', table_name='ticket')
    op.drop_index('ix_ticket_customer_id', table_name='ticket')
    op.drop_index('ix_ticket_event_id', table_name='ticket')
    op.drop_index('uq_event_public_id', table_name='event')
    op.drop_index('uq_contact_email', table_name='contact')
    op.drop_index('ix_person_email', table_name='person')
    op.drop_index('ix_customer_email', table_name='customer')

    # Drop tables
    op.drop_table('email_log')
    op.drop_table('event_promotion')
    op.drop_table('ticket')
    op.drop_table('purchase')
    op.drop_table('ticket_type')
    op.drop_table('contact')
    op.drop_table('person')
    op.drop_table('customer')
    op.drop_table('event')

    # Drop enums
    delivery_status = sa.Enum('not_sent', 'sent', 'bounced', name='delivery_status')
    payment_status = sa.Enum('unpaid', 'paid', 'waived', 'refunding', 'refunded', 'voiding', 'voided', name='payment_status')
    ticket_status = sa.Enum('available', 'held', 'assigned', 'delivered', 'checked_in', 'void', name='ticket_status')
    person_role = sa.Enum('admin', 'seller', 'checker', name='person_role')
    delivery_status.drop(op.get_bind(), checkfirst=True)
    payment_status.drop(op.get_bind(), checkfirst=True)
    ticket_status.drop(op.get_bind(), checkfirst=True)
    person_role.drop(op.get_bind(), checkfirst=True)

