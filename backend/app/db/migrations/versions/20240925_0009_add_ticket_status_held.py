from alembic import op

revision = '20240925_0009'
down_revision = '20240925_0008'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add new enum value 'held' to ticket_status if it does not exist
    op.execute("ALTER TYPE ticket_status ADD VALUE IF NOT EXISTS 'held'")


def downgrade() -> None:
    # No downgrade for enum value removal in PostgreSQL; safe no-op
    pass

