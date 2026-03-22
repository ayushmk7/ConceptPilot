"""ElevenLabs integration — health probe and TTS for study content (audio / video_walkthrough)."""

from __future__ import annotations

import logging
import re
from typing import Any

import httpx

from app.config import settings

logger = logging.getLogger("conceptpilot.elevenlabs")

_TIMEOUT = httpx.Timeout(5.0, connect=3.0)
_TTS_TIMEOUT = httpx.Timeout(120.0, connect=10.0)


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


def split_text_for_tts(text: str, max_chars: int) -> list[str]:
    """Split transcript into segments under ElevenLabs per-request size limits.

    Paragraphs are preserved where possible; oversized paragraphs are split on
    sentence boundaries, then hard-split if needed.
    """
    text = text.strip()
    if not text:
        return []
    max_chars = max(500, int(max_chars))
    if len(text) <= max_chars:
        return [text]

    chunks: list[str] = []
    buf = ""
    for part in text.split("\n\n"):
        part = part.strip()
        if not part:
            continue
        if len(part) > max_chars:
            if buf:
                chunks.append(buf.strip())
                buf = ""
            chunks.extend(_split_oversized_block(part, max_chars))
            continue
        candidate = f"{buf}\n\n{part}" if buf else part
        if len(candidate) <= max_chars:
            buf = candidate
        else:
            if buf:
                chunks.append(buf.strip())
            buf = part
    if buf:
        chunks.append(buf.strip())
    return [c for c in chunks if c]


def _split_oversized_block(block: str, max_chars: int) -> list[str]:
    out: list[str] = []
    buf = ""
    # Sentence-ish boundaries (avoid regex catastrophic backtracking on huge strings).
    sentences = re.split(r"(?<=[.!?])\s+", block)
    for s in sentences:
        if not s:
            continue
        if len(s) > max_chars:
            if buf:
                out.append(buf.strip())
                buf = ""
            for i in range(0, len(s), max_chars):
                piece = s[i : i + max_chars].strip()
                if piece:
                    out.append(piece)
            continue
        if len(buf) + len(s) + 1 <= max_chars:
            buf = f"{buf} {s}".strip() if buf else s
        else:
            if buf:
                out.append(buf.strip())
            buf = s
    if buf:
        out.append(buf.strip())
    return out if out else [block[:max_chars]]


async def _synthesize_speech_chunk(
    text: str,
    *,
    voice_id: str,
    model_id: str,
) -> bytes:
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
    payload = {
        "text": text,
        "model_id": model_id,
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


async def synthesize_speech(
    text: str,
    *,
    voice_id: str | None = None,
    model_id: str | None = None,
) -> bytes:
    """Synthesize speech with ElevenLabs and return MP3 bytes (chunked for long text)."""
    if not _is_configured():
        raise RuntimeError("ElevenLabs is not configured")
    vid = (voice_id or settings.ELEVENLABS_VOICE_ID or "").strip()
    if not vid:
        raise RuntimeError("ELEVENLABS_VOICE_ID is required for speech synthesis (or pass voice_id)")

    mid = (model_id or settings.ELEVENLABS_MODEL_ID or "eleven_multilingual_v2").strip()

    max_chars = settings.ELEVENLABS_TTS_CHUNK_CHARS
    chunks = split_text_for_tts(text, max_chars)
    if not chunks:
        raise RuntimeError("Empty transcript for speech synthesis")

    if len(chunks) > 1:
        logger.info("ElevenLabs TTS using %d chunk(s), max_chars=%s", len(chunks), max_chars)

    parts: list[bytes] = []
    for chunk in chunks:
        parts.append(await _synthesize_speech_chunk(chunk, voice_id=vid, model_id=mid))
    return b"".join(parts)


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
