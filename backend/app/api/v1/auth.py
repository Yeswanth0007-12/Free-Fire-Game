from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.schemas.common import ApiResponse
from app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse, RefreshTokenRequest, FirebaseAuthRequest
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/register", response_model=ApiResponse[TokenResponse], status_code=status.HTTP_201_CREATED)
async def register(req: RegisterRequest, db: AsyncSession = Depends(get_db)):
    tokens = await AuthService.register(db, req)
    return ApiResponse.ok(data=tokens, message="Account successfully created")


@router.post("/login", response_model=ApiResponse[TokenResponse])
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    tokens = await AuthService.login(db, req)
    return ApiResponse.ok(data=tokens, message="Authentication successful")


@router.post("/firebase", response_model=ApiResponse[TokenResponse])
async def firebase_auth(req: FirebaseAuthRequest, db: AsyncSession = Depends(get_db)):
    tokens = await AuthService.authenticate_firebase(db, req)
    return ApiResponse.ok(data=tokens, message="Firebase authentication successful")


@router.post("/refresh", response_model=ApiResponse[TokenResponse])
async def refresh_token(req: RefreshTokenRequest, db: AsyncSession = Depends(get_db)):
    tokens = await AuthService.refresh_token(db, req)
    return ApiResponse.ok(data=tokens, message="Token refreshed successfully")


@router.get("/me")
async def auth_me(
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    from app.api.v1.users import get_my_account
    return await get_my_account(current_user=current_user, db=db)

