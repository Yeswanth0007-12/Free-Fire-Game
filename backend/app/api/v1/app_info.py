from fastapi import APIRouter, Request, status
from fastapi.responses import RedirectResponse
from app.core.config import settings
from app.schemas.common import ApiResponse

router = APIRouter(prefix="/app", tags=["App"])


@router.get("/download")
async def download_apk(request: Request, json: bool = False):
    """
    Directly redirects to the latest release APK download, or returns JSON if requested.
    """
    accept = request.headers.get("accept", "")
    if json or ("application/json" in accept and "text/html" not in accept):
        return ApiResponse.ok(
            data={
                "version": settings.LATEST_APP_VERSION,
                "version_code": settings.LATEST_VERSION_CODE,
                "download_url": settings.APK_DOWNLOAD_URL,
                "filename": "clashiq-v1.0.4.apk",
            },
            message="APK download link retrieved successfully"
        )
    return RedirectResponse(url=settings.APK_DOWNLOAD_URL, status_code=status.HTTP_307_TEMPORARY_REDIRECT)


@router.get("/info", response_model=ApiResponse[dict])
async def get_app_info():
    """
    Returns application versioning, minimum requirements, release notes, and direct download links.
    """
    return ApiResponse.ok(
        data={
            "app_name": "ClashIQ",
            "latest_version": settings.LATEST_APP_VERSION,
            "latest_version_code": settings.LATEST_VERSION_CODE,
            "minimum_version": settings.MINIMUM_APP_VERSION,
            "force_update": settings.FORCE_UPDATE_ENABLED,
            "download_url": settings.APK_DOWNLOAD_URL,
            "release_notes": [
                "Fixed native OkHttp SIGABRT process crash on Android when authenticating with Google or Facebook.",
                "Enhanced offline error cards with retry action.",
                "Updated SHA-1 and SHA-256 release certificate registration for Firebase Auth.",
                "Optimized Hermes bytecode for Android 15 (SDK 35)."
            ],
            "support_email": "support@clashiq.gg"
        },
        message="App version info retrieved successfully"
    )


@router.get("/version", response_model=ApiResponse[dict])
async def get_app_version():
    """Alias for /app/info."""
    return await get_app_info()
