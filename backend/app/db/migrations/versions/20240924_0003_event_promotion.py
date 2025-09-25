from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = '20240924_0003'
down_revision = '20240924_0002'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'event_promotion',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('event_id', sa.Integer(), sa.ForeignKey('event.id', ondelete='CASCADE'), nullable=False),
        sa.Column('content', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('ix_event_promotion_event_id', 'event_promotion', ['event_id'], unique=True)


def downgrade() -> None:
    op.drop_index('ix_event_promotion_event_id', table_name='event_promotion')
    op.drop_table('event_promotion')

