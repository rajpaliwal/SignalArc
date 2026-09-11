"""Fetches trending news per interest topic and clusters related articles
into `Story` "umbrellas" — one row per real-world event, not per article.
An LLM decides clustering (so a causally-related follow-up with no shared
wording, e.g. a resignation forced by a protest, still joins the protest's
story) and narrates each umbrella incrementally: only the newly arrived
articles are fed in alongside the existing brief, which is cheaper than
re-digesting a story's full article history every cycle and also means the
brief reads as "previous summary + what's new" rather than starting over.

The opinionated, expensive part (key drivers/risks/outlook/what-if seeds) is
deliberately NOT computed here — see `ensure_analysis`, called on-demand by
`app/routers/discover.py` only when a reader opens that tab.

Runs forever in the background (started from `app/main.py`'s lifespan),
refreshing every `REFRESH_SECONDS`. The only writer of `Story` rows.
`refresh_topic` also powers on-demand search (see `POST /discover/search`).
"""

import asyncio
import logging
from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.postgres import new_session
from app.models import Story, StorySource, UserInterest
from app.news.schemas import AnalysisSynthesis, ClassifyResult, CoreSynthesis
from app.services.llm import ask
from app.services.serp import search_news

logger = logging.getLogger(__name__)

REFRESH_SECONDS = 15 * 60
CANDIDATE_WINDOW_DAYS = 14  # how far back a new article can still join an existing story
CANDIDATE_LIMIT = 60
MIN_SOURCES_TO_SYNTHESIZE = 2  # a single article has nothing to narrate yet

CLASSIFY_SYSTEM = (
    "You cluster news articles into ongoing 'story umbrellas'. Given new articles and a list of "
    "existing recent stories (with summaries), decide for each article whether it continues one of "
    "the existing stories — including a causally related follow-up that shares no wording with it, "
    "e.g. an official's resignation belongs to the protest story that forced it — or starts a new "
    "one. Every genuinely new article needs a `group` label; articles about the same emerging event "
    "must share the same group so they become one story together instead of separate ones."
)

CORE_SYSTEM = (
    "You maintain a neutral, evolving news-umbrella brief. You're given its current state and only "
    "the articles that arrived since the last update — merge the new information into an updated "
    "brief rather than starting over. Produce: a short umbrella title general enough to cover future "
    "follow-ups, an updated summary, a one-paragraph cause ('how it started' — keep this stable "
    "unless the new articles genuinely change the origin story), the current state, and an updated "
    "timeline (keep prior highlights, add new dated entries, mark pivotal ones highlight=true)."
)

ANALYSIS_SYSTEM = (
    "You analyze an ongoing news story for a reader thinking ahead. Given its summary, cause and "
    "timeline, produce key drivers, risks, an outlook, and 2-3 good what-if questions a reader might "
    "ask about where this goes next."
)


def _digest(rows: list[dict]) -> str:
    """One row per line, ' | '-joined — cheaper and just as legible to an LLM as JSON here."""
    return "\n".join(" | ".join(f"{k}={v}" for k, v in row.items()) for row in rows)


async def _topics() -> list[str]:
    """Every distinct interest label across all users — the topic starters."""
    async with new_session() as session:
        return list(await session.scalars(select(UserInterest.label).distinct()))


async def _candidates(session: AsyncSession) -> list[Story]:
    """Recently active stories a new article could plausibly continue — not
    filtered by topic, so a follow-up found under a different search topic
    can still join the right umbrella."""
    cutoff = datetime.now(UTC).replace(tzinfo=None) - timedelta(days=CANDIDATE_WINDOW_DAYS)
    return list(
        await session.scalars(
            select(Story)
            .where(Story.updated_at >= cutoff)
            .options(selectinload(Story.sources))
            .order_by(Story.updated_at.desc())
            .limit(CANDIDATE_LIMIT)
        )
    )


async def _classify(articles: list[dict], candidates: list[Story]) -> ClassifyResult:
    candidate_text = _digest([{"id": s.id, "title": s.title, "summary": s.summary} for s in candidates]) or "(none yet)"
    article_text = _digest([{"i": i, "title": a["title"], "summary": a["summary"]} for i, a in enumerate(articles)])
    return await ask(
        CLASSIFY_SYSTEM,
        f"EXISTING STORIES:\n{candidate_text}\n\nNEW ARTICLES:\n{article_text}",
        ClassifyResult,
    )


