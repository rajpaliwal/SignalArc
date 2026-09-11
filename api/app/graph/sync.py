"""Mirrors Postgres user/interest data into Neo4j.

Idempotent — safe to call repeatedly for the same user without creating
duplicate nodes or relationships. Reused by both the automatic background
sync (fires after every write, see `app/routers/auth.py`) and the manual
bulk `POST /sync/neo4j` endpoint (see `app/routers/sync.py`).

Note on idempotency: `AsyncRelationshipTo.connect()` MERGEs on the full
relationship pattern *including its properties*, so calling it again with
any changed property (e.g. a new confidence score) would create a second,
duplicate edge rather than updating the first. So relationships are
synced as "look up, then update-or-create" instead of a bare `connect()`.
"""

import asyncio
import logging

from neomodel import adb
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.graph.nodes import Interest, InterestRel, Story
from app.graph.nodes import User as GraphUser
from app.models import InterestSource, InterestType
from app.models import User as PgUser
from app.models import UserInterest

logger = logging.getLogger(__name__)


def _interest_uid(interest: UserInterest) -> str:
    """Merge key shared across users with the same (type, label) — lets
    the graph connect users who share an interest to the same node."""
    return f"{interest.type.value}:{interest.label.strip().lower()}"


async def sync_user(user: PgUser, interests: list[UserInterest]) -> None:
    """Idempotently mirror one Postgres user + their interests into Neo4j."""
    graph_users = await GraphUser.nodes.bulk_create_or_update(
        {
            "uid": str(user.id),
            "name": user.name,
            "city": user.city,
            "country": user.country,
            "profession": user.profession or "",
        },
        merge_by={"keys": ["uid"]},
    )
    graph_user = graph_users[0]

    for interest in interests:
        graph_interests = await Interest.nodes.bulk_create_or_update(
            {"uid": _interest_uid(interest), "label": interest.label, "type": interest.type.value},
            merge_by={"keys": ["uid"]},
        )
        await _upsert_interest_edge(graph_user, graph_interests[0], interest)


async def _upsert_interest_edge(graph_user: GraphUser, graph_interest: Interest, interest: UserInterest) -> None:
    """Create the `INTERESTED_IN` edge if it's new, else update its properties in place."""
    edge_properties = {
        "origin": interest.source.value,
        "explicit_weight": interest.explicit_weight,
        "implicit_weight": interest.implicit_weight,
        "negative_weight": interest.negative_weight,
        "confidence": interest.confidence,
        "reason": interest.reason,
        "last_reinforced_at": interest.last_reinforced_at,
    }
    existing_rel: InterestRel | None = await graph_user.interests.relationship(graph_interest)
    if existing_rel is None:
        await graph_user.interests.connect(graph_interest, edge_properties)
        return
    for key, value in edge_properties.items():
        setattr(existing_rel, key, value)
    await existing_rel.save()


async def reinforce_interest(session: AsyncSession, user: PgUser, label: str, delta: float) -> UserInterest:
    """Follow/unfollow reinforcement: strengthens or weakens the
    `UserInterest` row for a story's topic — an inferred signal, created if
    the user never explicitly picked this one. Weight is clamped to [0, 1];
    the caller (see `app/routers/discover.py`) syncs the result to Neo4j
    the same way any other interest write does, via `sync_user_safely`.
    """
    interest = await session.scalar(select(UserInterest).where(UserInterest.user_id == user.id, UserInterest.label == label))
    if interest is None:
        interest = UserInterest(
            user_id=user.id, label=label, type=InterestType.TOPIC, source=InterestSource.INFERRED, reason="Followed a story about this"
        )
        session.add(interest)
    interest.implicit_weight = max(0.0, min(1.0, interest.implicit_weight + delta))
    interest.confidence = max(interest.confidence, 0.5)
    await session.commit()
    await session.refresh(interest)
    return interest


async def follow_story(user_id: str, story_id: str, title: str, state: str) -> None:
    """Connects `User-[:FOLLOWS]->Story` — the graph's second level beyond
    the flat interest star (see `app/graph/nodes.py:Story`)."""
    graph_user = await GraphUser.nodes.get(uid=user_id)
    graph_stories = await Story.nodes.bulk_create_or_update({"uid": story_id, "title": title, "state": state}, merge_by={"keys": ["uid"]})
    await graph_user.follows.connect(graph_stories[0])


async def unfollow_story(user_id: str, story_id: str) -> None:
    try:
        graph_user = await GraphUser.nodes.get(uid=user_id)
        story = await Story.nodes.get(uid=story_id)
    except (GraphUser.DoesNotExist, Story.DoesNotExist):
        return
    await graph_user.follows.disconnect(story)


async def follow_story_safely(user_id: str, story_id: str, title: str, state: str) -> None:
    try:
        await follow_story(user_id, story_id, title, state)
    except Exception:
        logger.exception("Neo4j follow failed for user %s story %s", user_id, story_id)


