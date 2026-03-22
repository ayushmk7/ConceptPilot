"""Extract text from study material files and draft a concept graph via Claude."""

from __future__ import annotations

import io
import json
from typing import Any

import anthropic

from app.config import settings
from app.services.graph_service import validate_graph


def extract_text_from_upload(filename: str, content: bytes) -> str:
    """Best-effort text extraction for PDF or plain text."""
    lower = (filename or "").lower()
    if lower.endswith(".pdf"):
        try:
            from pypdf import PdfReader
        except ImportError as exc:
            raise RuntimeError("PDF support requires pypdf") from exc
        reader = PdfReader(io.BytesIO(content))
        parts: list[str] = []
        for page in reader.pages:
            t = page.extract_text()
            if t:
                parts.append(t)
        return "\n".join(parts).strip()
    return content.decode("utf-8", errors="replace").strip()


async def generate_concept_graph_from_text(*, exam_name: str, text: str) -> dict[str, Any]:
    """Return graph_json dict with nodes/edges (DAG)."""
    snippet = text[:12000]
    if not (settings.ANTHROPIC_API_KEY or "").strip():
        raise RuntimeError(
            "Generating a concept graph from study material requires ANTHROPIC_API_KEY in the backend environment.",
        )

    client = anthropic.AsyncAnthropic(
        api_key=settings.ANTHROPIC_API_KEY,
        timeout=settings.ANTHROPIC_TIMEOUT_SECONDS,
        max_retries=settings.ANTHROPIC_MAX_RETRIES,
    )
    system = (
        "You output valid JSON only. Build a small directed acyclic graph of concepts "
        "for studying the material. Use 5–20 nodes max."
    )
    user = f"""Exam/title: {exam_name}

Material excerpt:
{snippet}

Return JSON: {{"nodes": [{{"id": "string", "label": "string"}}], "edges": [{{"source": "id", "target": "id", "weight": 0.5}}]}}
Edges point from prerequisite to dependent concept. No cycles."""
    response = await client.messages.create(
        model=settings.ANTHROPIC_MODEL,
        max_tokens=2000,
        temperature=0.2,
        system=system,
        messages=[{"role": "user", "content": user}],
    )
    raw = "".join(block.text for block in response.content if getattr(block, "type", "") == "text")
    raw = raw.strip()
    if raw.startswith("```"):
        lines = raw.splitlines()
        lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        raw = "\n".join(lines).strip()
    data = json.loads(raw)
    nodes = data.get("nodes") or []
    edges = data.get("edges") or []
    graph_json = {"nodes": nodes, "edges": edges}
    ok, errors, _ = validate_graph(graph_json)
    if not ok:
        raise RuntimeError("Generated graph invalid: " + "; ".join(errors[:5]))
    return graph_json
