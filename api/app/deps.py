"""Shared FastAPI dependencies."""

import uuid

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import PyJWTError
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.postgres import get_session
from app.models import User
from app.security import decode_access_token

_bearer = HTTPBearer()

_UNAUTHORIZED = HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
    session: AsyncSession = Depends(get_session),
) -> User:
    """Resolve the `Authorization: Bearer <token>` header to a `User` row."""
    try:
        user_id = uuid.UUID(decode_access_token(credentials.credentials))
    except (PyJWTError, ValueError) as exc:
        raise _UNAUTHORIZED from exc

    user = await session.get(User, user_id)
    if user is None:
        raise _UNAUTHORIZED
    return user
