from alembic import op
import sqlalchemy as sa


revision = '20240925_0007'
down_revision = '20240925_0006'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('ticket', sa.Column('purchase_id', sa.Integer(), sa.ForeignKey('purchase.id', ondelete='SET NULL'), nullable=True))
    op.create_index('ix_ticket_purchase_id', 'ticket', ['purchase_id'])


def downgrade() -> None:
    op.drop_index('ix_ticket_purchase_id', table_name='ticket')
    op.drop_column('ticket', 'purchase_id')

