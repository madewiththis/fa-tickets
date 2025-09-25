from alembic import op
import sqlalchemy as sa

revision = '20240925_0010'
down_revision = '20240925_0009'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('purchase', sa.Column('uuid', sa.String(length=36), nullable=True))


def downgrade() -> None:
    op.drop_column('purchase', 'uuid')

