import pytest
from datetime import datetime, timezone, timedelta
from httpx import AsyncClient
from sqlalchemy import select

from app.models.match import Match, MatchStatus, RoomReleaseStatus
from app.models.game import Game, GameMode
from app.models.user import User, UserRole, UserStatus
from app.models.profile import PlayerProfile
from app.models.registration import MatchRegistration, RegistrationStatus
from app.core.security import create_access_token, hash_password


@pytest.mark.asyncio
async def test_critical_room_release_lifecycle(client: AsyncClient, db_session):
    """
    SECTION 97 — CRITICAL ROOM RELEASE TEST
    1. Admin creates match with empty room credentials.
    2. Player registers and confirms slot.
    3. Another user does NOT register.
    4. Before release time: Room locked for everyone.
    5. Admin updates room ID and room password without recreating match.
    6. After release time:
       - Confirmed registered player sees Room ID and Password.
       - Non-registered user receives 403 Forbidden.
       - Public GET /matches/{id} does NOT expose password.
    """
    now = datetime.now(timezone.utc)

    # 1. Game and Mode
    game = Game(id="g_room", name="Free Fire", slug="free-fire-room", active=True)
    mode = GameMode(
        id="gm_room",
        game_id="g_room",
        name="Solo Battle",
        slug="solo-battle",
        format="SOLO",
        team_size=1,
        max_players=2,
        requires_teams=False,
        active=True
    )
    db_session.add(game)
    db_session.add(mode)

    # 2. Admin, Registered Player, and Non-Registered Player
    admin = User(
        id="usr_admin_room",
        email="admin_room@igniteff.test",
        password_hash=hash_password("Admin@123"),
        role=UserRole.ADMIN,
        status=UserStatus.ACTIVE,
        is_verified=True
    )
    player = User(
        id="usr_reg_player",
        email="reg_player@igniteff.test",
        password_hash=hash_password("Player@123"),
        role=UserRole.PLAYER,
        status=UserStatus.ACTIVE,
        is_verified=True
    )
    outsider = User(
        id="usr_outsider",
        email="outsider@igniteff.test",
        password_hash=hash_password("Pass@123"),
        role=UserRole.PLAYER,
        status=UserStatus.ACTIVE,
        is_verified=True
    )
    db_session.add(admin)
    db_session.add(player)
    db_session.add(outsider)

    # Player profile
    profile = PlayerProfile(
        user_id=player.id,
        display_name="ProPlayer",
        free_fire_uid="99887766",
        free_fire_name="ProFF"
    )
    db_session.add(profile)

    # 3. Match created with empty room credentials and future release time
    match = Match(
        id="m_room_lifecycle",
        public_match_code="FF-ROOM-TEST",
        game_id=game.id,
        mode_id=mode.id,
        map_name="Bermuda",
        match_format="SOLO",
        entry_fee_minor=0,
        prize_pool_minor=5000,
        currency="INR",
        max_players=2,
        current_players=1,
        registration_start_at=now - timedelta(hours=1),
        registration_close_at=now + timedelta(hours=1),
        room_release_at=now + timedelta(minutes=15),  # 15 mins in future initially
        match_start_at=now + timedelta(minutes=20),
        room_id_encrypted=None,
        room_password_encrypted=None,
        status=MatchStatus.REGISTRATION_OPEN.value,
        room_release_status=RoomReleaseStatus.PENDING.value
    )
    db_session.add(match)

    # Player has CONFIRMED registration
    reg = MatchRegistration(
        match_id=match.id,
        user_id=player.id,
        status=RegistrationStatus.CONFIRMED.value,
        slot_number=1,
        entry_fee_minor=0
    )
    db_session.add(reg)
    await db_session.commit()

    admin_token = create_access_token({"sub": admin.id, "email": admin.email, "role": "ADMIN"})
    player_token = create_access_token({"sub": player.id, "email": player.email, "role": "PLAYER"})
    outsider_token = create_access_token({"sub": outsider.id, "email": outsider.email, "role": "PLAYER"})

    # 4. Before credentials exist and before release time: Player cannot access room
    resp_before = await client.get(
        f"/api/v1/matches/{match.id}/room",
        headers={"Authorization": f"Bearer {player_token}"}
    )
    assert resp_before.status_code in (400, 403)

    # 5. Admin updates room credentials via PATCH
    admin_patch_resp = await client.patch(
        f"/api/v1/admin/matches/{match.id}",
        json={
            "room_id": "987654321",
            "room_password": "SECRET_PASSWORD_123",
            "room_release_at": (now - timedelta(minutes=1)).isoformat()  # Release time has now passed
        },
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert admin_patch_resp.status_code == 200
    patch_data = admin_patch_resp.json()
    assert patch_data["success"] is True

    # 6. Public endpoint does NOT expose room credentials
    public_resp = await client.get(f"/api/v1/matches/{match.id}")
    assert public_resp.status_code == 200
    pub_json = public_resp.json()["data"]
    assert "SECRET_PASSWORD_123" not in str(pub_json)
    assert "room_password" not in pub_json

    # 7. Non-registered user tries to fetch room credentials -> 403 Forbidden
    outsider_resp = await client.get(
        f"/api/v1/matches/{match.id}/room",
        headers={"Authorization": f"Bearer {outsider_token}"}
    )
    assert outsider_resp.status_code in (400, 403)

    # 8. Confirmed player accesses room -> 200 OK with decrypted room credentials
    player_resp = await client.get(
        f"/api/v1/matches/{match.id}/room",
        headers={"Authorization": f"Bearer {player_token}"}
    )
    assert player_resp.status_code == 200
    creds = player_resp.json()["data"]
    assert creds["room_id"] == "987654321"
    assert creds["room_password"] == "SECRET_PASSWORD_123"
    assert creds["is_released"] is True
