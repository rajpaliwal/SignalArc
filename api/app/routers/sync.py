"""Manual, on-demand Postgres → Neo4j sync (in addition to the automatic
per-write background sync in `app/routers/auth.py`) — useful for backfills
or repairing drift.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.postgres import get_session
from app.graph.sync import sync_all_users

router = APIRouter(prefix="/sync", tags=["sync"])


@router.post("/neo4j")
async def sync_neo4j(session: AsyncSession = Depends(get_session)) -> dict[str, int]:
    """Sync every Postgres user + their interests into Neo4j right now."""
    return await sync_all_users(session)
