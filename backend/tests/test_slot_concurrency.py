import pytest
import asyncio
from datetime import datetime, timezone, timedelta
from httpx import AsyncClient
from sqlalchemy import select, and_

from app.models.match import Match, MatchStatus, TeamAssignmentMode
from app.models.game import Game, GameMode
from app.models.user import User, UserRole, UserStatus
from app.models.profile import PlayerProfile
from app.models.gaming_identity import GamingIdentity, GamingIdentityStatus
from app.models.slot import MatchSlot, SlotStatus
from app.models.registration import MatchRegistration, RegistrationStatus
from app.core.security import create_access_token, hash_password


@pytest.mark.asyncio
async def test_critical_slot_concurrency_race(client: AsyncClient, db_session):
    """
    SECTION 95 — CRITICAL CONCURRENCY TEST
    Simulate multiple simultaneous requests trying to book the exact same slot.
    Expected: Exactly one successful reservation, all others rejected with 409 Conflict.
    No negative slots, no duplicate registrations for the same slot.
    """
    # 1. Setup game and mode
    game = Game(id="g_ff_race", name="Free Fire", slug="free-fire", active=True)
    mode = GameMode(
        id="gm_cs_race",
        game_id="g_ff_race",
        name="Clash Squad 2v2",
        slug="clash-squad-2v2",
        format="CLASH_SQUAD",
        team_size=2,
        max_players=4,
        requires_teams=True,
        active=True
    )
    db_session.add(game)
    db_session.add(mode)

    # 2. Setup Match with 1 slot left
    now = datetime.now(timezone.utc)
    match = Match(
        id="m_race_100",
        public_match_code="FF-RACE1",
        game_id="g_ff_race",
        mode_id="gm_cs_race",
        map_name="Bermuda",
        match_format="2v2",
        entry_fee_minor=0,
        prize_pool_minor=10000,
        max_players=4,
        current_players=0,
        max_teams=2,
        registration_start_at=now - timedelta(hours=1),
        registration_close_at=now + timedelta(hours=1),
        match_start_at=now + timedelta(hours=2),
        room_release_at=now + timedelta(hours=1, minutes=50),
        status=MatchStatus.REGISTRATION_OPEN.value
    )
    db_session.add(match)

    # Add MatchSlots
    for s_num in range(1, 5):
        slot = MatchSlot(
            match_id=match.id,
            slot_number=s_num,
            status=SlotStatus.AVAILABLE.value
        )
        db_session.add(slot)

    # 3. Create 5 distinct verified users
    users = []
    tokens = []
    for i in range(1, 6):
        uid = f"usr_race_{i}"
        user = User(
            id=uid,
            email=f"racer_{i}@igniteff.test",
            password_hash=hash_password("Pass@123"),
            role=UserRole.PLAYER,
            status=UserStatus.ACTIVE,
            is_verified=True
        )
        profile = PlayerProfile(
            user_id=uid,
            display_name=f"Racer {i}",
            free_fire_uid=f"1000000{i}",
            free_fire_name=f"Racer_{i}"
        )
        identity = GamingIdentity(
            user_id=uid,
            game="Free Fire",
            free_fire_uid=f"1000000{i}",
            nickname=f"Racer_{i}",
            status=GamingIdentityStatus.VERIFIED.value,
            verified_at=now
        )
        db_session.add(user)
        db_session.add(profile)
        db_session.add(identity)
        users.append(user)

        token = create_access_token({"sub": uid, "email": user.email, "role": "PLAYER"})
        tokens.append(token)

    await db_session.commit()

    # 4. Use fresh sessions per request for true concurrent HTTP requests
    from tests.conftest import TestAsyncSessionLocal
    from app.core.database import get_db
    from app.main import app

    async def override_concurrent_db():
        async with TestAsyncSessionLocal() as s:
            try:
                yield s
                await s.commit()
            except Exception:
                await s.rollback()
                raise

    app.dependency_overrides[get_db] = override_concurrent_db

    # Target the EXACT same slot: slot_number = 3
    TARGET_SLOT = 3

    async def try_reserve(auth_token: str):
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = await client.post(
            f"/api/v1/matches/{match.id}/reserve-slot",
            json={"slot_number": TARGET_SLOT},
            headers=headers
        )
        return response

    # Fire all 5 requests concurrently
    responses = await asyncio.gather(*[try_reserve(tok) for tok in tokens])

    # 5. Assert invariants
    successes = [r for r in responses if r.status_code == 201]
    conflicts = [r for r in responses if r.status_code == 409]

    assert len(successes) == 1, f"Expected exactly 1 success, got {len(successes)}"
    assert len(conflicts) == 4, f"Expected 4 conflicts (409), got {len(conflicts)}"

    # Check slot record in database
    slot_stmt = select(MatchSlot).where(
        and_(MatchSlot.match_id == match.id, MatchSlot.slot_number == TARGET_SLOT)
    )
    final_slot = (await db_session.execute(slot_stmt)).scalar_one()
    assert final_slot.status == SlotStatus.RESERVED.value
    assert final_slot.registration_id is not None
