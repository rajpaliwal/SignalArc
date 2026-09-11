"""Thin async OpenAI wrapper — Structured Outputs only, one call shape reused
by story clustering, story synthesis, and what-if answers."""

from openai import AsyncOpenAI
from pydantic import BaseModel

from app.config import get_settings

_client: AsyncOpenAI | None = None


def _get_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        _client = AsyncOpenAI(api_key=get_settings().openai_api_key)
    return _client


async def ask[T: BaseModel](system: str, user: str, schema: type[T]) -> T:
    """One structured-output call: `system` sets the task, `user` carries the
    data, `schema` is the Pydantic model the answer must conform to."""
    response = await _get_client().responses.parse(
        model=get_settings().openai_model,
        input=[{"role": "system", "content": system}, {"role": "user", "content": user}],
        text_format=schema,
    )
    return response.output_parsed
