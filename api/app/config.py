"""Application configuration, loaded once from environment variables / `.env`."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """All settings the app needs, in one place.

    Field names map to environment variables case-insensitively, e.g.
    `neo4j_uri` reads `NEO4J_URI`. See `.env.example` for the full list.
    """

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_env: str = "development"

    # Neo4j — the graph store (personal relevance graph + world-event graph).
    neo4j_uri: str = "bolt://localhost:7687"
    neo4j_username: str = "neo4j"
    neo4j_password: str
    neo4j_database: str = "neo4j"

    # Postgres — the canonical relational store (users, stories, jobs, etc.).
    postgres_dsn: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/signalarc"

    # Auth — JWT access tokens.
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24 * 7  # 1 week

    # Bright Data SERP API — powers the Discover news feed (app/services/serp.py).
    serp_api_key: str = ""
    serp_zone: str = "signal_arc"

    # OpenAI — story clustering/synthesis and what-if answers (app/services/llm.py).
    openai_api_key: str = ""
    openai_model: str = "gpt-5-mini"

    # Discover feed — how many stories to return by default. -1 means "no
    # limit, and actively refresh this user's topics live before answering"
    # (see GET /discover/stories in app/routers/discover.py).
    discover_default_limit: int = 5


@lru_cache
def get_settings() -> Settings:
    """Return the cached `Settings` instance, constructing it on first call.

    Deferring construction (instead of a module-level `settings = Settings()`)
    means importing this module never fails just because `.env` is missing —
    it only fails when settings are actually needed.
    """
    return Settings()
