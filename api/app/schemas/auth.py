"""Registration, login, and the interests collected during onboarding."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr

from app.models import InterestSource, InterestType


class RegisterRequest(BaseModel):
    """Step 1 of the frontend's onboarding flow: the account basics."""

    name: str
    email: EmailStr
    password: str
    city: str
    country: str
    profession: str | None = None


class LoginRequest(BaseModel):
    """Credentials for `POST /auth/login`."""

    email: EmailStr
    password: str


class UserOut(BaseModel):
    """A user, safe to return from the API (no password hash)."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    email: EmailStr
    city: str
    country: str
    profession: str | None


class TokenResponse(BaseModel):
    """What `/auth/register` and `/auth/login` return."""

    access_token: str
    token_type: str = "bearer"
    user: UserOut


class InterestsRequest(BaseModel):
    """Step 2: the onboarding wizard's hobby/topic/sport/etc. selections.

    Each list becomes one explicit `UserInterest` row per item; `other`
    is free text, comma-separated, matching the frontend's onboarding UI.
    """

    hobbies: list[str] = []
    topics: list[str] = []
    sports: list[str] = []
    movies: list[str] = []
    political_interests: list[str] = []
    other: str | None = None


class InterestOut(BaseModel):
    """One interest edge, as returned to the client."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    label: str
    type: InterestType
    source: InterestSource
    explicit_weight: float
    implicit_weight: float
    negative_weight: float
    confidence: float
    reason: str
    created_at: datetime
    last_reinforced_at: datetime
