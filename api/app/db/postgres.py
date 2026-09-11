"""Postgres connection management — the canonical relational store (users,
stories, versions, subscriptions, jobs, feedback, audit history).

Call `connect()` once at app startup and `close()` once at shutdown (see
`app/main.py`'s lifespan handler). Routes depend on `get_session` to obtain
a request-scoped session. `Base` is the shared declarative base future ORM
models should inherit from.
"""

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import get_settings


class Base(DeclarativeBase):
    """Shared declarative base for all future ORM models."""


_engine: AsyncEngine | None = None
_session_factory: async_sessionmaker[AsyncSession] | None = None


def connect() -> None:
    """Create the async engine and session factory."""
    global _engine, _session_factory
    _engine = create_async_engine(get_settings().postgres_dsn, pool_pre_ping=True)
    _session_factory = async_sessionmaker(_engine, expire_on_commit=False)


async def close() -> None:
    """Dispose of the engine's connection pool."""
    if _engine is not None:
        await _engine.dispose()


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency yielding a Postgres session scoped to one request.

    Usage: `session: AsyncSession = Depends(get_session)` in a route.
    """
    if _session_factory is None:
        raise RuntimeError("Postgres engine not initialised — was connect() called at startup?")
    async with _session_factory() as session:
        yield session


def new_session() -> AsyncSession:
    """A session for code that runs outside FastAPI's request scope (e.g.
    the background news refresh loop). Usage: `async with new_session() as s`.
    """
    if _session_factory is None:
        raise RuntimeError("Postgres engine not initialised — was connect() called at startup?")
    return _session_factory()
