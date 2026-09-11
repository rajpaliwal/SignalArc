"""Structured-output shapes for the two LLM calls in `app/news/sync.py`."""

from typing import Literal

from pydantic import BaseModel


class ArticleAssignment(BaseModel):
    """What to do with one new article, in the same order it was given."""

    action: Literal["match", "new"]
    story_id: str = ""  # an id from the candidate list, when action == "match"
    group: str = ""  # shared by new articles about the same emerging event
    title: str = ""  # proposed umbrella title, when action == "new"


class ClassifyResult(BaseModel):
    assignments: list[ArticleAssignment]


class TimelineItem(BaseModel):
    date: str
    title: str
    description: str
    highlight: bool


class CoreSynthesis(BaseModel):
    """The umbrella's narrative — always kept up to date, since it's shown
    on the Discover list itself, not behind a tab."""

    title: str
    summary: str
    cause: str
    state: Literal["breaking", "active", "slow", "dormant", "resolved"]
    timeline: list[TimelineItem]


class AnalysisSynthesis(BaseModel):
    """The expensive, opinionated part — computed only when a reader
    actually opens the Analysis or What-if tab, not during background sync."""

    key_drivers: list[str]
    risks: list[str]
    outlook: str
    what_if_seeds: list[str]
