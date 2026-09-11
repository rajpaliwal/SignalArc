"""What the `/discover` endpoints return — trimmed to what
`app/news/sync.py` actually populates on a `Story`."""

import uuid
from datetime import datetime

from pydantic import BaseModel


class SourceOut(BaseModel):
    name: str
    headline: str
    summary: str
    url: str
    published_at: datetime


class TimelineItemOut(BaseModel):
    date: str
    title: str
    description: str
    highlight: bool


class AnalysisOut(BaseModel):
    """Empty until a reader opens the Analysis/What-if tab — see
    `ensure_analysis` in `app/news/sync.py`, never computed eagerly."""

    key_drivers: list[str] = []
    risks: list[str] = []
    outlook: str = ""
    what_if_seeds: list[str] = []


class StoryOut(BaseModel):
    id: uuid.UUID
    title: str
    summary: str
    cause: str
    topic: str
    state: str
    timeline: list[TimelineItemOut]
    analysis: AnalysisOut
    first_seen_at: datetime
    updated_at: datetime
    sources: list[SourceOut]


class WhatIfRequest(BaseModel):
    question: str


class SearchRequest(BaseModel):
    query: str


class FollowRequest(BaseModel):
    following: bool
