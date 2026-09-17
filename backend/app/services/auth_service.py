from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from app.core.security import hash_password, verify_password, create_access_token, create_refresh_token, decode_token
from app.core.exceptions import AuthenticationFailedException, DuplicateEntityException
from app.models.user import User, UserRole, UserStatus
from app.models.profile import PlayerProfile
from app.models.wallet import Wallet
from app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse, RefreshTokenRequest


class AuthService:
    @staticmethod
    async def register(db: AsyncSession, req: RegisterRequest) -> TokenResponse:
        # Check existing email
        stmt = select(User).where(User.email == req.email.lower())
        result = await db.execute(stmt)
        if result.scalar_one_or_none():
            raise DuplicateEntityException("A user with this email address already exists")

        # Check existing Free Fire UID
        stmt = select(PlayerProfile).where(PlayerProfile.free_fire_uid == req.free_fire_uid.strip())
        result = await db.execute(stmt)
        if result.scalar_one_or_none():
            raise DuplicateEntityException("This Free Fire UID is already linked to another account")

        # Create user
        user = User(
            email=req.email.lower(),
            phone=req.phone.strip() if req.phone else None,
            password_hash=hash_password(req.password),
            role=UserRole.PLAYER,
            status=UserStatus.ACTIVE,
            is_verified=True,
            last_login_at=datetime.now(timezone.utc)
        )
        db.add(user)
        await db.flush()

        # Create player profile
        profile = PlayerProfile(
            user_id=user.id,
            display_name=req.display_name.strip(),
            free_fire_uid=req.free_fire_uid.strip(),
            free_fire_name=req.free_fire_name.strip(),
            preferred_game="Free Fire"
        )
        db.add(profile)

        # Create user wallet
        wallet = Wallet(
            user_id=user.id,
            currency="INR",
            available_balance_minor=0,
            locked_balance_minor=0,
            winning_balance_minor=0
        )
        db.add(wallet)
        await db.flush()

        # Generate tokens
        role_str = user.role.value if hasattr(user.role, "value") else str(user.role)
        token_payload = {"sub": user.id, "email": user.email, "role": role_str}
        access_token = create_access_token(token_payload)
        refresh_token = create_refresh_token(token_payload)

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            expires_in=60 * 24 * 60
        )

    @staticmethod
    async def login(db: AsyncSession, req: LoginRequest) -> TokenResponse:
        stmt = select(User).where(User.email == req.email.lower())
        result = await db.execute(stmt)
        user = result.scalar_one_or_none()

        if not user or not verify_password(req.password, user.password_hash):
            raise AuthenticationFailedException("Invalid email or password")

        if user.status != UserStatus.ACTIVE:
            raise AuthenticationFailedException(f"Account is {user.status.value.lower()}")

        user.last_login_at = datetime.now(timezone.utc)
        await db.flush()

        role_str = user.role.value if hasattr(user.role, "value") else str(user.role)
        token_payload = {"sub": user.id, "email": user.email, "role": role_str}
        access_token = create_access_token(token_payload)
        refresh_token = create_refresh_token(token_payload)

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            expires_in=60 * 24 * 60
        )

    @staticmethod
    async def refresh_token(db: AsyncSession, req: RefreshTokenRequest) -> TokenResponse:
        payload = decode_token(req.refresh_token, is_refresh=True)
        if not payload or not payload.get("sub"):
            raise AuthenticationFailedException("Invalid or expired refresh token")

        user_id = payload["sub"]
        stmt = select(User).where(User.id == user_id)
        result = await db.execute(stmt)
        user = result.scalar_one_or_none()

        if not user or user.status != UserStatus.ACTIVE:
            raise AuthenticationFailedException("User not active or does not exist")

        token_payload = {"sub": user.id, "email": user.email, "role": user.role.value if hasattr(user.role, "value") else str(user.role)}
        access_token = create_access_token(token_payload)
        refresh_token = create_refresh_token(token_payload)

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            expires_in=60 * 24 * 60
        )

    @staticmethod
    async def authenticate_firebase(db: AsyncSession, req: FirebaseAuthRequest) -> TokenResponse:
        from app.integrations.firebase_auth import verify_firebase_id_token
        
        decoded = verify_firebase_id_token(req.id_token)
        if not decoded or not decoded.get("email"):
            raise AuthenticationFailedException("Invalid, expired, or unverified Firebase ID token")

        email = decoded["email"].lower().strip()
        name = decoded.get("name") or email.split("@")[0]
        avatar_url = decoded.get("picture")

        # Check existing user
        stmt = select(User).where(User.email == email)
        result = await db.execute(stmt)
        user = result.scalar_one_or_none()

        if not user:
            # Create user
            user = User(
                email=email,
                password_hash=hash_password(f"oauth_{email}_{decoded.get('uid', '')}"),
                role=UserRole.PLAYER,
                status=UserStatus.ACTIVE,
                is_verified=True,
                last_login_at=datetime.now(timezone.utc)
            )
            db.add(user)
            await db.flush()

            # Create default profile
            profile = PlayerProfile(
                user_id=user.id,
                display_name=name,
                avatar_url=avatar_url,
                free_fire_uid=f"UNLINKED_{user.id[:8]}",
                free_fire_name=name,
                preferred_game="Free Fire"
            )
            db.add(profile)

            # Create wallet
            wallet = Wallet(
                user_id=user.id,
                currency="INR",
                available_balance_minor=0,
                locked_balance_minor=0,
                winning_balance_minor=0
            )
            db.add(wallet)
            await db.flush()
        else:
            if user.status != UserStatus.ACTIVE:
                raise AuthenticationFailedException(f"Account is {user.status.value.lower()}")
            user.last_login_at = datetime.now(timezone.utc)
            await db.flush()

        role_str = user.role.value if hasattr(user.role, "value") else str(user.role)
        token_payload = {"sub": user.id, "email": user.email, "role": role_str}
        access_token = create_access_token(token_payload)
        refresh_token = create_refresh_token(token_payload)

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            expires_in=60 * 24 * 60
        )
