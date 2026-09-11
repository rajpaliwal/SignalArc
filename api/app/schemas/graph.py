"""The Constellation page's data contract — read directly from Neo4j
(not mirrored from Postgres), so it always reflects exactly what's in the
graph. Field names deliberately match `schemas/auth.py`'s `InterestOut`
(and `source`, not the internally-renamed `origin` — see `graph/nodes.py`)
so the frontend can reuse the exact same `ApiInterest` shape either way.
"""

from datetime import datetime

from pydantic import BaseModel


class ConstellationUser(BaseModel):
    id: str
    name: str
    city: str
    country: str
    profession: str


class ConstellationInterest(BaseModel):
    id: str
    label: str
    type: str
    source: str
    explicit_weight: float
    implicit_weight: float
    negative_weight: float
    confidence: float
    reason: str
    created_at: datetime
    last_reinforced_at: datetime


class ConstellationStory(BaseModel):
    """A followed story — the graph's second level, `User-[:FOLLOWS]->Story`
    (see `app/graph/nodes.py`), rendered as the outer ring in Constellation."""

    id: str
    title: str
    state: str


class ConstellationOut(BaseModel):
    user: ConstellationUser
    interests: list[ConstellationInterest]
    followed_stories: list[ConstellationStory] = []
