"""Queue abstraction for async compute jobs.

Backends:
- file: JSON file queue, simple single-instance local/dev setup.
- redis: shared queue suitable for multi-instance workers.
"""

from __future__ import annotations

import asyncio
import json
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Optional
from uuid import UUID

from app.config import settings


@dataclass
class ComputeQueueJob:
    exam_id: str
    run_id: str
    alpha: float
    beta: float
    gamma: float
    threshold: float
    k: int


def _queue_file_path() -> Path:
    return Path(settings.COMPUTE_QUEUE_FILE)


def _redis_url() -> str:
    return settings.COMPUTE_QUEUE_REDIS_URL.strip()


def _redis_key() -> str:
    return settings.COMPUTE_QUEUE_REDIS_KEY.strip() or "conceptpilot:compute:queue"


def _read_queue() -> list[dict]:
    queue_file = _queue_file_path()
    if not queue_file.exists():
        return []
    content = queue_file.read_text(encoding="utf-8").strip()
    if not content:
        return []
    try:
        data = json.loads(content)
        return data if isinstance(data, list) else []
    except json.JSONDecodeError:
        return []


def _write_queue(items: list[dict]) -> None:
    queue_file = _queue_file_path()
    queue_file.parent.mkdir(parents=True, exist_ok=True)
    queue_file.write_text(json.dumps(items), encoding="utf-8")


async def enqueue_compute_job(
    exam_id: UUID,
    run_id: UUID,
    alpha: float,
    beta: float,
    gamma: float,
    threshold: float,
    k: int,
) -> bool:
    """Enqueue a compute job for async processing."""
    job = ComputeQueueJob(
        exam_id=str(exam_id),
        run_id=str(run_id),
        alpha=alpha,
        beta=beta,
        gamma=gamma,
        threshold=threshold,
        k=k,
    )
    backend = settings.COMPUTE_QUEUE_BACKEND

    def _enqueue_file() -> bool:
        jobs = _read_queue()
        jobs.append(asdict(job))
        _write_queue(jobs)
        return True

    if backend == "file":
        return await asyncio.to_thread(_enqueue_file)

    if backend == "redis":
        if not _redis_url():
            return False
        try:
            import redis.asyncio as redis
        except Exception:
            return False

        client = redis.from_url(_redis_url(), decode_responses=True)
        await client.rpush(_redis_key(), json.dumps(asdict(job)))
        return True

    return False


async def pop_next_compute_job() -> Optional[ComputeQueueJob]:
    """Pop one queued compute job, returning None when queue is empty."""
    backend = settings.COMPUTE_QUEUE_BACKEND

    def _pop_file() -> Optional[ComputeQueueJob]:
        jobs = _read_queue()
        if not jobs:
            return None
        raw = jobs.pop(0)
        _write_queue(jobs)
        return ComputeQueueJob(**raw)

    if backend == "file":
        return await asyncio.to_thread(_pop_file)

    if backend == "redis":
        if not _redis_url():
            return None
        try:
            import redis.asyncio as redis
        except Exception:
            return None

        client = redis.from_url(_redis_url(), decode_responses=True)
        raw = await client.lpop(_redis_key())
        if not raw:
            return None
        return ComputeQueueJob(**json.loads(raw))

    return None
