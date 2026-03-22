"""ElevenLabs integration — health probe and TTS for study content (audio / video_walkthrough)."""

from __future__ import annotations

import logging
from typing import Any

import httpx

from app.config import settings

logger = logging.getLogger("conceptpilot.elevenlabs")

_TIMEOUT = httpx.Timeout(5.0, connect=3.0)
_TTS_TIMEOUT = httpx.Timeout(45.0, connect=5.0)


def _is_configured() -> bool:
    return bool(settings.ELEVENLABS_API_KEY and len(settings.ELEVENLABS_API_KEY) > 10)


async def check_api_reachable() -> tuple[bool, str]:
    """Lightweight reachability check against the ElevenLabs /v1/models endpoint.

    Returns (reachable, detail_message).  Never raises — callers can use the
    result to set degraded health status without failing the whole probe.
    """
    if not _is_configured():
        return False, "not_configured"

    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            resp = await client.get(
                "https://api.elevenlabs.io/v1/models",
                headers={"xi-api-key": settings.ELEVENLABS_API_KEY},
            )
        if resp.status_code == 200:
            return True, "reachable"
        if resp.status_code == 401:
            return False, "invalid_api_key"
        return False, f"unexpected_status_{resp.status_code}"
    except httpx.TimeoutException:
        return False, "timeout"
    except Exception as exc:
        logger.warning("ElevenLabs health probe failed: %s", exc)
        return False, f"error: {str(exc)[:80]}"


async def synthesize_speech(
    text: str,
    *,
    voice_id: str | None = None,
    model_id: str | None = None,
) -> bytes:
    """Synthesize speech with ElevenLabs and return MP3 bytes."""
    if not _is_configured():
        raise RuntimeError("ElevenLabs is not configured")
    vid = (voice_id or settings.ELEVENLABS_VOICE_ID or "").strip()
    if not vid:
        raise RuntimeError("ELEVENLABS_VOICE_ID is required for speech synthesis (or pass voice_id)")

    mid = (model_id or settings.ELEVENLABS_MODEL_ID or "eleven_multilingual_v2").strip()

    url = f"https://api.elevenlabs.io/v1/text-to-speech/{vid}"
    payload = {
        "text": text,
        "model_id": mid,
    }
    headers = {
        "xi-api-key": settings.ELEVENLABS_API_KEY,
        "accept": "audio/mpeg",
        "content-type": "application/json",
    }

    async with httpx.AsyncClient(timeout=_TTS_TIMEOUT) as client:
        resp = await client.post(url, json=payload, headers=headers)
        if resp.status_code == 401:
            raise RuntimeError("ElevenLabs API key rejected (401)")
        if resp.status_code >= 400:
            detail = resp.text[:200]
            raise RuntimeError(f"ElevenLabs synthesis failed ({resp.status_code}): {detail}")
        return resp.content


async def list_voices() -> list[dict[str, Any]]:
    """Return ElevenLabs voice metadata for UI pickers."""
    if not _is_configured():
        return []
    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            resp = await client.get(
                "https://api.elevenlabs.io/v1/voices",
                headers={"xi-api-key": settings.ELEVENLABS_API_KEY},
            )
        if resp.status_code != 200:
            return []
        data = resp.json()
        voices = data.get("voices") or []
        out: list[dict[str, Any]] = []
        for v in voices:
            if not isinstance(v, dict):
                continue
            vid = v.get("voice_id") or v.get("voiceId")
            if not vid:
                continue
            labels = v.get("labels") or {}
            lang = labels.get("language") or labels.get("accent") or ""
            out.append(
                {
                    "voice_id": vid,
                    "name": v.get("name") or vid,
                    "category": v.get("category"),
                    "language": lang,
                }
            )
        return out
    except Exception as exc:
        logger.warning("ElevenLabs list_voices failed: %s", exc)
        return []
