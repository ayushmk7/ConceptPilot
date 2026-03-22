"""Rate-limit dependency tests."""

import pytest
from fastapi import HTTPException
from starlette.requests import Request

from app.rate_limit import _STATE, enforce_instructor_write_limit


def _request(path: str = "/api/v1/exams/abc/scores", client_host: str = "1.2.3.4") -> Request:
    scope = {
        "type": "http",
        "method": "POST",
        "path": path,
        "headers": [],
        "query_string": b"",
        "client": (client_host, 12345),
        "server": ("test", 80),
        "scheme": "http",
    }
    return Request(scope)


class TestRateLimit:
    @pytest.mark.asyncio
    async def test_daily_limit_enforced(self, monkeypatch):
        from app import rate_limit

        _STATE.clear()
        monkeypatch.setattr(rate_limit.settings, "RATE_LIMIT_COOLDOWN_SECONDS", 0, raising=False)
        monkeypatch.setattr(rate_limit.settings, "RATE_LIMIT_DAILY", 1, raising=False)

        await enforce_instructor_write_limit(_request())
        with pytest.raises(HTTPException) as exc:
            await enforce_instructor_write_limit(_request())
        assert exc.value.status_code == 429

    @pytest.mark.asyncio
    async def test_cooldown_enforced(self, monkeypatch):
        from app import rate_limit

        _STATE.clear()
        monkeypatch.setattr(rate_limit.settings, "RATE_LIMIT_COOLDOWN_SECONDS", 10, raising=False)
        monkeypatch.setattr(rate_limit.settings, "RATE_LIMIT_DAILY", 100, raising=False)

        await enforce_instructor_write_limit(_request("/api/v1/exams/abc/compute"))
        with pytest.raises(HTTPException) as exc:
            await enforce_instructor_write_limit(_request("/api/v1/exams/abc/compute"))
        assert exc.value.status_code == 429
