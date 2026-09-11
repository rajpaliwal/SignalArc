"""SQLAlchemy ORM models — Postgres is the source of truth for user
accounts and their interest graph. `app/db/neo4j.py` / future neomodel
classes hold a derived projection of the same relationships for traversal.

Mirrors the `UserProfile` / `InterestEdge` shapes already used by the
frontend (`web/lib/types.ts`), so the two sides describe the same thing.
"""

from __future__ import annotations

import enum
import uuid
from datetime import UTC, datetime

from sqlalchemy import Enum as SqlEnum
from sqlalchemy import ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.postgres import Base


def _utcnow() -> datetime:
    """Naive UTC now — the default/onupdate for every timestamp column here.

    Not `server_default=func.now()`: Postgres silently converts that to the
    *session's local timezone* (found to be Europe/London on this server —
    BST, i.e. UTC+1, for half the year) before dropping the tz to fit a
    "timestamp without time zone" column, so stored values quietly drift by
    the DST offset. Verified directly: a row written this way came back an
    hour ahead of true UTC. Computing it in Python sidesteps the DB session's
    timezone entirely.
    """
    return datetime.now(UTC).replace(tzinfo=None)


class InterestType(str, enum.Enum):
    """What kind of thing an interest edge points at."""

    TOPIC = "topic"
    PLACE = "place"
    PROFESSION = "profession"
    HOBBY = "hobby"
    SPORT = "sport"
    MOVIE = "movie"
    POLITICAL = "political"
    OTHER = "other"


class InterestSource(str, enum.Enum):
    """Whether an interest was stated directly or inferred from behaviour."""

    EXPLICIT = "explicit"
    INFERRED = "inferred"


class User(Base):
    """A registered user account."""

    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str]
    email: Mapped[str] = mapped_column(unique=True, index=True)
    hashed_password: Mapped[str]
    city: Mapped[str] = mapped_column(default="")
    country: Mapped[str] = mapped_column(default="")
    profession: Mapped[str] = mapped_column(default="")
    created_at: Mapped[datetime] = mapped_column(default=_utcnow)

    interests: Mapped[list["UserInterest"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )


class UserInterest(Base):
    """One explicit or inferred interest edge belonging to a user.

    Each row here is projected into Neo4j as a
    `(User)-[:INTERESTED_IN {..weights}]->(Topic)`-style relationship.
    """

    __tablename__ = "user_interests"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    label: Mapped[str]
    type: Mapped[InterestType] = mapped_column(SqlEnum(InterestType))
    source: Mapped[InterestSource] = mapped_column(SqlEnum(InterestSource))
    explicit_weight: Mapped[float] = mapped_column(default=0.0)
    implicit_weight: Mapped[float] = mapped_column(default=0.0)
    negative_weight: Mapped[float] = mapped_column(default=0.0)
    confidence: Mapped[float] = mapped_column(default=0.0)
    reason: Mapped[str] = mapped_column(default="")
    created_at: Mapped[datetime] = mapped_column(default=_utcnow)
    last_reinforced_at: Mapped[datetime] = mapped_column(default=_utcnow, onupdate=_utcnow)

    user: Mapped[User] = relationship(back_populates="interests")


class Story(Base):
    """A news story clustered from one or more related articles about the
    same real-world event — one row per event, not per article.
    `app/news/sync.py` is the only writer: an LLM decides whether each new
    article continues an existing story (even a causally-related follow-up
    with no wording in common, e.g. a resignation forced by a protest) or
    starts a new one, then narrates the umbrella from all its articles.
    """

    __tablename__ = "stories"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    title: Mapped[str]
    summary: Mapped[str] = mapped_column(default="")
    cause: Mapped[str] = mapped_column(default="")  # "how it started", LLM-synthesized
    topic: Mapped[str] = mapped_column(index=True)
    state: Mapped[str] = mapped_column(default="active")
    timeline: Mapped[list[dict]] = mapped_column(JSONB, default=list)
    analysis: Mapped[dict] = mapped_column(JSONB, default=dict)
    what_if_seeds: Mapped[list[str]] = mapped_column(JSONB, default=list)
    # NULL (or older than updated_at) means analysis/what_if_seeds are stale
    # or never computed — analysis is only synthesized on first request for
    # it (see app/news/sync.py:ensure_analysis), never during background sync.
    analysis_synced_at: Mapped[datetime | None] = mapped_column(nullable=True, default=None)
    first_seen_at: Mapped[datetime] = mapped_column(default=_utcnow)
    # No onupdate: `onupdate` fires on ANY write to the row, including
    # ensure_analysis's own commit — which would bump this a moment after
    # analysis_synced_at is set, making the staleness check see itself as
    # stale forever. Only app/news/sync.py explicitly sets this, exactly
    # when a genuinely new article arrives.
    updated_at: Mapped[datetime] = mapped_column(default=_utcnow)

    sources: Mapped[list["StorySource"]] = relationship(
        back_populates="story", cascade="all, delete-orphan", order_by="StorySource.published_at"
    )


class StorySource(Base):
    """One article folded into a `Story`'s umbrella. `headline`/`summary` are
    that article's own title/snippet — kept per-source (distinct from the
    umbrella's own title/summary) so synthesis has real per-article content
    to build a timeline from."""

    __tablename__ = "story_sources"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    story_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("stories.id", ondelete="CASCADE"), index=True)
    name: Mapped[str]
    headline: Mapped[str] = mapped_column(default="")
    summary: Mapped[str] = mapped_column(default="")
    url: Mapped[str]
    published_at: Mapped[datetime] = mapped_column(default=_utcnow)

    story: Mapped[Story] = relationship(back_populates="sources")
