import pytest
from datetime import datetime, timezone, timedelta
from httpx import AsyncClient
from sqlalchemy import select, and_

from app.models.match import Match, MatchStatus, ResultStatus, SettlementStatus
from app.models.game import Game, GameMode
from app.models.user import User, UserRole, UserStatus
from app.models.profile import PlayerProfile
from app.models.wallet import Wallet, WalletTransaction
from app.models.result import MatchResult, ResultSubmissionStatus
from app.core.security import create_access_token, hash_password


@pytest.mark.asyncio
async def test_critical_double_settlement_guard(client: AsyncClient, db_session):
    """
    SECTION 96 — CRITICAL SETTLEMENT TEST
    Run approve result twice.
    Expected: Exactly one prize transaction.
    No duplicate wallet credit.
    Match is SETTLED only once.
    Second attempt returns 400 Bad Request with DuplicateSettlementException.
    """
    now = datetime.now(timezone.utc)

    # 1. Create Game & Mode
    game = Game(id="g_settle", name="Free Fire", slug="free-fire-settle", active=True)
    mode = GameMode(
        id="gm_settle",
        game_id="g_settle",
        name="Clash Squad 2v2",
        slug="clash-squad-settle",
        format="CLASH_SQUAD",
        team_size=2,
        max_players=4,
        requires_teams=True,
        active=True
    )
    db_session.add(game)
    db_session.add(mode)

    # 2. Create Admin User
    admin = User(
        id="usr_admin_settle",
        email="admin_settle@igniteff.test",
        password_hash=hash_password("Admin@123"),
        role=UserRole.ADMIN,
        status=UserStatus.ACTIVE,
        is_verified=True
    )
    db_session.add(admin)

    # 3. Create Winner Player with initial wallet
    winner = User(
        id="usr_winner_settle",
        email="winner@igniteff.test",
        password_hash=hash_password("Pass@123"),
        role=UserRole.PLAYER,
        status=UserStatus.ACTIVE,
        is_verified=True
    )
    winner_profile = PlayerProfile(
        user_id=winner.id,
        display_name="WinnerPlayer",
        free_fire_uid="777888999",
        free_fire_name="WinnerFF"
    )
    winner_wallet = Wallet(
        user_id=winner.id,
        currency="INR",
        available_balance_minor=1000,  # ₹10.00
        winning_balance_minor=0,
        locked_balance_minor=0
    )
    db_session.add(winner)
    db_session.add(winner_profile)
    db_session.add(winner_wallet)

    # 4. Create Match in AWAITING_RESULT
    match = Match(
        id="m_settle_100",
        public_match_code="FF-SETTLE",
        game_id="g_settle",
        mode_id="gm_settle",
        map_name="Bermuda",
        match_format="2v2",
        entry_fee_minor=5000,
        prize_pool_minor=35000,  # ₹350.00
        currency="INR",
        max_players=4,
        current_players=4,
        registration_start_at=now - timedelta(hours=2),
        registration_close_at=now - timedelta(hours=1),
        match_start_at=now - timedelta(minutes=30),
        room_release_at=now - timedelta(minutes=40),
        status=MatchStatus.AWAITING_RESULT.value,
        result_status=ResultStatus.SUBMITTED.value,
        settlement_status=SettlementStatus.UNSETTLED.value
    )
    db_session.add(match)

    # 5. Create submitted result with winner
    m_result = MatchResult(
        id="res_settle_100",
        match_id=match.id,
        submitted_by_user_id=admin.id,
        status=ResultSubmissionStatus.UNDER_REVIEW.value,
        winner_user_ids=[winner.id],
        notes="Team Alpha Won 4-1"
    )
    db_session.add(m_result)

    await db_session.commit()

    admin_token = create_access_token({"sub": admin.id, "email": admin.email, "role": "ADMIN"})
    headers = {"Authorization": f"Bearer {admin_token}"}

    # 6. First Approval Request
    resp1 = await client.post(f"/api/v1/admin/matches/{match.id}/approve", headers=headers)
    assert resp1.status_code == 200
    data1 = resp1.json()
    assert data1["success"] is True

    # Check winner wallet after first approval
    await db_session.refresh(winner_wallet)
    assert winner_wallet.winning_balance_minor == 35000
    assert winner_wallet.available_balance_minor == 36000  # 1000 + 35000

    # 7. Second Approval Request (Must be rejected)
    resp2 = await client.post(f"/api/v1/admin/matches/{match.id}/approve", headers=headers)
    assert resp2.status_code in (400, 409)

    # 8. Assert Database Invariants: exactly 1 prize transaction created
    tx_stmt = select(WalletTransaction).where(
        and_(
            WalletTransaction.wallet_id == winner_wallet.id,
            WalletTransaction.reference_id == match.id
        )
    )
    transactions = list((await db_session.execute(tx_stmt)).scalars().all())
    assert len(transactions) == 1, f"Expected exactly 1 prize transaction, found {len(transactions)}"
    assert transactions[0].amount_minor == 35000

    # Match settlement_status is SETTLED
    await db_session.refresh(match)
    assert match.settlement_status == SettlementStatus.SETTLED.value
