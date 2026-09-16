import pytest
from datetime import datetime, timezone, timedelta
from app.core.security import create_access_token
from app.models.match import MatchStatus, ResultStatus, SettlementStatus
from app.schemas.match import MatchCreateRequest
from app.services.match_service import MatchService
from app.services.wallet_service import WalletService
from app.services.result_service import ResultService
from app.schemas.result import SubmitResultRequest, PlacementInput
from app.models.wallet import TransactionType, TransactionDirection
from app.core.exceptions import (
    MatchFullException,
    AlreadyRegisteredException,
    InsufficientBalanceException,
    DuplicateSettlementException,
    RoomLockedException,
    InsufficientPermissionsException
)


@pytest.mark.asyncio
async def test_auth_and_login(client):
    # 1. Register new player
    res = await client.post("/api/v1/auth/register", json={
        "email": "newplayer@test.gg",
        "password": "Password123!",
        "display_name": "NewPro",
        "free_fire_uid": "FF_NEW_999",
        "free_fire_name": "NewPro99"
    })
    assert res.status_code == 201
    data = res.json()["data"]
    assert "access_token" in data

    # 2. Login
    res = await client.post("/api/v1/auth/login", json={
        "email": "newplayer@test.gg",
        "password": "Password123!"
    })
    assert res.status_code == 200
    assert "access_token" in res.json()["data"]


@pytest.mark.asyncio
async def test_match_creation_and_capacity_concurrency(db_session, seed_test_data):
    data = seed_test_data
    now = datetime.now(timezone.utc)

    # 1. Create a 1v1 match (Max 2 players)
    req = MatchCreateRequest(
        game_id=data["game"].id,
        mode_id=data["mode_cs"].id,
        map_name="Iron Cage",
        match_format="1v1",
        entry_fee_minor=1000,  # ₹10
        prize_pool_minor=1800,  # ₹18
        max_players=2,
        max_teams=2,
        registration_start_at=now - timedelta(minutes=10),
        registration_close_at=now + timedelta(minutes=20),
        match_start_at=now + timedelta(minutes=30),
        room_release_at=now + timedelta(minutes=25),
        room_id="ROOM_123",
        room_password="PASS_123"
    )
    match = await MatchService.create_match(db_session, req, host_id=data["admin"].id)
    assert match.status == MatchStatus.REGISTRATION_OPEN
    assert match.max_players == 2

    # 2. Player 1 joins
    reg1 = await MatchService.join_match(db_session, match.id, data["player1"].id, payment_method="WALLET")
    assert reg1.slot_number == 1
    assert match.current_players == 1

    # 3. Player 1 attempts to join again -> AlreadyRegisteredException
    with pytest.raises(AlreadyRegisteredException):
        await MatchService.join_match(db_session, match.id, data["player1"].id, payment_method="WALLET")

    # 4. Player 2 joins (fills 2nd and final slot)
    reg2 = await MatchService.join_match(db_session, match.id, data["player2"].id, payment_method="WALLET")
    assert reg2.slot_number == 2
    assert match.current_players == 2
    assert match.status == MatchStatus.FULL

    # 5. A third user attempts to join a full match -> MatchFullException
    with pytest.raises(MatchFullException):
        await MatchService.join_match(db_session, match.id, data["admin"].id, payment_method="WALLET")


@pytest.mark.asyncio
async def test_room_credentials_lock(db_session, seed_test_data):
    data = seed_test_data
    now = datetime.now(timezone.utc)

    # Match where room releases in the future (25 mins from now)
    req = MatchCreateRequest(
        game_id=data["game"].id,
        mode_id=data["mode_cs"].id,
        match_format="1v1",
        entry_fee_minor=0,
        prize_pool_minor=5000,
        max_players=2,
        registration_start_at=now - timedelta(minutes=5),
        registration_close_at=now + timedelta(minutes=20),
        match_start_at=now + timedelta(minutes=30),
        room_release_at=now + timedelta(minutes=25),
        room_id="SECRET_ROOM",
        room_password="SECRET_PASSWORD"
    )
    match = await MatchService.create_match(db_session, req, host_id=data["admin"].id)
    await MatchService.join_match(db_session, match.id, data["player1"].id)

    # Player 1 tries to view room credentials before release time -> RoomLockedException
    with pytest.raises(RoomLockedException):
        await MatchService.get_room_credentials(db_session, match.id, data["player1"].id)


