"""Study-content generation pipeline for exam-scoped readiness contexts."""

from __future__ import annotations

import asyncio
import json
from datetime import datetime
from pathlib import Path
from typing import Any
from uuid import UUID

import anthropic
from sqlalchemy import select

from app.config import settings
from app.database import async_session
from app.models.models import ClassAggregate, Exam, StudyContent
from app.services.elevenlabs_service import synthesize_speech
from app.services.object_storage_service import put_object_bytes

STUDY_SCRIPT_PROMPT_VERSION = "study_script_v1"
_client: anthropic.AsyncAnthropic | None = None


def _get_client() -> anthropic.AsyncAnthropic:
    global _client
    if _client is None:
        _client = anthropic.AsyncAnthropic(
            api_key=settings.ANTHROPIC_API_KEY,
            timeout=settings.ANTHROPIC_TIMEOUT_SECONDS,
            max_retries=settings.ANTHROPIC_MAX_RETRIES,
        )
    return _client


def _safe_json(raw: str) -> dict[str, Any]:
    text = raw.strip()
    if text.startswith("```"):
        lines = text.splitlines()
        lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        text = "\n".join(lines).strip()
    return json.loads(text)


async def _call_claude_content_outline(
    *,
    exam_name: str,
    content_type: str,
    focus_concepts: list[str],
    weak_concepts: list[str],
) -> dict[str, Any]:
    if not settings.ANTHROPIC_API_KEY:
        joined = ", ".join(focus_concepts or weak_concepts or ["core concepts"])
        transcript = (
            f"This is a focused study guide for {exam_name}. "
            f"Today we review: {joined}. Start with definitions, then solve one worked example "
            "for each concept, then self-check using two short questions."
        )
        slides = {
            "slides": [
                {"title": "Learning goals", "bullets": [f"Review {joined}", "Build problem-solving confidence"]},
                {"title": "Study sequence", "bullets": ["Warm-up concepts", "Worked examples", "Self-check"]},
            ]
        }
        return {"transcript": transcript, "slides_data": slides}

    client = _get_client()
    focus_str = ", ".join(focus_concepts) if focus_concepts else "(none provided)"
    weak_str = ", ".join(weak_concepts) if weak_concepts else "(none found)"
    system_prompt = (
        "You are an expert educator writing concise, high-signal study materials. "
        "Respond with valid JSON only."
    )
    user_prompt = f"""
Generate study content for:
- exam: {exam_name}
- content_type: {content_type}
- focus_concepts: {focus_str}
- weak_concepts: {weak_str}

Return JSON in this schema:
{{
  "transcript": "string",
  "slides_data": {{
    "slides": [
      {{"title": "string", "bullets": ["string"]}}
    ]
  }}
}}
""".strip()
    response = await client.messages.create(
        model=settings.ANTHROPIC_MODEL,
        max_tokens=min(settings.ANTHROPIC_MAX_TOKENS, 1500),
        temperature=0.2,
        system=system_prompt,
        messages=[{"role": "user", "content": user_prompt}],
    )
    raw = "".join(block.text for block in response.content if getattr(block, "type", "") == "text")
    parsed = _safe_json(raw)
    transcript = parsed.get("transcript", "").strip()
    slides_data = parsed.get("slides_data", {"slides": []})
    if not transcript:
        raise RuntimeError("Claude response missing transcript")
    return {"transcript": transcript, "slides_data": slides_data}


def _estimate_duration_seconds(transcript: str) -> int:
    words = len([w for w in transcript.split() if w.strip()])
    return max(10, int(words / 2.6))


def _local_audio_path(content_id: UUID) -> Path:
    base = Path(settings.EXPORT_DIR) / "study_content"
    base.mkdir(parents=True, exist_ok=True)
    return base / f"{content_id}.mp3"


async def run_generation_for_content(content_id: UUID) -> None:
    """Execute the full study-content generation pipeline for one record."""
    async with async_session() as db:
        res = await db.execute(select(StudyContent).where(StudyContent.id == content_id))
        content = res.scalar_one_or_none()
        if not content:
            return

        exam_res = await db.execute(select(Exam).where(Exam.id == content.exam_id))
        exam = exam_res.scalar_one_or_none()
        if not exam:
            content.status = "failed"
            content.error_detail = "Exam not found"
            content.completed_at = datetime.utcnow()
            await db.commit()
            return

        try:
            content.status = "generating"
            await db.commit()

            focus_concepts = list(content.source_context.get("focus_concepts", []))
            include_weak = bool(content.source_context.get("include_weak_concepts", True))
            weak_concepts: list[str] = []
            if include_weak:
                weak_rows = await db.execute(
                    select(ClassAggregate.concept_id)
                    .where(ClassAggregate.exam_id == content.exam_id)
                    .order_by(ClassAggregate.mean_readiness.asc(), ClassAggregate.below_threshold_count.desc())
                    .limit(8)
                )
                weak_concepts = [row[0] for row in weak_rows.fetchall()]

            generated = await _call_claude_content_outline(
                exam_name=exam.name,
                content_type=content.content_type,
                focus_concepts=focus_concepts,
                weak_concepts=weak_concepts,
            )
            transcript = generated["transcript"]
            content.transcript = transcript
            content.slides_data = generated.get("slides_data")
            content.prompt_version = STUDY_SCRIPT_PROMPT_VERSION

            if content.content_type in {"audio", "video_walkthrough"}:
                audio_bytes = await synthesize_speech(transcript)
                local_path = _local_audio_path(content.id)
                local_path.write_bytes(audio_bytes)
                content.storage_key = f"file://{local_path}"
                content.duration_seconds = _estimate_duration_seconds(transcript)

                object_key = f"study_content/{content.exam_id}/{content.id}.mp3"
                await put_object_bytes(object_key, audio_bytes, "audio/mpeg")
            else:
                content.duration_seconds = None
                content.storage_key = None

            content.status = "completed"
            content.error_detail = None
            content.completed_at = datetime.utcnow()
            await db.commit()
        except Exception as exc:
            content.status = "failed"
            content.error_detail = str(exc)[:400]
            content.completed_at = datetime.utcnow()
            await db.commit()


def kickoff_study_content_generation(content_id: UUID) -> None:
    """Fire-and-forget launcher for study-content generation."""
    asyncio.create_task(run_generation_for_content(content_id))
