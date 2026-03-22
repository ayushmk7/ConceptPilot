"""Simple in-memory rate limiting for abuse-prone instructor endpoints.

This is intentionally lightweight for single-instance deployments.
For horizontally scaled production, back this with shared storage (e.g. Redis).
"""

from __future__ import annotations

from datetime import UTC, datetime
from threading import Lock
from time import monotonic

from fastapi import HTTPException, Request, status

from app.config import settings

_LOCK = Lock()
_STATE: dict[str, dict[str, float | int | str]] = {}


def _client_key(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for", "").strip()
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client and request.client.host:
        return request.client.host
    return "unknown"


def _make_bucket_key(request: Request) -> str:
    route = request.url.path
    return f"{_client_key(request)}:{route}"


async def enforce_instructor_write_limit(request: Request) -> None:
    """Apply cooldown + daily request cap per client and route."""
    now = monotonic()
    today = datetime.now(UTC).date().isoformat()
    key = _make_bucket_key(request)
    cooldown = max(0, settings.RATE_LIMIT_COOLDOWN_SECONDS)
    daily_limit = max(1, settings.RATE_LIMIT_DAILY)

    with _LOCK:
        bucket = _STATE.get(key)
        if bucket is None:
            _STATE[key] = {"day": today, "count": 1, "last_seen": now}
            return

        if bucket["day"] != today:
            bucket["day"] = today
            bucket["count"] = 0
            bucket["last_seen"] = 0.0

        elapsed = now - float(bucket["last_seen"])
        if elapsed < cooldown:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=(
                    f"Rate limit cooldown active. "
                    f"Retry after {cooldown - int(elapsed)}s."
                ),
            )

        if int(bucket["count"]) >= daily_limit:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Daily rate limit exceeded for this endpoint.",
            )

        bucket["count"] = int(bucket["count"]) + 1
        bucket["last_seen"] = now
