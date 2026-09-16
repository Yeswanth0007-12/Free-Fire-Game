from typing import List, Optional
from fastapi import Depends, Header, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.security import decode_token
from app.core.exceptions import AuthenticationFailedException, InsufficientPermissionsException
from app.models.user import User, UserRole, UserStatus

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)


async def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db)
) -> User:
    """Extract and validate the currently authenticated user."""
    auth_token = token
    if not auth_token and authorization and authorization.startswith("Bearer "):
        auth_token = authorization.replace("Bearer ", "")

    if not auth_token:
        raise AuthenticationFailedException("Authentication token required")

    payload = decode_token(auth_token, is_refresh=False)
    if not payload or not payload.get("sub"):
        raise AuthenticationFailedException("Invalid or expired authentication token")

    user_id = payload["sub"]
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise AuthenticationFailedException("User does not exist")

    if user.status in (UserStatus.BANNED, UserStatus.SUSPENDED):
        raise InsufficientPermissionsException(f"Account is {user.status.value.lower()}")

    return user


def require_role(allowed_roles: List[UserRole]):
    """Enforce Role-Based Access Control (RBAC)."""
    async def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise InsufficientPermissionsException(
                f"Access forbidden: requires one of {[r.value for r in allowed_roles]}"
            )
        return current_user
    return role_checker


# Common role dependencies
require_admin = require_role([UserRole.ADMIN, UserRole.SUPER_ADMIN])
require_host_or_admin = require_role([UserRole.MATCH_HOST, UserRole.ADMIN, UserRole.SUPER_ADMIN])
require_player = require_role([UserRole.PLAYER, UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MATCH_HOST])