async def _synthesize_core(story: Story, new_sources: list[StorySource]) -> CoreSynthesis:
    # For a brand-new Story not yet flushed, unset JSONB/str columns read as
    # None in Python (their `default=` only applies at flush) — guard rather
    # than crash iterating None.
    prior_timeline = _digest(story.timeline or []) or "(none yet)"
    new_articles = _digest([{"date": s.published_at.date(), "source": s.name, "headline": s.headline, "summary": s.summary} for s in new_sources])
    return await ask(
        CORE_SYSTEM,
        f"CURRENT TITLE: {story.title}\nCURRENT SUMMARY: {story.summary}\nCURRENT CAUSE: {story.cause or ''}\n"
        f"CURRENT TIMELINE:\n{prior_timeline}\n\nNEW ARTICLES SINCE LAST UPDATE:\n{new_articles}",
        CoreSynthesis,
    )


async def ensure_analysis(story: Story, session: AsyncSession) -> None:
    """Computes and caches key_drivers/risks/outlook/what_if_seeds — but
    only if stale or missing. Called from the API layer exactly when a
    reader opens the Analysis or What-if tab, never during background sync,
    so stories nobody looks that closely at never cost this LLM call."""
    if story.analysis_synced_at is not None and story.analysis_synced_at >= story.updated_at:
        return
    timeline_text = _digest(story.timeline) or "(none yet)"
    synthesis: AnalysisSynthesis = await ask(
        ANALYSIS_SYSTEM,
        f"TITLE: {story.title}\nSUMMARY: {story.summary}\nCAUSE: {story.cause}\n\nTIMELINE:\n{timeline_text}",
        AnalysisSynthesis,
    )
    story.analysis = {"key_drivers": synthesis.key_drivers, "risks": synthesis.risks, "outlook": synthesis.outlook}
    story.what_if_seeds = synthesis.what_if_seeds
    story.analysis_synced_at = datetime.now(UTC).replace(tzinfo=None)
    await session.commit()


async def refresh_topic(topic: str, *, force_synthesis: bool = False) -> Story | None:
    """Fetch this topic's latest articles, let the LLM assign each one to an
    existing story or a new one, then incrementally re-narrate whichever
    stories changed. Returns the story the first article ended up in —
    `refresh_all` ignores this; on-demand search (`POST /discover/search`)
    uses it directly to answer with the best match right away."""
    articles = await search_news(topic)
    if not articles:
        return None

    async with new_session() as session:
        candidates = await _candidates(session)
        result = await _classify(articles, candidates)
        by_id = {str(c.id): c for c in candidates}

        new_groups: dict[str, Story] = {}
        new_sources: dict[Story, list[StorySource]] = {}
        primary_story: Story | None = None

        for assignment, article in zip(result.assignments, articles, strict=False):
            story = by_id.get(assignment.story_id) if assignment.action == "match" else None
            if story is None:
                group_key = assignment.group or assignment.story_id or article["title"]
                story = new_groups.get(group_key)
                if story is None:
                    story = Story(title=assignment.title or article["title"], summary=article["summary"], topic=topic)
                    session.add(story)
                    new_groups[group_key] = story
            if primary_story is None:
                primary_story = story

            if not any(src.name == article["source"] for src in story.sources):
                # Dedup by outlet, not URL: Bright Data's Google redirect token for the
                # same article isn't stable across separate fetches (verified empirically).
                source = StorySource(
                    name=article["source"],
                    headline=article["title"],
                    summary=article["summary"],
                    url=article["url"],
                    published_at=article["published_at"],
                )
                story.sources.append(source)
                story.updated_at = datetime.now(UTC).replace(tzinfo=None)
                new_sources.setdefault(story, []).append(source)

        for story, sources in new_sources.items():
            if len(story.sources) < MIN_SOURCES_TO_SYNTHESIZE and not (force_synthesis and story is primary_story):
                continue  # one article alone has nothing to narrate yet — its own title/summary stand in
            try:
                core = await _synthesize_core(story, sources)
                story.title = core.title
                story.summary = core.summary
                story.cause = core.cause
                story.state = core.state
                story.timeline = [t.model_dump() for t in core.timeline]
            except Exception:
                logger.exception("Story synthesis failed for %s", story.id)

        await session.commit()
        if primary_story is not None:
            await session.refresh(primary_story, attribute_names=["sources"])
        return primary_story


async def refresh_all() -> None:
    """One topic's failure (bad query, transient API error) never blocks the rest."""
    for topic in await _topics():
        try:
            await refresh_topic(topic)
        except Exception:
            logger.exception("News refresh failed for topic %r", topic)


async def run_forever() -> None:
    """Refreshes immediately, then every `REFRESH_SECONDS`, until cancelled."""
    while True:
        await refresh_all()
        await asyncio.sleep(REFRESH_SECONDS)
