from alembic import op
import sqlalchemy as sa


revision = '20240925_0006'
down_revision = '20240925_0005'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Insert contacts for existing customers (by email)
    op.execute(
        """
        INSERT INTO contact (email, first_name, last_name, phone)
        SELECT DISTINCT c.email, c.first_name, c.last_name, c.phone
        FROM customer c
        WHERE c.email IS NOT NULL
        ON CONFLICT (email) DO NOTHING
        """
    )

    # Link tickets to holder_contact_id via customer.email
    op.execute(
        """
        UPDATE ticket t
        SET holder_contact_id = ct.id
        FROM customer cu
        JOIN contact ct ON lower(ct.email) = lower(cu.email)
        WHERE t.customer_id = cu.id
          AND t.holder_contact_id IS NULL
        """
    )


def downgrade() -> None:
    # No-op: we leave backfilled contacts and links in place
    pass

