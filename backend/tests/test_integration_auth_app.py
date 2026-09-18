import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.config import settings


@pytest.mark.asyncio
async def test_app_download_redirect():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Test /download/apk root redirect
        res = await client.get("/download/apk", follow_redirects=False)
        assert res.status_code == 307
        assert res.headers["location"] == settings.APK_DOWNLOAD_URL

        # Test /api/v1/app/download redirect
        res2 = await client.get("/api/v1/app/download", follow_redirects=False)
        assert res2.status_code == 307
        assert res2.headers["location"] == settings.APK_DOWNLOAD_URL

        # Test /api/v1/app/download with json=true
        res3 = await client.get("/api/v1/app/download?json=true")
        assert res3.status_code == 200
        data = res3.json()
        assert data["success"] is True
        assert data["data"]["version"] == "1.0.4"
        assert data["data"]["download_url"] == settings.APK_DOWNLOAD_URL


@pytest.mark.asyncio
async def test_app_info():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/v1/app/info")
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert data["data"]["latest_version"] == "1.0.4"
        assert data["data"]["latest_version_code"] == 5
        assert data["data"]["download_url"] == settings.APK_DOWNLOAD_URL


@pytest.mark.asyncio
async def test_firebase_auth_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # When mock auth is enabled (dev mode), sending mock token should succeed
        res = await client.post("/api/v1/auth/firebase", json={
            "id_token": "mock_token:google.com:testplayer@clashiq.gg:ClashIQ Tester"
        })
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert "access_token" in data["data"]
        assert "refresh_token" in data["data"]

        token = data["data"]["access_token"]

        # Test /api/v1/me
        res_me = await client.get("/api/v1/me", headers={"Authorization": f"Bearer {token}"})
        assert res_me.status_code == 200
        assert res_me.json()["data"]["email"] == "testplayer@clashiq.gg"

        # Test /api/v1/users/me
        res_users_me = await client.get("/api/v1/users/me", headers={"Authorization": f"Bearer {token}"})
        assert res_users_me.status_code == 200

        # Test /api/v1/auth/me
        res_auth_me = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert res_auth_me.status_code == 200

        # Test /api/v1/users/me/profile
        res_profile = await client.patch(
            "/api/v1/users/me/profile",
            headers={"Authorization": f"Bearer {token}"},
            json={"display_name": "Pro Gamer 99"}
        )
        assert res_profile.status_code == 200
        assert res_profile.json()["data"]["display_name"] == "Pro Gamer 99"
