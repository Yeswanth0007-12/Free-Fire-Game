import pytest
from httpx import AsyncClient
from sqlalchemy import select

from app.models.user import User, UserRole, UserStatus
from app.models.profile import PlayerProfile
from app.models.wallet import Wallet


@pytest.mark.asyncio
async def test_firebase_google_login_and_sync(client: AsyncClient, db_session):
    """
    SECTION 5, 6, 90, 94 — Firebase Google Login & Profile Sync
    """
    google_mock_token = "mock_:google.com:sathish_google@igniteff.test:Sathish Gamer"
    
    resp = await client.post(
        "/api/v1/auth/firebase",
        json={"id_token": google_mock_token, "provider": "google.com"}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert "access_token" in data["data"]

    # Verify user created in database
    stmt = select(User).where(User.email == "sathish_google@igniteff.test")
    user = (await db_session.execute(stmt)).scalar_one_or_none()
    assert user is not None
    assert user.role == UserRole.PLAYER
    assert user.is_verified is True

    # Verify profile created
    p_stmt = select(PlayerProfile).where(PlayerProfile.user_id == user.id)
    profile = (await db_session.execute(p_stmt)).scalar_one_or_none()
    assert profile is not None
    assert profile.display_name == "Sathish Gamer"

    # Verify wallet created with 0 balance
    w_stmt = select(Wallet).where(Wallet.user_id == user.id)
    wallet = (await db_session.execute(w_stmt)).scalar_one_or_none()
    assert wallet is not None
    assert wallet.available_balance_minor == 0


@pytest.mark.asyncio
async def test_firebase_facebook_login_and_account_linking(client: AsyncClient, db_session):
    """
    SECTION 7, 91, 94 — Firebase Facebook Login & Safe Account Linking
    """
    # User signs in with Google first
    g_token = "mock_:google.com:shared_email@igniteff.test:Shared User"
    resp1 = await client.post("/api/v1/auth/firebase", json={"id_token": g_token})
    assert resp1.status_code == 200

    # Same verified email signs in with Facebook later
    fb_token = "mock_:facebook.com:shared_email@igniteff.test:Shared User FB"
    resp2 = await client.post("/api/v1/auth/firebase", json={"id_token": fb_token, "provider": "facebook.com"})
    assert resp2.status_code == 200

    # Ensure NO duplicate user account was created (Section 6 & 91)
    stmt = select(User).where(User.email == "shared_email@igniteff.test")
    users = list((await db_session.execute(stmt)).scalars().all())
    assert len(users) == 1, f"Expected exactly 1 user account, found {len(users)}"
