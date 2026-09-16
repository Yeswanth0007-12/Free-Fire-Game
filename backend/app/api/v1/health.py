from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.core.database import get_db
from app.schemas.common import ApiResponse

router = APIRouter(tags=["Health"])


@router.get("/health")
async def health_check():
    """Liveness probe: verifies that the HTTP server is responsive."""
    return ApiResponse.ok(data={"status": "alive", "timestamp": datetime.now(timezone.utc).isoformat()})


@router.get("/ready")
async def readiness_check(db: AsyncSession = Depends(get_db)):
    """Readiness probe: verifies that database connection is active and ready."""
    try:
        await db.execute(text("SELECT 1"))
        return ApiResponse.ok(data={"status": "ready", "database": "connected"})
    except Exception as e:
        return ApiResponse.fail("DEPENDENCY_UNAVAILABLE", f"Database not ready: {str(e)}")


@router.get("/time")
async def get_server_time():
    """Server timestamp endpoint for synchronizing client-side match countdowns."""
    now = datetime.now(timezone.utc)
    return ApiResponse.ok(
        data={
            "iso": now.isoformat(),
            "timestamp_ms": int(now.timestamp() * 1000)
        }
    )
