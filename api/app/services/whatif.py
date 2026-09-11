"""Grounded what-if answers for a story: its own articles as context, plus
one fresh web search for anything that's happened since it was last
synthesized — then one LLM call for a scenario grounded in both, not a
guess from the model's own training data."""

import logging
from typing import Literal

from pydantic import BaseModel

from app.models import Story
from app.services.llm import ask
from app.services.serp import search_news

logger = logging.getLogger(__name__)

SYSTEM = (
    "You answer a hypothetical 'what if' question about a real, ongoing news story. Ground your "
    "answer in the provided context and fresh search results — never invent facts. State your "
    "assumptions explicitly and rate your confidence honestly; this is a scenario, not a claim."
)


class WhatIfAnswer(BaseModel):
    scenario: str
    assumptions: list[str]
    confidence: Literal["low", "medium", "high"]


async def answer_what_if(story: Story, question: str) -> WhatIfAnswer:
    known = "\n".join(f"- ({s.published_at.date()}) {s.name}: {s.headline}" for s in story.sources) or "(no articles yet)"

    try:
        fresh_articles = await search_news(f"{story.title} {question}", count=5)
    except Exception:
        logger.exception("Grounding search failed for what-if on story %s", story.id)
        fresh_articles = []
    fresh = "\n".join(f"- ({a['published_at'].date()}) {a['source']}: {a['title']}" for a in fresh_articles) or "(no fresh results)"

    context = (
        f"STORY: {story.title}\nSUMMARY: {story.summary}\nCAUSE: {story.cause}\n\n"
        f"KNOWN ARTICLES:\n{known}\n\nFRESH SEARCH RESULTS:\n{fresh}\n\nQUESTION: {question}"
    )
    return await ask(SYSTEM, context, WhatIfAnswer)
