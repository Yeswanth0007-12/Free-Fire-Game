import base64
from datetime import datetime, timedelta, timezone
from typing import Optional, Any, Dict
from jose import jwt, JWTError
from passlib.context import CryptContext
from cryptography.fernet import Fernet
from app.core.config import settings

# Argon2id password hashing context
pwd_context = CryptContext(
    schemes=["argon2"],
    deprecated="auto"
)

# Symmetric encryption cipher for room credentials
def get_cipher() -> Fernet:
    key = settings.ENCRYPTION_KEY.encode()
    # If key is not valid 32 url-safe base64, generate or pad
    try:
        return Fernet(key)
    except Exception:
        # Fallback to standard deterministic 32-byte urlsafe base64 key
        padded = base64.urlsafe_b64encode(key.ljust(32)[:32])
        return Fernet(padded)

cipher = get_cipher()


def hash_password(password: str) -> str:
    """Hash a plaintext password using Argon2id."""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plaintext password against an Argon2id hash."""
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Generate a signed JWT access token."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire, "type": "access"})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt


def create_refresh_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Generate a signed JWT refresh token."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    )
    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_REFRESH_SECRET, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt


def decode_token(token: str, is_refresh: bool = False) -> Optional[Dict[str, Any]]:
    """Decode and validate a JWT token."""
    secret = settings.JWT_REFRESH_SECRET if is_refresh else settings.JWT_SECRET
    try:
        payload = jwt.decode(token, secret, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except JWTError:
        return None


def encrypt_room_credential(plain_text: Optional[str]) -> Optional[str]:
    """Encrypt sensitive room credentials at rest."""
    if not plain_text:
        return None
    return cipher.encrypt(plain_text.encode()).decode()


def decrypt_room_credential(cipher_text: Optional[str]) -> Optional[str]:
    """Decrypt encrypted room credentials."""
    if not cipher_text:
        return None
    try:
        return cipher.decrypt(cipher_text.encode()).decode()
    except Exception:
        return "[ENCRYPTION_ERROR]"
