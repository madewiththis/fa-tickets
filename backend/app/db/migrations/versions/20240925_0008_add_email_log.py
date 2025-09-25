from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '20240925_0008'
down_revision = '20240925_0007'
branch_labels = None
depends_on = None


def upgrade() -> None:
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
        sa.ForeignKeyConstraint(['event_id'], ['event.id'], ),
        sa.ForeignKeyConstraint(['ticket_id'], ['ticket.id'], ),
        sa.ForeignKeyConstraint(['purchase_id'], ['purchase.id'], ),
    )
    op.create_index('ix_email_log_to_email_created', 'email_log', ['to_email', 'created_at'])
    op.create_index('ix_email_log_template_created', 'email_log', ['template_name', 'created_at'])


def downgrade() -> None:
    op.drop_index('ix_email_log_template_created', table_name='email_log')
    op.drop_index('ix_email_log_to_email_created', table_name='email_log')
    op.drop_table('email_log')

