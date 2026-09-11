"""FastAPI application entrypoint. Run with `uv run fastapi dev app/main.py`."""

import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db import neo4j, postgres
from app.news.sync import run_forever as run_news_refresh
from app.routers import auth, discover, sync

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Open both database connections on startup, close them on shutdown.

    Postgres is canonical and required — a failure there aborts startup.
    Neo4j is a derived projection (see app/graph/sync.py): the app's core
    features (register/login) don't depend on it, so a connection failure
    here is logged, not fatal. Sync will simply fail (safely) until it's
    reachable and the app is restarted.

    The news refresh loop (app/news/sync.py) runs as a background task for
    the app's whole lifetime, cancelled cleanly on shutdown.
    """
    postgres.connect()
    try:
        await neo4j.connect()
    except Exception:
        logger.exception("Neo4j unavailable at startup — continuing without it; sync will fail until restarted")
    news_task = asyncio.create_task(run_news_refresh())
    yield
    news_task.cancel()
    await neo4j.close()
    await postgres.close()


app = FastAPI(title="SignalArc API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(discover.router)
app.include_router(sync.router)


@app.get("/")
def home():
    return {"message": "Hello from SignalArc"}