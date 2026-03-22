"""ElevenLabs integration — P1 config/health probe; P2 will add full TTS pipeline."""

from __future__ import annotations

import logging

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


async def synthesize_speech(text: str) -> bytes:
    """Synthesize speech with ElevenLabs and return MP3 bytes."""
    if not _is_configured():
        raise RuntimeError("ElevenLabs is not configured")
    if not settings.ELEVENLABS_VOICE_ID:
        raise RuntimeError("ELEVENLABS_VOICE_ID is required for speech synthesis")

    url = f"https://api.elevenlabs.io/v1/text-to-speech/{settings.ELEVENLABS_VOICE_ID}"
    payload = {
        "text": text,
        "model_id": settings.ELEVENLABS_MODEL_ID,
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
