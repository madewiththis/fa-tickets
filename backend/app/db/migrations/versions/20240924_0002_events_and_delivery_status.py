from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = '20240924_0002'
down_revision = '20240924_0001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1) Event table changes
    # Rename column `location` -> `location_name`
    with op.batch_alter_table('event') as batch_op:
        # Rename existing column
        batch_op.alter_column('location', new_column_name='location_name', existing_type=sa.String(length=255), existing_nullable=True)
        # Add new fields
        batch_op.add_column(sa.Column('location_address', postgresql.JSONB(astext_type=sa.Text()), nullable=True))
        batch_op.add_column(sa.Column('address_maps_link', sa.String(length=1024), nullable=True))
        batch_op.add_column(sa.Column('location_getting_there', sa.Text(), nullable=True))
        batch_op.add_column(sa.Column('contact_phone', sa.String(length=64), nullable=True))
        batch_op.add_column(sa.Column('contact_email', sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column('contact_url', sa.String(length=1024), nullable=True))

    # 2) Ticket table: add delivery_status and migrate existing data
    delivery_status = sa.Enum('not_sent', 'sent', 'bounced', name='delivery_status')
    delivery_status.create(op.get_bind(), checkfirst=True)

    op.add_column('ticket', sa.Column('delivery_status', delivery_status, nullable=False, server_default='not_sent'))

    # Mark tickets that were previously in 'delivered' status as delivery_status='sent'
    op.execute("UPDATE ticket SET delivery_status='sent' WHERE status='delivered'")
    # Normalize status by converting 'delivered' back to 'assigned' now that delivery is tracked separately
    op.execute("UPDATE ticket SET status='assigned' WHERE status='delivered'")


def downgrade() -> None:
    # Revert ticket changes
    op.drop_column('ticket', 'delivery_status')
    # Drop enum type
    delivery_status = sa.Enum('not_sent', 'sent', 'bounced', name='delivery_status')
    delivery_status.drop(op.get_bind(), checkfirst=True)

    # Revert event changes
    with op.batch_alter_table('event') as batch_op:
        batch_op.drop_column('contact_url')
        batch_op.drop_column('contact_email')
        batch_op.drop_column('contact_phone')
        batch_op.drop_column('location_getting_there')
        batch_op.drop_column('address_maps_link')
        batch_op.drop_column('location_address')
        # Rename column back
        batch_op.alter_column('location_name', new_column_name='location', existing_type=sa.String(length=255), existing_nullable=True)
