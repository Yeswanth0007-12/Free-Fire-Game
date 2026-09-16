"""Initial tournament platform schema

Revision ID: 001_initial_schema
Revises: 
Create Date: 2026-09-16 10:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '001_initial_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Users table
    op.create_table(
        'users',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('email', sa.String(length=255), nullable=False, unique=True),
        sa.Column('phone', sa.String(length=32), nullable=True, unique=True),
        sa.Column('password_hash', sa.String(length=255), nullable=False),
        sa.Column('role', sa.String(length=50), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False),
        sa.Column('is_verified', sa.Boolean(), nullable=False, default=False),
        sa.Column('last_login_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_users_email', 'users', ['email'])
    op.create_index('ix_users_role', 'users', ['role'])
    op.create_index('ix_users_status', 'users', ['status'])

    # Player Profiles table
    op.create_table(
        'player_profiles',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('user_id', sa.String(length=36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, unique=True),
        sa.Column('display_name', sa.String(length=100), nullable=False),
        sa.Column('avatar_url', sa.String(length=500), nullable=True),
        sa.Column('free_fire_uid', sa.String(length=50), nullable=False, unique=True),
        sa.Column('free_fire_name', sa.String(length=100), nullable=False),
        sa.Column('preferred_game', sa.String(length=50), nullable=False, default='Free Fire'),
        sa.Column('total_matches', sa.Integer(), nullable=False, default=0),
        sa.Column('total_wins', sa.Integer(), nullable=False, default=0),
        sa.Column('total_losses', sa.Integer(), nullable=False, default=0),
        sa.Column('total_winnings_minor', sa.BigInteger(), nullable=False, default=0),
        sa.Column('current_streak', sa.Integer(), nullable=False, default=0),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_player_profiles_free_fire_uid', 'player_profiles', ['free_fire_uid'])

    # Games table
    op.create_table(
        'games',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('slug', sa.String(length=100), nullable=False, unique=True),
        sa.Column('active', sa.Boolean(), nullable=False, default=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )

    # Game Modes table
    op.create_table(
        'game_modes',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('game_id', sa.String(length=36), sa.ForeignKey('games.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('slug', sa.String(length=100), nullable=False, unique=True),
        sa.Column('format', sa.String(length=50), nullable=False),
        sa.Column('team_size', sa.Integer(), nullable=False, default=1),
        sa.Column('min_players', sa.Integer(), nullable=False, default=2),
        sa.Column('max_players', sa.Integer(), nullable=False, default=8),
        sa.Column('requires_teams', sa.Boolean(), nullable=False, default=True),
        sa.Column('active', sa.Boolean(), nullable=False, default=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )

    # Matches table
    op.create_table(
        'matches',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('public_match_code', sa.String(length=32), nullable=False, unique=True),
        sa.Column('game_id', sa.String(length=36), sa.ForeignKey('games.id'), nullable=False),
        sa.Column('mode_id', sa.String(length=36), sa.ForeignKey('game_modes.id'), nullable=False),
        sa.Column('map_name', sa.String(length=100), nullable=False, default='Bermuda'),
        sa.Column('match_format', sa.String(length=50), nullable=False),
        sa.Column('entry_fee_minor', sa.BigInteger(), nullable=False, default=0),
        sa.Column('prize_pool_minor', sa.BigInteger(), nullable=False, default=0),
        sa.Column('currency', sa.String(length=3), nullable=False, default='INR'),
        sa.Column('prize_distribution', sa.JSON(), nullable=False),
        sa.Column('max_players', sa.Integer(), nullable=False),
        sa.Column('current_players', sa.Integer(), nullable=False, default=0),
        sa.Column('max_teams', sa.Integer(), nullable=False, default=2),
        sa.Column('registration_start_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('registration_close_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('match_start_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('result_deadline_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('room_release_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('room_id_encrypted', sa.Text(), nullable=True),
        sa.Column('room_password_encrypted', sa.Text(), nullable=True),
        sa.Column('host_id', sa.String(length=36), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('team_assignment_mode', sa.String(length=50), nullable=False, default='AUTO'),
        sa.Column('status', sa.String(length=50), nullable=False, default='SCHEDULED'),
        sa.Column('result_status', sa.String(length=50), nullable=False, default='PENDING'),
        sa.Column('settlement_status', sa.String(length=50), nullable=False, default='UNSETTLED'),
        sa.Column('rules_text', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_matches_status', 'matches', ['status'])
    op.create_index('ix_matches_start_at', 'matches', ['match_start_at'])

    # Teams table
    op.create_table(
        'teams',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('match_id', sa.String(length=36), sa.ForeignKey('matches.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('slot_number', sa.Integer(), nullable=False),
        sa.Column('captain_registration_id', sa.String(length=36), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=False, default='ACTIVE'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )

    # Match Registrations table
    op.create_table(
        'match_registrations',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('match_id', sa.String(length=36), sa.ForeignKey('matches.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', sa.String(length=36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('team_id', sa.String(length=36), sa.ForeignKey('teams.id', ondelete='SET NULL'), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=False, default='RESERVED'),
        sa.Column('slot_number', sa.Integer(), nullable=False),
        sa.Column('reserved_until', sa.DateTime(timezone=True), nullable=True),
        sa.Column('payment_id', sa.String(length=36), nullable=True),
        sa.Column('entry_fee_minor', sa.BigInteger(), nullable=False, default=0),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint('match_id', 'slot_number', name='uq_match_slot')
    )

    # Team Members table
    op.create_table(
        'team_members',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('team_id', sa.String(length=36), sa.ForeignKey('teams.id', ondelete='CASCADE'), nullable=False),
        sa.Column('registration_id', sa.String(length=36), sa.ForeignKey('match_registrations.id', ondelete='CASCADE'), nullable=False, unique=True),
        sa.Column('user_id', sa.String(length=36), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('joined_at', sa.DateTime(timezone=True), nullable=False),
    )

    # Wallets table
    op.create_table(
        'wallets',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('user_id', sa.String(length=36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, unique=True),
        sa.Column('currency', sa.String(length=3), nullable=False, default='INR'),
        sa.Column('available_balance_minor', sa.BigInteger(), nullable=False, default=0),
        sa.Column('locked_balance_minor', sa.BigInteger(), nullable=False, default=0),
        sa.Column('winning_balance_minor', sa.BigInteger(), nullable=False, default=0),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )

    # Wallet Transactions table
    op.create_table(
        'wallet_transactions',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('wallet_id', sa.String(length=36), sa.ForeignKey('wallets.id', ondelete='CASCADE'), nullable=False),
        sa.Column('type', sa.String(length=50), nullable=False),
        sa.Column('amount_minor', sa.BigInteger(), nullable=False),
        sa.Column('direction', sa.String(length=20), nullable=False),
        sa.Column('balance_after_minor', sa.BigInteger(), nullable=False),
        sa.Column('reference_type', sa.String(length=50), nullable=False),
        sa.Column('reference_id', sa.String(length=100), nullable=False),
        sa.Column('idempotency_key', sa.String(length=150), nullable=False, unique=True),
        sa.Column('description', sa.String(length=255), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False, default='SUCCESS'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_wallet_transactions_key', 'wallet_transactions', ['idempotency_key'])
    op.create_index('ix_wallet_transactions_ref', 'wallet_transactions', ['reference_type', 'reference_id'])

    # Payments table
    op.create_table(
        'payments',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('user_id', sa.String(length=36), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('match_id', sa.String(length=36), sa.ForeignKey('matches.id'), nullable=True),
        sa.Column('registration_id', sa.String(length=36), sa.ForeignKey('match_registrations.id'), nullable=True),
        sa.Column('provider', sa.String(length=50), nullable=False, default='RAZORPAY'),
        sa.Column('provider_order_id', sa.String(length=100), nullable=True),
        sa.Column('provider_payment_id', sa.String(length=100), nullable=True),
        sa.Column('provider_signature', sa.String(length=255), nullable=True),
        sa.Column('amount_minor', sa.BigInteger(), nullable=False),
        sa.Column('currency', sa.String(length=3), nullable=False, default='INR'),
        sa.Column('status', sa.String(length=50), nullable=False, default='CREATED'),
        sa.Column('notes', sa.JSON(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_payments_provider_order_id', 'payments', ['provider_order_id'])

    # Payment Webhook Logs table
    op.create_table(
        'payment_webhook_logs',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('provider', sa.String(length=50), nullable=False, default='RAZORPAY'),
        sa.Column('event_id', sa.String(length=100), nullable=False, unique=True),
        sa.Column('event_type', sa.String(length=100), nullable=False),
        sa.Column('payload', sa.JSON(), nullable=False),
        sa.Column('is_processed', sa.Boolean(), nullable=False, default=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )

    # Match Results table
    op.create_table(
        'match_results',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('match_id', sa.String(length=36), sa.ForeignKey('matches.id', ondelete='CASCADE'), nullable=False, unique=True),
        sa.Column('provider', sa.String(length=50), nullable=False, default='ADMIN_MANUAL'),
        sa.Column('winning_team_id', sa.String(length=36), sa.ForeignKey('teams.id', ondelete='SET NULL'), nullable=True),
        sa.Column('winner_user_ids', sa.JSON(), nullable=False),
        sa.Column('submitted_by_user_id', sa.String(length=36), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('verified_by_user_id', sa.String(length=36), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=False, default='SUBMITTED'),
        sa.Column('scores', sa.JSON(), nullable=False),
        sa.Column('raw_payload', sa.JSON(), nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('submitted_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('verified_at', sa.DateTime(timezone=True), nullable=True),
    )

    # Placement Results table
    op.create_table(
        'placement_results',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('match_result_id', sa.String(length=36), sa.ForeignKey('match_results.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', sa.String(length=36), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('team_id', sa.String(length=36), sa.ForeignKey('teams.id', ondelete='SET NULL'), nullable=True),
        sa.Column('placement', sa.Integer(), nullable=False),
        sa.Column('kills', sa.Integer(), nullable=False, default=0),
        sa.Column('score', sa.Integer(), nullable=False, default=0),
        sa.Column('payout_minor', sa.BigInteger(), nullable=False, default=0),
        sa.Column('is_settled', sa.Boolean(), nullable=False, default=False),
    )

    # Disputes table
    op.create_table(
        'disputes',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('match_id', sa.String(length=36), sa.ForeignKey('matches.id'), nullable=False),
        sa.Column('user_id', sa.String(length=36), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('dispute_type', sa.String(length=50), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False, default='OPEN'),
        sa.Column('resolution_notes', sa.Text(), nullable=True),
        sa.Column('resolved_by_user_id', sa.String(length=36), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('resolved_at', sa.DateTime(timezone=True), nullable=True),
    )

    # Notifications table
    op.create_table(
        'notifications',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('user_id', sa.String(length=36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('type', sa.String(length=50), nullable=False),
        sa.Column('title', sa.String(length=150), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('is_read', sa.Boolean(), nullable=False, default=False),
        sa.Column('related_entity_type', sa.String(length=50), nullable=True),
        sa.Column('related_entity_id', sa.String(length=100), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )

    # Audit Logs table
    op.create_table(
        'audit_logs',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('actor_user_id', sa.String(length=36), nullable=False),
        sa.Column('action', sa.String(length=100), nullable=False),
        sa.Column('target_entity_type', sa.String(length=50), nullable=False),
        sa.Column('target_entity_id', sa.String(length=100), nullable=False),
        sa.Column('before_state', sa.JSON(), nullable=True),
        sa.Column('after_state', sa.JSON(), nullable=True),
        sa.Column('ip_address', sa.String(length=50), nullable=True),
        sa.Column('user_agent', sa.String(length=255), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )

    # Risk Flags table
    op.create_table(
        'risk_flags',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('user_id', sa.String(length=36), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('risk_type', sa.String(length=100), nullable=False),
        sa.Column('severity', sa.String(length=50), nullable=False, default='MEDIUM'),
        sa.Column('details', sa.JSON(), nullable=False),
        sa.Column('resolved', sa.Boolean(), nullable=False, default=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )


def downgrade() -> None:
    op.drop_table('risk_flags')
    op.drop_table('audit_logs')
    op.drop_table('notifications')
    op.drop_table('disputes')
    op.drop_table('placement_results')
    op.drop_table('match_results')
    op.drop_table('payment_webhook_logs')
    op.drop_table('payments')
    op.drop_table('wallet_transactions')
    op.drop_table('wallets')
    op.drop_table('team_members')
    op.drop_table('match_registrations')
    op.drop_table('teams')
    op.drop_table('matches')
    op.drop_table('game_modes')
    op.drop_table('games')
    op.drop_table('player_profiles')
    op.drop_table('users')
