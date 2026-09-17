"""add room_release and identity cols

Revision ID: 002_matches_update
Revises: 001_initial_schema
Create Date: 2026-09-17 21:50:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic (max 32 characters!)
revision = '002_matches_update'
down_revision = '001_initial_schema'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Add missing columns to matches table
    op.add_column('matches', sa.Column('room_release_status', sa.String(length=20), server_default='PENDING', nullable=False))
    op.add_column('matches', sa.Column('health_state', sa.String(length=20), server_default='HEALTHY', nullable=False))
    op.create_index('ix_matches_room_release_status', 'matches', ['room_release_status'])
    op.create_index('ix_matches_health_state', 'matches', ['health_state'])

    # 2. Add gaming_identity_id and tracking columns to match_registrations
    op.add_column('match_registrations', sa.Column('gaming_identity_id', sa.String(length=36), sa.ForeignKey('gaming_identities.id', ondelete='SET NULL'), nullable=True))
    op.add_column('match_registrations', sa.Column('confirmed_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('match_registrations', sa.Column('cancelled_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('match_registrations', sa.Column('registration_source', sa.String(length=50), server_default='MOBILE_APP', nullable=False))
    op.create_index('ix_match_registrations_gaming_identity_id', 'match_registrations', ['gaming_identity_id'])


def downgrade() -> None:
    op.drop_index('ix_match_registrations_gaming_identity_id', table_name='match_registrations')
    op.drop_column('match_registrations', 'registration_source')
    op.drop_column('match_registrations', 'cancelled_at')
    op.drop_column('match_registrations', 'confirmed_at')
    op.drop_column('match_registrations', 'gaming_identity_id')

    op.drop_index('ix_matches_health_state', table_name='matches')
    op.drop_index('ix_matches_room_release_status', table_name='matches')
    op.drop_column('matches', 'health_state')
    op.drop_column('matches', 'room_release_status')
