import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

from app.core.config import settings
from app.core.logging import setup_logging, logger
from app.core.exceptions import AppException
from app.schemas.common import ApiResponse
from app.services.websocket_manager import ws_manager
from app.workers.scheduler import run_match_lifecycle_worker

# API routers
from app.api.v1.auth import router as auth_router
from app.api.v1.users import router as users_router
from app.api.v1.games import router as games_router
from app.api.v1.matches import router as matches_router
from app.api.v1.registrations import router as registrations_router
from app.api.v1.wallet import router as wallet_router
from app.api.v1.payments import router as payments_router
from app.api.v1.results import router as results_router
from app.api.v1.disputes import router as disputes_router
from app.api.v1.leaderboard import router as leaderboard_router
from app.api.v1.notifications import router as notifications_router
from app.api.v1.admin import router as admin_router
from app.api.v1.health import router as health_router
from app.api.v1.gaming_identities import router as gaming_identities_router, admin_router as admin_gaming_identities_router
from app.api.v1.app_info import router as app_info_router
from fastapi.responses import JSONResponse, RedirectResponse
from fastapi import status


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging()
    logger.info(f"Starting {settings.APP_NAME} in [{settings.APP_ENV}] mode...")

    # Start background scheduler task
    worker_task = asyncio.create_task(run_match_lifecycle_worker())

    yield

    logger.info("Shutting down background tasks...")
    worker_task.cancel()
    try:
        await worker_task
    except asyncio.CancelledError:
        pass


app = FastAPI(
    title="Free Fire Competitive Tournament Platform API",
    description="Production-grade competitive tournament management platform API for Free Fire scheduled matches.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS Middleware
_allowed_origins = list(settings.CORS_ORIGINS) if isinstance(settings.CORS_ORIGINS, list) else [str(settings.CORS_ORIGINS)]
for _required_origin in ["https://free-fire-game-rose.vercel.app", "http://localhost:3000", "http://127.0.0.1:3000"]:
    if _required_origin not in _allowed_origins:
        _allowed_origins.append(_required_origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _cors_headers(request: Request) -> dict:
    origin = request.headers.get("origin")
    if origin and ("vercel.app" in origin or "localhost" in origin or "127.0.0.1" in origin):
        return {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers": "*",
        }
    return {}


# Global Exception Handler for Business Exceptions
@app.exception_handler(AppException)
async def app_exception_handler(request: Request, exc: AppException):
    return JSONResponse(
        status_code=exc.status_code,
        content=ApiResponse.fail(code=exc.code, message=exc.message, data=exc.data).model_dump(),
        headers=_cors_headers(request)
    )


# Validation Error Handler
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = exc.errors()
    first_error = errors[0] if errors else {}
    msg = f"{first_error.get('loc', ['field'])[-1]}: {first_error.get('msg', 'Validation error')}"
    return JSONResponse(
        status_code=422,
        content=ApiResponse.fail(code="VALIDATION_ERROR", message=msg, data=errors).model_dump(),
        headers=_cors_headers(request)
    )


# Unhandled Exception Handler
@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    logger.exception(f"Unhandled server error at {request.url.path}: {exc}")
    err_message = f"Server Error: {str(exc)}" if settings.DEBUG else "An unexpected server error occurred. Please try again later."
    return JSONResponse(
        status_code=500,
        content=ApiResponse.fail(
            code="INTERNAL_SERVER_ERROR",
            message=err_message
        ).model_dump(),
        headers=_cors_headers(request)
    )


# Register API v1 Routers
api_v1_prefix = settings.API_V1_PREFIX
app.include_router(health_router, prefix=api_v1_prefix)
app.include_router(auth_router, prefix=api_v1_prefix)
app.include_router(users_router, prefix=api_v1_prefix)
app.include_router(games_router, prefix=api_v1_prefix)
app.include_router(matches_router, prefix=api_v1_prefix)
app.include_router(registrations_router, prefix=api_v1_prefix)
app.include_router(wallet_router, prefix=api_v1_prefix)
app.include_router(payments_router, prefix=api_v1_prefix)
app.include_router(results_router, prefix=api_v1_prefix)
app.include_router(disputes_router, prefix=api_v1_prefix)
app.include_router(leaderboard_router, prefix=api_v1_prefix)
app.include_router(notifications_router, prefix=api_v1_prefix)
app.include_router(admin_router, prefix=api_v1_prefix)
app.include_router(gaming_identities_router, prefix=api_v1_prefix)
app.include_router(admin_gaming_identities_router, prefix=api_v1_prefix)
app.include_router(app_info_router, prefix=api_v1_prefix)


@app.get("/download/apk", include_in_schema=True, tags=["App"])
async def root_download_apk():
    """Permanent root redirect to the latest ClashIQ Android release APK."""
    return RedirectResponse(url=settings.APK_DOWNLOAD_URL, status_code=status.HTTP_307_TEMPORARY_REDIRECT)


# WebSockets for real-time match events
@app.websocket("/ws/matches/{match_id}")
async def websocket_match_endpoint(websocket: WebSocket, match_id: str):
    await ws_manager.connect_match(websocket, match_id)
    try:
        while True:
            # Keep connection alive; client can send pings
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        ws_manager.disconnect_match(websocket, match_id)
    except Exception:
        ws_manager.disconnect_match(websocket, match_id)


@app.websocket("/ws/global")
async def websocket_global_endpoint(websocket: WebSocket):
    await ws_manager.connect_global(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        ws_manager.disconnect_global(websocket)
    except Exception:
        ws_manager.disconnect_global(websocket)
