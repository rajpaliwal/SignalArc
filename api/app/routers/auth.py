"""Registration, login, and the current user.

Matches the frontend's two-step flow: `/auth/register` creates the account
(step 1), then `/auth/me/interests` records the onboarding wizard's
selections (step 2) against the now-authenticated user.
"""

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.postgres import get_session
from app.deps import get_current_user
from app.graph.sync import delete_user_safely, get_constellation, sync_user_safely
from app.models import InterestSource, InterestType, User, UserInterest
from app.schemas.auth import (
    InterestOut,
    InterestsRequest,
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    UserOut,
)
from app.schemas.graph import ConstellationInterest, ConstellationOut, ConstellationStory, ConstellationUser
from app.security import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


def _issue_token(user: User) -> TokenResponse:
    """Shared by register and login — both end with the same response shape."""
    return TokenResponse(access_token=create_access_token(str(user.id)), user=UserOut.model_validate(user))


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(
    body: RegisterRequest,
    background_tasks: BackgroundTasks,
    session: AsyncSession = Depends(get_session),
) -> TokenResponse:
    """Create a new account."""
    existing = await session.scalar(select(User).where(User.email == body.email))
    if existing is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "Email already registered")

    user = User(
        name=body.name,
        email=body.email,
        hashed_password=hash_password(body.password),
        city=body.city,
        country=body.country,
        profession=body.profession or "",
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)

    background_tasks.add_task(sync_user_safely, user, [])
    return _issue_token(user)


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, session: AsyncSession = Depends(get_session)) -> TokenResponse:
    """Authenticate and issue an access token."""
    user = await session.scalar(select(User).where(User.email == body.email))
    if user is None or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Incorrect email or password")
    return _issue_token(user)


@router.get("/me", response_model=UserOut)
async def read_current_user(user: User = Depends(get_current_user)) -> UserOut:
    """The frontend calls this on load to decide: show a name, or a login link."""
    return UserOut.model_validate(user)


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
async def delete_current_user(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> None:
    """Permanently delete the account.

    Postgres row deletion cascades to `user_interests` at the database
    level (the FK is `ondelete="CASCADE"`). The Neo4j side is deleted
    synchronously (not backgrounded, unlike writes) so the caller knows
    the graph is actually clean before this returns — but a Neo4j outage
    still can't block the deletion itself, since Postgres is canonical.
    Only ever touches this one user's node; shared Interest nodes and
    every other user are untouched.
    """
    user_id = str(user.id)
    await session.delete(user)
    await session.commit()
    await delete_user_safely(user_id)


@router.get("/me/constellation", response_model=ConstellationOut)
async def read_constellation(user: User = Depends(get_current_user)) -> ConstellationOut:
    """The Constellation page's data, fetched live from Neo4j on every
    visit — not a local cache — so it reflects exactly what's in the
    graph. Falls back to the Postgres user's basic info with an empty
    interest list if Neo4j sync hasn't landed yet, rather than erroring.
    """
    data = await get_constellation(str(user.id))
    if data is None:
        return ConstellationOut(
            user=ConstellationUser(
                id=str(user.id), name=user.name, city=user.city, country=user.country, profession=user.profession or ""
            ),
            interests=[],
        )
    return ConstellationOut(
        user=ConstellationUser(
            id=data["user"]["uid"],
            name=data["user"]["name"],
            city=data["user"]["city"],
            country=data["user"]["country"],
            profession=data["user"]["profession"],
        ),
        interests=[
            ConstellationInterest(
                id=i["uid"],
                label=i["label"],
                type=i["type"],
                source=i["origin"],
                explicit_weight=i["explicit_weight"],
                implicit_weight=i["implicit_weight"],
                negative_weight=i["negative_weight"],
                confidence=i["confidence"],
                reason=i["reason"],
                created_at=i["created_at"],
                last_reinforced_at=i["last_reinforced_at"],
            )
            for i in data["interests"]
        ],
        followed_stories=[ConstellationStory(id=s["uid"], title=s["title"], state=s["state"]) for s in data["followed_stories"]],
    )


@router.post("/me/interests", response_model=list[InterestOut], status_code=status.HTTP_201_CREATED)
async def add_interests(
    body: InterestsRequest,
    background_tasks: BackgroundTasks,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> list[InterestOut]:
    """Turn the onboarding wizard's selections into explicit interest edges."""
    grouped = {
        InterestType.HOBBY: body.hobbies,
        InterestType.TOPIC: body.topics,
        InterestType.SPORT: body.sports,
        InterestType.MOVIE: body.movies,
        InterestType.POLITICAL: body.political_interests,
    }
    labels = [(label, itype) for itype, values in grouped.items() for label in values]
    if body.other:
        labels += [(label.strip(), InterestType.OTHER) for label in body.other.split(",") if label.strip()]

    interests = [
        UserInterest(
            user_id=user.id,
            label=label,
            type=itype,
            source=InterestSource.EXPLICIT,
            explicit_weight=1.0,
            confidence=1.0,
            reason="Selected during onboarding",
        )
        for label, itype in labels
    ]
    session.add_all(interests)
    await session.commit()
    for interest in interests:
        await session.refresh(interest)

    background_tasks.add_task(sync_user_safely, user, interests)
    return [InterestOut.model_validate(i) for i in interests]
