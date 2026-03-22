"""Compute queue backend tests."""

import json
import uuid

import pytest

from app.services.compute_queue_service import enqueue_compute_job, pop_next_compute_job


class _FakeRedisClient:
    def __init__(self):
        self.items: list[str] = []

    async def rpush(self, _key: str, value: str):
        self.items.append(value)

    async def lpop(self, _key: str):
        if not self.items:
            return None
        return self.items.pop(0)


@pytest.mark.asyncio
async def test_redis_backend_enqueue_and_pop(monkeypatch):
    from app import config
    from app.services import compute_queue_service as cqs

    fake_client = _FakeRedisClient()
    import redis.asyncio as redis_asyncio

    monkeypatch.setattr(config.settings, "COMPUTE_QUEUE_BACKEND", "redis", raising=False)
    monkeypatch.setattr(config.settings, "COMPUTE_QUEUE_REDIS_URL", "redis://fake:6379/0", raising=False)
    monkeypatch.setattr(config.settings, "COMPUTE_QUEUE_REDIS_KEY", "cp:test:queue", raising=False)
    monkeypatch.setattr(redis_asyncio, "from_url", lambda *_args, **_kwargs: fake_client, raising=True)

    exam_id = uuid.uuid4()
    run_id = uuid.uuid4()
    ok = await enqueue_compute_job(exam_id, run_id, 1.0, 0.3, 0.2, 0.6, 4)
    assert ok is True
    assert len(fake_client.items) == 1
    raw = json.loads(fake_client.items[0])
    assert raw["exam_id"] == str(exam_id)

    popped = await pop_next_compute_job()
    assert popped is not None
    assert popped.exam_id == str(exam_id)
    assert popped.run_id == str(run_id)
