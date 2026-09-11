"""Password hashing (pwdlib/Argon2) and JWT access tokens (PyJWT)."""

from datetime import datetime, timedelta, timezone

import jwt
from pwdlib import PasswordHash

from app.config import get_settings

_password_hash = PasswordHash.recommended()  # Argon2, pwdlib's current default


def hash_password(password: str) -> str:
    """Hash a plaintext password for storage."""
    return _password_hash.hash(password)


def verify_password(password: str, hashed: str) -> bool:
    """Check a plaintext password against a stored hash."""
    return _password_hash.verify(password, hashed)


def create_access_token(user_id: str) -> str:
    """Create a signed JWT encoding `user_id` as the subject claim."""
    settings = get_settings()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expire_minutes)
    payload = {"sub": user_id, "exp": expires_at}
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> str:
    """Decode a JWT and return the user id it encodes.

    Raises `jwt.PyJWTError` (expired, malformed, bad signature, etc.) —
    callers turn that into a 401 (see `app/deps.py`).
    """
    settings = get_settings()
    payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    return payload["sub"]
