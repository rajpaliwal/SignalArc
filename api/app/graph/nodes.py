"""neomodel graph schema — Neo4j's equivalent of `app/models.py`.

One `Interest` node label (not one per category) carries a `type` property
instead — a user's hobbies, topics, sports, etc. are all the same kind of
graph entity, just categorised. `uid` is a stable, deterministic merge key
so repeated syncs never create duplicate nodes:

- `User.uid`     = the Postgres user id (as a string)
- `Interest.uid` = f"{type}:{label}", shared across users — two users who
  both list "Cricket" connect to the *same* Interest node, which is what
  makes the graph useful for "find people near me in interest-space"
  queries later.
"""

from neomodel import (
    AsyncRelationshipTo,
    AsyncStructuredNode,
    AsyncStructuredRel,
    DateTimeProperty,
    FloatProperty,
    StringProperty,
)


class InterestRel(AsyncStructuredRel):
    """Properties on a `(User)-[:INTERESTED_IN]->(Interest)` edge — mirrors
    `UserInterest`'s weight columns exactly."""

    origin = StringProperty(required=True)  # explicit | inferred
    explicit_weight = FloatProperty(default=0.0)
    implicit_weight = FloatProperty(default=0.0)
    negative_weight = FloatProperty(default=0.0)
    confidence = FloatProperty(default=0.0)
    reason = StringProperty(default="")
    created_at = DateTimeProperty(default_now=True)
    last_reinforced_at = DateTimeProperty(default_now=True)


class Interest(AsyncStructuredNode):
    """A topic, place, profession, hobby, sport, movie, political interest,
    or freeform 'other' entry — `type` is one of `InterestType`'s values."""

    uid = StringProperty(unique_index=True, required=True)
    label = StringProperty(required=True, index=True)
    type = StringProperty(required=True, index=True)


class Story(AsyncStructuredNode):
    """A news story a user follows — mirrors the Postgres `stories` row by
    id. Following/unfollowing (see `app/graph/sync.py:follow_story`) is what
    gives the graph a second level beyond the flat `User-INTERESTED_IN-
    >Interest` star: `User-FOLLOWS->Story`."""

    uid = StringProperty(unique_index=True, required=True)
    title = StringProperty(required=True)
    state = StringProperty(default="active")


class User(AsyncStructuredNode):
    """A registered user — mirrors the Postgres `users` row by id."""

    uid = StringProperty(unique_index=True, required=True)
    name = StringProperty(required=True)
    city = StringProperty(default="")
    country = StringProperty(default="")
    profession = StringProperty(default="")

    interests = AsyncRelationshipTo(Interest, "INTERESTED_IN", model=InterestRel)
    follows = AsyncRelationshipTo(Story, "FOLLOWS")
