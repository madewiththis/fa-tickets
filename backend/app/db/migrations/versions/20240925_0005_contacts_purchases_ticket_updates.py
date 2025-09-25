from alembic import op
import sqlalchemy as sa


revision = '20240925_0005'
down_revision = '20240924_0004'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1) Contacts table
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

    # 2) Purchases table
    op.create_table(
        'purchase',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('buyer_contact_id', sa.Integer(), sa.ForeignKey('contact.id', ondelete='CASCADE'), nullable=False),
        sa.Column('external_payment_ref', sa.String(length=100), nullable=True),
        sa.Column('total_amount', sa.Integer(), nullable=True),
        sa.Column('currency', sa.String(length=10), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # 3) Ticket table changes
    op.add_column('ticket', sa.Column('ticket_number', sa.String(length=20), nullable=True))
    op.add_column('ticket', sa.Column('attendance_refunded', sa.Boolean(), nullable=False, server_default=sa.text('false')))
    op.add_column('ticket', sa.Column('holder_contact_id', sa.Integer(), sa.ForeignKey('contact.id', ondelete='SET NULL'), nullable=True))

    # 4) Unique index on event+ticket_number (when present)
    op.create_index(
        'uq_ticket_event_ticket_number',
        'ticket',
        ['event_id', 'ticket_number'],
        unique=True,
        postgresql_where=sa.text('ticket_number IS NOT NULL')
    )

    # 5) Extend payment_status enum with refund/void states
    # Use direct SQL strings to avoid parameterization issues
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1
                FROM pg_type t
                JOIN pg_enum e ON t.oid = e.enumtypid
                WHERE t.typname = 'payment_status' AND e.enumlabel = 'refunding'
            ) THEN
                ALTER TYPE payment_status ADD VALUE 'refunding';
            END IF;
        END$$;
        """)
    
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1
                FROM pg_type t
                JOIN pg_enum e ON t.oid = e.enumtypid
                WHERE t.typname = 'payment_status' AND e.enumlabel = 'refunded'
            ) THEN
                ALTER TYPE payment_status ADD VALUE 'refunded';
            END IF;
        END$$;
        """)
    
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1
                FROM pg_type t
                JOIN pg_enum e ON t.oid = e.enumtypid
                WHERE t.typname = 'payment_status' AND e.enumlabel = 'voiding'
            ) THEN
                ALTER TYPE payment_status ADD VALUE 'voiding';
            END IF;
        END$$;
        """)
    
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1
                FROM pg_type t
                JOIN pg_enum e ON t.oid = e.enumtypid
                WHERE t.typname = 'payment_status' AND e.enumlabel = 'voided'
            ) THEN
                ALTER TYPE payment_status ADD VALUE 'voided';
            END IF;
        END$$;
        """)


def downgrade() -> None:
    # 1) Drop new index/columns from ticket
    op.drop_index('uq_ticket_event_ticket_number', table_name='ticket')
    op.drop_column('ticket', 'holder_contact_id')
    op.drop_column('ticket', 'attendance_refunded')
    op.drop_column('ticket', 'ticket_number')

    # 2) Drop purchases and contacts
    op.drop_table('purchase')
    op.drop_index('uq_contact_email', table_name='contact')
    op.drop_table('contact')

    # Enum values cannot be easily removed in PostgreSQL; leaving additional values in place is harmless
