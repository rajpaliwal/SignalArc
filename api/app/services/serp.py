"""Bright Data SERP API client — fetches Google News results for a query.

One HTTP call per topic, no SDK: Bright Data's SERP API is just a proxy in
front of a real Google search URL (see docs.brightdata.com/scraping-automation/serp-api).
`tbm=nws` selects the News tab; `brd_json=1` asks for it pre-parsed.
"""

import re
from datetime import UTC, datetime, timedelta
from urllib.parse import quote

import httpx

from app.config import get_settings

BRIGHTDATA_URL = "https://api.brightdata.com/request"
_AGO_UNITS = {"minute": "minutes", "hour": "hours", "day": "days", "week": "weeks"}


def _parse_relative_date(text: str) -> datetime:
    """Google News gives relative timestamps ("3 hours ago"), not ISO dates.

    Naive UTC, matching the rest of the schema's timestamp columns
    (`server_default=func.now()`, also naive) — see `app/models.py`.
    """
    now = datetime.now(UTC).replace(tzinfo=None)
    match = re.match(r"(\d+)\s+(minute|hour|day|week)s?\s+ago", text.strip().lower())
    if not match:
        return now
    amount, unit = int(match[1]), _AGO_UNITS[match[2]]
    return now - timedelta(**{unit: amount})


async def search_news(query: str, count: int = 8) -> list[dict]:
    """Return up to `count` recent news articles for `query`, newest first."""
    settings = get_settings()
    search_url = f"https://www.google.com/search?q={quote(query)}&tbm=nws&brd_json=1&gl=us&hl=en"
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(
            BRIGHTDATA_URL,
            headers={"Authorization": f"Bearer {settings.serp_api_key}"},
            json={"zone": settings.serp_zone, "url": search_url, "format": "raw"},
        )
        response.raise_for_status()
        results = response.json().get("news", [])

    return [
        {
            "title": item["title"],
            "summary": item.get("description", ""),
            "source": item.get("source", "Unknown"),
            "url": f"https://www.google.com{item['link']}",
            "published_at": _parse_relative_date(item.get("date", "")),
        }
        for item in results[:count]
        if item.get("title") and item.get("link")
    ]