@pytest.mark.asyncio
async def test_result_submission_approval_and_double_settlement_guard(db_session, seed_test_data):
    data = seed_test_data
    now = datetime.now(timezone.utc)

    req = MatchCreateRequest(
        game_id=data["game"].id,
        mode_id=data["mode_cs"].id,
        match_format="1v1",
        entry_fee_minor=1000,
        prize_pool_minor=1800,  # ₹18 prize
        max_players=2,
        registration_start_at=now - timedelta(minutes=10),
        registration_close_at=now + timedelta(minutes=20),
        match_start_at=now + timedelta(minutes=30),
        room_release_at=now + timedelta(minutes=25)
    )
    match = await MatchService.create_match(db_session, req, host_id=data["admin"].id)
    await MatchService.join_match(db_session, match.id, data["player1"].id)
    await MatchService.join_match(db_session, match.id, data["player2"].id)

    # Transition match to AWAITING_RESULT as if match concluded
    match.status = MatchStatus.AWAITING_RESULT
    await db_session.flush()

    # Initial balance of Player 1
    w1_before = (await WalletService.get_or_create_wallet(db_session, data["player1"].id)).available_balance_minor

    # 1. Admin submits structured result (Player 1 won)
    sub_req = SubmitResultRequest(
        winner_user_ids=[data["player1"].id],
        placements=[
            PlacementInput(user_id=data["player1"].id, placement=1, kills=5, score=1500),
            PlacementInput(user_id=data["player2"].id, placement=2, kills=2, score=700),
        ],
        scores={"rounds_won": 5, "rounds_lost": 2},
        notes="Clean match"
    )
    result = await ResultService.submit_result(db_session, match.id, data["admin"].id, sub_req)
    assert match.status == MatchStatus.RESULT_SUBMITTED

    # 2. Admin approves result -> Prize ₹18 is credited
    approved_match = await ResultService.approve_result(db_session, match.id, data["admin"].id)
    assert approved_match.status == MatchStatus.COMPLETED
    assert approved_match.settlement_status == SettlementStatus.SETTLED

    w1_after = (await WalletService.get_or_create_wallet(db_session, data["player1"].id)).available_balance_minor
    assert w1_after == w1_before + 1800  # Exactly ₹18 credited

    # 3. CRITICAL INVARIANT: Admin attempts to approve the same result a second time -> DuplicateSettlementException
    with pytest.raises(DuplicateSettlementException):
        await ResultService.approve_result(db_session, match.id, data["admin"].id)

    # Balance remains unchanged
    w1_after_double = (await WalletService.get_or_create_wallet(db_session, data["player1"].id)).available_balance_minor
    assert w1_after_double == w1_after


@pytest.mark.asyncio
async def test_wallet_ledger_negative_guard(db_session, seed_test_data):
    data = seed_test_data
    # Player 1 balance is 50000 paise (₹500.00)
    # Attempt to debit 100000 paise (₹1000.00) -> InsufficientBalanceException
    with pytest.raises(InsufficientBalanceException):
        await WalletService.post_transaction(
            db=db_session,
            user_id=data["player1"].id,
            type=TransactionType.ENTRY_FEE,
            amount_minor=100000,
            direction=TransactionDirection.DEBIT,
            reference_type="TEST",
            reference_id="TEST_REF",
            idempotency_key="TEST_KEY_OVERDRAFT",
            description="Attempted overdraft"
        )


@pytest.mark.asyncio
async def test_match_cancellation_and_refund(db_session, seed_test_data):
    data = seed_test_data
    now = datetime.now(timezone.utc)

    req = MatchCreateRequest(
        game_id=data["game"].id,
        mode_id=data["mode_cs"].id,
        match_format="1v1",
        entry_fee_minor=2000,  # ₹20 entry
        prize_pool_minor=3500,
        max_players=2,
        registration_start_at=now - timedelta(minutes=10),
        registration_close_at=now + timedelta(minutes=10),
        match_start_at=now + timedelta(minutes=20),
        room_release_at=now + timedelta(minutes=15)
    )
    match = await MatchService.create_match(db_session, req, host_id=data["admin"].id)
    await MatchService.join_match(db_session, match.id, data["player1"].id)

    w_before_cancel = (await WalletService.get_or_create_wallet(db_session, data["player1"].id)).available_balance_minor

    # Admin cancels match
    cancelled = await MatchService.cancel_match(db_session, match.id, data["admin"].id, "Server Maintenance")
    assert cancelled.status == MatchStatus.CANCELLED

    # Player 1 refunded ₹20
    w_after_refund = (await WalletService.get_or_create_wallet(db_session, data["player1"].id)).available_balance_minor
    assert w_after_refund == w_before_cancel + 2000


@pytest.mark.asyncio
async def test_rbac_security(client, seed_test_data):
    data = seed_test_data

    # Player token
    player_token = create_access_token({"sub": data["player1"].id, "email": data["player1"].email, "role": "PLAYER"})
    admin_token = create_access_token({"sub": data["admin"].id, "email": data["admin"].email, "role": "ADMIN"})

    # Player attempts to access admin dashboard -> 403 Forbidden
    res = await client.get("/api/v1/admin/dashboard", headers={"Authorization": f"Bearer {player_token}"})
    assert res.status_code == 403

    # Admin accesses admin dashboard -> 200 OK
    res = await client.get("/api/v1/admin/dashboard", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    assert "total_users" in res.json()["data"]
