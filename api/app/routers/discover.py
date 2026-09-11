"""The Discover feed, story detail, on-demand search, and grounded what-if —
umbrellas clustered and narrated by `app/news/sync.py`."""

import logging
import uuid
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import get_settings
from app.db.postgres import get_session
from app.deps import get_current_user
from app.graph.sync import follow_story_safely, reinforce_interest, sync_user_safely, unfollow_story_safely
from app.models import Story, User, UserInterest
from app.news.sync import ensure_analysis, refresh_topic
from app.schemas.discover import AnalysisOut, FollowRequest, SearchRequest, SourceOut, StoryOut, TimelineItemOut, WhatIfRequest
from app.services.whatif import WhatIfAnswer, answer_what_if

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/discover", tags=["discover"])


def _analysis_out(story: Story) -> AnalysisOut:
    a = story.analysis or {}
    return AnalysisOut(key_drivers=a.get("key_drivers", []), risks=a.get("risks", []), outlook=a.get("outlook", ""), what_if_seeds=story.what_if_seeds)


def _to_story_out(story: Story) -> StoryOut:
    return StoryOut(
        id=story.id,
        title=story.title,
        summary=story.summary,
        cause=story.cause,
        topic=story.topic,
        state=story.state,
        timeline=[TimelineItemOut(**t) for t in story.timeline],
        analysis=_analysis_out(story),
        first_seen_at=story.first_seen_at,
        updated_at=story.updated_at,
        sources=[
            SourceOut(name=s.name, headline=s.headline, summary=s.summary, url=s.url, published_at=s.published_at)
            for s in story.sources
        ],
    )


async def _get_story_or_404(story_id: uuid.UUID, session: AsyncSession) -> Story:
    story = await session.get(Story, story_id, options=[selectinload(Story.sources)])
    if story is None:
        raise HTTPException(404, "Story not found")
    return story


@router.get("/stories", response_model=list[StoryOut])
async def list_stories(
    limit: int | None = Query(default=None, description="How many stories to return. -1 = no limit, and actively refresh live first."),
    within_hours: int | None = Query(default=None, description="Only stories updated within this many hours."),
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> list[StoryOut]:
    """Stories whose topic matches one of the current user's interests,
    most recently developing first."""
    labels = list(await session.scalars(select(UserInterest.label).where(UserInterest.user_id == user.id)))
    if not labels:
        return []
    topics = {label.lower() for label in labels}
    effective_limit = get_settings().discover_default_limit if limit is None else limit

    if effective_limit == -1:
        # Opted into "actively look for developments" — worth the extra LLM/SERP
        # calls only because the user explicitly asked for it right now.
        for label in labels:
            try:
                await refresh_topic(label)
            except Exception:
                logger.exception("Live refresh failed for topic %r", label)

    query = select(Story).where(func.lower(Story.topic).in_(topics)).options(selectinload(Story.sources)).order_by(Story.updated_at.desc())
    if within_hours is not None:
        cutoff = datetime.now(UTC).replace(tzinfo=None) - timedelta(hours=within_hours)
        query = query.where(Story.updated_at >= cutoff)
    if effective_limit != -1:
        query = query.limit(effective_limit)

    stories = await session.scalars(query)
    return [_to_story_out(s) for s in stories]


@router.post("/search", response_model=StoryOut)
async def search_story(
    body: SearchRequest,
    user: User = Depends(get_current_user),
) -> StoryOut:
    """On-demand: fetches this exact query right now and either folds it into
    a semantically matching existing story or narrates a brand new one —
    reuses the same clustering/synthesis the background pipeline runs on,
    just triggered immediately instead of waiting for the next cycle."""
    story = await refresh_topic(body.query.strip(), force_synthesis=True)
    if story is None:
        raise HTTPException(404, "No news found for that search")
    return _to_story_out(story)


@router.get("/stories/{story_id}", response_model=StoryOut)
async def get_story(
    story_id: uuid.UUID,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> StoryOut:
    return _to_story_out(await _get_story_or_404(story_id, session))


@router.get("/stories/{story_id}/analysis", response_model=AnalysisOut)
async def get_analysis(
    story_id: uuid.UUID,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> AnalysisOut:
    """Computed on first request, cached after — never during background
    sync — so stories nobody opens this tab for never cost the LLM call."""
    story = await _get_story_or_404(story_id, session)
    await ensure_analysis(story, session)
    return _analysis_out(story)


@router.post("/stories/{story_id}/whatif", response_model=WhatIfAnswer)
async def ask_what_if(
    story_id: uuid.UUID,
    body: WhatIfRequest,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> WhatIfAnswer:
    story = await _get_story_or_404(story_id, session)
    return await answer_what_if(story, body.question)


@router.post("/stories/{story_id}/follow", status_code=204)
async def set_follow(
    story_id: uuid.UUID,
    body: FollowRequest,
    background_tasks: BackgroundTasks,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> None:
    """Following/unfollowing is itself a relevance signal: it strengthens
    or weakens the user's interest in this story's topic (an inferred
    `UserInterest`, created if they never explicitly picked it) and adds or
    removes a real `User-[:FOLLOWS]->Story` edge in Neo4j — the graph's
    second level beyond the flat interest star, rendered as Constellation's
    outer ring."""
    story = await _get_story_or_404(story_id, session)
    interest = await reinforce_interest(session, user, story.topic, 0.25 if body.following else -0.25)
    background_tasks.add_task(sync_user_safely, user, [interest])
    if body.following:
        background_tasks.add_task(follow_story_safely, str(user.id), str(story.id), story.title, story.state)
    else:
        background_tasks.add_task(unfollow_story_safely, str(user.id), str(story.id))
