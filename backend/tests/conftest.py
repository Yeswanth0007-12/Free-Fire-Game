import pytest
import asyncio
from datetime import datetime, timezone, timedelta
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from httpx import AsyncClient, ASGITransport

from app.core.database import Base, get_db
from app.core.security import hash_password
from app.models.user import User, UserRole, UserStatus
from app.models.profile import PlayerProfile
from app.models.wallet import Wallet
from app.models.game import Game, GameMode
from app.main import app

# Test database shared file
TEST_DB_URL = "sqlite+aiosqlite:///./test_runner.db"

test_engine = create_async_engine(
    TEST_DB_URL,
    connect_args={"check_same_thread": False}
)

TestAsyncSessionLocal = async_sessionmaker(
    bind=test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="function")
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with TestAsyncSessionLocal() as session:
        yield session

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.fixture(scope="function")
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest.fixture(scope="function")
async def seed_test_data(db_session: AsyncSession):
    # Game & Game Mode
    game = Game(name="Free Fire", slug="free-fire", active=True)
    db_session.add(game)
    await db_session.flush()

    mode_cs = GameMode(
        game_id=game.id,
        name="Clash Squad 1v1",
        slug="clash-squad-1v1",
        format="CLASH_SQUAD",
        team_size=1,
        min_players=2,
        max_players=2,
        requires_teams=True,
        active=True
    )
    db_session.add(mode_cs)

    # Admin User
    admin = User(
        email="admin@test.gg",
        password_hash=hash_password("Admin@123"),
        role=UserRole.ADMIN,
        status=UserStatus.ACTIVE,
        is_verified=True
    )
    db_session.add(admin)
    await db_session.flush()

    admin_profile = PlayerProfile(
        user_id=admin.id,
        display_name="AdminTest",
        free_fire_uid="FF_ADMIN_TEST",
        free_fire_name="AdminT",
        preferred_game="Free Fire"
    )
    admin_wallet = Wallet(user_id=admin.id, currency="INR", available_balance_minor=100000)
    db_session.add_all([admin_profile, admin_wallet])

    # Player 1
    player1 = User(
        email="player1@test.gg",
        password_hash=hash_password("Player1@123"),
        role=UserRole.PLAYER,
        status=UserStatus.ACTIVE,
        is_verified=True
    )
    db_session.add(player1)
    await db_session.flush()
    p1_prof = PlayerProfile(user_id=player1.id, display_name="PlayerOne", free_fire_uid="FF_P1_001", free_fire_name="P1")
    p1_wall = Wallet(user_id=player1.id, currency="INR", available_balance_minor=50000)
    db_session.add_all([p1_prof, p1_wall])

    # Player 2
    player2 = User(
        email="player2@test.gg",
        password_hash=hash_password("Player2@123"),
        role=UserRole.PLAYER,
        status=UserStatus.ACTIVE,
        is_verified=True
    )
    db_session.add(player2)
    await db_session.flush()
    p2_prof = PlayerProfile(user_id=player2.id, display_name="PlayerTwo", free_fire_uid="FF_P2_002", free_fire_name="P2")
    p2_wall = Wallet(user_id=player2.id, currency="INR", available_balance_minor=50000)
    db_session.add_all([p2_prof, p2_wall])

    # Player 3 (Banned)
    player3 = User(
        email="banned@test.gg",
        password_hash=hash_password("Banned@123"),
        role=UserRole.PLAYER,
        status=UserStatus.BANNED,
        is_verified=True
    )
    db_session.add(player3)
    await db_session.flush()
    p3_prof = PlayerProfile(user_id=player3.id, display_name="BannedPlayer", free_fire_uid="FF_P3_BANNED", free_fire_name="Banned")
    p3_wall = Wallet(user_id=player3.id, currency="INR", available_balance_minor=50000)
    db_session.add_all([p3_prof, p3_wall])

    await db_session.commit()

    return {
        "game": game,
        "mode_cs": mode_cs,
        "admin": admin,
        "player1": player1,
        "player2": player2,
        "player3": player3
    }
