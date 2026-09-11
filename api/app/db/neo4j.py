"""Neo4j connection management via neomodel — the graph store for both the
personal relevance graph and the world-event graph.

neomodel gives us Django-style models for Neo4j (`AsyncStructuredNode`,
`AsyncRelationshipTo`, etc. — see `app/graph/nodes.py`) instead of
hand-written Cypher for everyday reads/writes. For queries that don't fit
the OGM well, `neomodel.adb.cypher_query(...)` is the escape hatch into
raw Cypher.

Call `connect()` once at app startup and `close()` once at shutdown (see
`app/main.py`'s lifespan handler).
"""

from neo4j import AsyncDriver, AsyncGraphDatabase
from neomodel import adb, get_config

from app.config import get_settings

_driver: AsyncDriver | None = None


async def connect() -> None:
    """Open our own driver (auth as a tuple) and hand it to neomodel.

    Deliberately not neomodel's `set_connection(url=...)` string form: that
    parser splits credentials out of the URL itself with a raw
    `netloc.rsplit("@", 1)` / `partition(":")` and never url-decodes the
    result. A password containing a URL-structural character (`#`, `?`,
    `/`) either corrupts the URL before neomodel even looks at it (raw) or
    survives as a literal percent-escape instead of being decoded (encoded)
    — there's no encoding that round-trips through it correctly. Passing a
    real driver with credentials as a tuple sidesteps URL parsing entirely.
    """
    global _driver
    settings = get_settings()
    get_config().database_name = settings.neo4j_database
    _driver = AsyncGraphDatabase.driver(
        settings.neo4j_uri,
        auth=(settings.neo4j_username, settings.neo4j_password),
    )
    await adb.set_connection(driver=_driver)
    await adb.cypher_query("RETURN 1")  # fails fast here if the server is unreachable
    # `unique_index=True` on a node property (see app/graph/nodes.py) is only
    # a Python-side declaration until this runs — without it Neo4j has zero
    # uniqueness enforcement, so concurrent upserts can create true duplicate
    # nodes for the same uid (found via a real `MultipleNodesReturned` crash).
    # Idempotent, safe to run on every boot.
    await adb.install_all_labels()


async def close() -> None:
    """Close neomodel's reference, then our own driver.

    neomodel only closes a driver it created itself (`url=` form); since we
    handed it one we own, we're responsible for closing it too.
    """
    global _driver
    await adb.close_connection()
    if _driver is not None:
        await _driver.close()
        _driver = None
