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


@router.get("/admin/system/health")
async def admin_system_health(db: AsyncSession = Depends(get_db)):
    """
    Subsystem operational telemetry (Section 104 & 135):
    API, Database, Worker, Scheduler, WebSocket, and Payment health.
    """
    now = datetime.now(timezone.utc)
    db_status = "connected"
    try:
        await db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"error: {str(e)}"

    from app.workers.scheduler import worker_telemetry
    from app.services.websocket_manager import ws_manager
    from app.core.config import settings

    return ApiResponse.ok(
        data={
            "status": "HEALTHY" if db_status == "connected" and worker_telemetry.get("status") == "RUNNING" else "DEGRADED",
            "timestamp": now.isoformat(),
            "api": {"status": "online", "environment": settings.APP_ENV, "version": "1.0.0"},
            "database": {"status": db_status, "driver": "sqlite" if settings.DATABASE_URL.startswith("sqlite") else "postgres"},
            "scheduler": worker_telemetry,
            "websocket": {
                "active_match_rooms": len(ws_manager.match_rooms),
                "global_listeners": len(ws_manager.global_connections)
            },
            "payment_service": {
                "provider": "Razorpay",
                "configured": bool(settings.RAZORPAY_KEY_ID),
                "test_mode": settings.PAYMENT_MODE_SIMULATION
            }
        }
    )