async def unfollow_story_safely(user_id: str, story_id: str) -> None:
    try:
        await unfollow_story(user_id, story_id)
    except Exception:
        logger.exception("Neo4j unfollow failed for user %s story %s", user_id, story_id)


async def sync_user_safely(user: PgUser, interests: list[UserInterest]) -> None:
    """`sync_user`, but never raises.

    Used for the automatic background sync: by the time this runs, the
    Postgres-facing HTTP response has already been sent, so a Neo4j hiccup
    here must not surface as an unhandled background-task exception — it's
    logged and dropped instead. The manual `/sync/neo4j` endpoint exists
    precisely to recover from drift this causes.
    """
    try:
        await sync_user(user, interests)
    except Exception:
        logger.exception("Background Neo4j sync failed for user %s", user.id)


async def delete_user(user_id: str) -> None:
    """Remove one user's node and every relationship touching it from Neo4j.

    `DETACH DELETE` only removes the matched node (`u`) and its edges —
    the `Interest` nodes on the other end are shared across users (see
    `_interest_uid`) and are left completely untouched, so this can never
    affect anyone else's data.
    """
    await adb.cypher_query("MATCH (u:User {uid: $uid}) DETACH DELETE u", {"uid": user_id})


async def _still_in_graph(user_id: str) -> bool:
    results, _ = await adb.cypher_query("MATCH (u:User {uid: $uid}) RETURN count(u)", {"uid": user_id})
    return results[0][0] > 0


async def delete_user_safely(user_id: str, attempts: int = 3) -> None:
    """`delete_user`, but held to a stricter guarantee than the best-effort
    background sync: an explicit "delete everything" request shouldn't
    silently leave a stray node behind just because of one transient
    hiccup. Retries on failure, and re-checks that the node is actually
    gone rather than trusting the query merely didn't raise — never raises
    itself, since the Postgres row (canonical) is already gone by the time
    this runs and a 500 here wouldn't undo that.
    """
    for attempt in range(1, attempts + 1):
        try:
            await delete_user(user_id)
            if not await _still_in_graph(user_id):
                return
            logger.warning(
                "Neo4j delete for user %s ran but the node is still there (attempt %d/%d)",
                user_id,
                attempt,
                attempts,
            )
        except Exception:
            logger.exception("Neo4j delete failed for user %s (attempt %d/%d)", user_id, attempt, attempts)
        if attempt < attempts:
            await asyncio.sleep(0.5 * attempt)
    logger.error("Giving up deleting user %s from Neo4j after %d attempts — needs manual cleanup", user_id, attempts)


async def get_constellation(user_id: str) -> dict | None:
    """Fetch a user's full constellation straight from Neo4j: their node,
    every connected `Interest`, and each edge's properties.

    This is the one place we deliberately read the graph itself instead of
    mirroring Postgres — it's what fixes the Constellation page appearing
    empty after logging back in (the frontend was never fetching stored
    interests on login at all, only ever writing new ones during
    onboarding). Reuses the same node classes and `.relationship()` lookup
    `_upsert_interest_edge` already uses, just for reading instead of
    writing. Returns `None` if the user has no Neo4j presence yet.
    """
    try:
        graph_user = await GraphUser.nodes.get(uid=user_id)
    except GraphUser.DoesNotExist:
        return None

    interests = []
    for interest in await graph_user.interests.all():
        rel: InterestRel = await graph_user.interests.relationship(interest)
        interests.append(
            {
                "uid": interest.uid,
                "label": interest.label,
                "type": interest.type,
                "origin": rel.origin,
                "explicit_weight": rel.explicit_weight,
                "implicit_weight": rel.implicit_weight,
                "negative_weight": rel.negative_weight,
                "confidence": rel.confidence,
                "reason": rel.reason,
                "created_at": rel.created_at,
                "last_reinforced_at": rel.last_reinforced_at,
            }
        )

    followed_stories = [{"uid": s.uid, "title": s.title, "state": s.state} for s in await graph_user.follows.all()]

    return {
        "user": {
            "uid": graph_user.uid,
            "name": graph_user.name,
            "city": graph_user.city,
            "country": graph_user.country,
            "profession": graph_user.profession,
        },
        "interests": interests,
        "followed_stories": followed_stories,
    }


async def sync_all_users(session: AsyncSession) -> dict[str, int]:
    """Bulk-sync every Postgres user into Neo4j.

    One user's failure doesn't abort the rest — returns how many succeeded
    vs. failed so the caller can tell if a rerun is needed.
    """
    result = await session.execute(select(PgUser).options(selectinload(PgUser.interests)))
    users = result.scalars().all()
    synced, failed = 0, 0
    for user in users:
        try:
            await sync_user(user, user.interests)
            synced += 1
        except Exception:
            logger.exception("Neo4j sync failed for user %s", user.id)
            failed += 1
    return {"synced": synced, "failed": failed}
