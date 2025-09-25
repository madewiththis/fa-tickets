from alembic import op
import sqlalchemy as sa


revision = '20240924_0004'
down_revision = '20240924_0003'
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table('event') as batch_op:
        batch_op.add_column(sa.Column('public_id', sa.String(length=64), nullable=True))
        batch_op.create_unique_constraint('uq_event_public_id', ['public_id'])


def downgrade() -> None:
    with op.batch_alter_table('event') as batch_op:
        batch_op.drop_constraint('uq_event_public_id', type_='unique')
        batch_op.drop_column('public_id')

