# ConceptPilot — Remaining Backend Work (excluding Infinite Canvas)

This document lists **backend follow-up items** from the repo PRDs **except the Infinite Canvas** (collaborative spatial canvas, canvas nodes/edges/branches, canvas WebSocket rooms, and canvas-specific chat/streaming). All other product backend work is in scope here.

**Sources**


| Document           | Role for backend                                                               |
| ------------------ | ------------------------------------------------------------------------------ |
| `technicalprd.md`  | Primary source: API surface, schema, infra, workflows, NFRs, testing.          |
| `mainprd.md`       | Product goals, roadmap themes, AI principles, deployment table.                |
| `frontendspecs.md` | Visual/design only — no API. Backend expectations come from `technicalprd.md`. |


---

## Out of scope (Infinite Canvas)

The following are **not** tracked in this file: canvas database tables (`projects`, `canvas_nodes`, `canvas_edges`, `messages`, `branches`, `files`, canvas `sessions`), canvas REST/WebSocket APIs, branch locking for canvas, canvas chat context assembly and streaming tools, and student no-password **canvas** sessions. If the product later ships Infinite Canvas, treat that as a separate backend initiative.

---

## 1. Parity with Technical PRD — Readiness engine APIs

Reconcile naming, HTTP verbs, and responses with the Technical PRD and the frontend:

- `**GET /api/v1/exams/{exam_id}/scores/summary`** — scores summary (if not merged into another response).
- `**GET /api/v1/exams/{exam_id}/mapping**` — retrieve mapping file/metadata (upload exists; GET may be missing).
- `**GET /api/v1/exams/{exam_id}/graph/versions**` — list graph versions.
- `**GET /api/v1/exams/{exam_id}/dashboard/alerts**` — Technical PRD may split alerts from main dashboard; current API may combine them in `GET .../dashboard`.
- `**GET /api/v1/exams/{exam_id}/compute/runs/{run_id}**` — single compute run detail.
- `**PATCH /api/v1/exams/{exam_id}/ai/suggestions/{suggestion_id}**` — Technical PRD PATCH for accept/reject; implementation may use `POST .../review` — align contracts with frontend.
- `**GET /api/v1/exams/{exam_id}/export/{export_id}**` — export job status by ID (in addition to list/download patterns).
- **CSV column naming** — Technical PRD uses `student_id` / `concept` in places; existing parsers may use `StudentID` / `ConceptID`. Document canonical format or support both.

---

## 2. Infrastructure & configuration (Technical PRD §2.10, §7)

- **Object storage (S3-compatible)** — Technical PRD targets Vultr Object Storage; current code may use OCI hooks and local paths. Unify on one abstraction (e.g. boto3/S3) + env vars (`VULTR_OBJECT_STORAGE_*` or generic `S3_*`) with a local/filesystem fallback for dev.
- **ElevenLabs** — `ELEVENLABS_API_KEY`, voice/model IDs, and a service module for TTS (study content).
- **Health endpoint** — extend beyond DB + Anthropic: **object storage reachability** (and optionally ElevenLabs) per Technical PRD §7.4.
- **Deployment packaging** — Technical PRD references `**uv`** + `**pyproject.toml**` and Railway auto-detect; repo may use `requirements.txt` only — add `pyproject.toml` if you want parity with the spec.
- **SSL / DB** — managed Postgres often requires stricter SSL than local; review `database.py` for prod vs dev.
- **CORS** — set `CORS_ALLOWED_ORIGINS` to real frontend URLs in production (avoid `*` in prod).

---

## 3. Study content generation (Technical PRD §2.3.3, §4.5, §5.7)

- **Tables** — `study_content` (audio, presentation, video walkthrough) with status lifecycle.
- **Routes** — `POST/GET` under `/api/v1/projects/{project_id}/study-content` and `/api/v1/study-content/{content_id}` (+ download/stream), **or** exam-scoped equivalents if the product avoids `projects` until canvas exists.
- **Exam-scoped generation** — `POST/GET /api/v1/exams/{exam_id}/study-content` (if PRD requires readiness-only flows without projects).
- **Pipeline** — Claude for script/slides → ElevenLabs for audio → upload blobs to object storage → persist metadata.
- **Optional** — PPTX export via `python-pptx`; synchronized “video walkthrough” (slides + per-slide audio).

---

## 4. Product roadmap themes → backend implications (`mainprd.md` §14)

- **Harden student report reliability and student listing** — edge cases, empty states, token lifecycle vs spec.
- **Mature async compute + worker deployment** — shared queue backend for multi-instance (file queue is dev-friendly only), monitoring, retries.
- **NotebookLM-style study content** — same as §3 above.
- **Deepen export integrations** — storage-backed exports, checksums, optional PDFs per Technical PRD export workflow.
- **AI suggestion review UX** — backend support for PATCH/bulk flows as in spec; audit fields completeness.
- **Instructor chat as reliable ops tool** — expand tool coverage, idempotency, error surfaces (instructor chat under `/chat`, not canvas chat).

---

## 5. Auth & security (Technical PRD §2.8, §8)

- **Production instructor auth** — enforce HTTP Basic (or future OAuth) on all instructor routes consistently; no default credentials in prod.
- **Rate limiting** — per-IP or per-identity limits for sensitive/public endpoints as appropriate (Technical PRD §5.11 where applicable to readiness/study flows).

---

## 6. Observability & testing (Technical PRD §6–7)

- **Structured logging** — correlation IDs (partially present); align field names with §7.4.
- **Integration tests** — full upload → compute → dashboard; AI suggestion review; study content with **mocked ElevenLabs**; object storage in CI (e.g. MinIO).
- **Contract tests** — Pydantic/OpenAPI ↔ frontend `types.ts` (Technical PRD §6.3).

---

## 7. Known issues / constraints (Technical PRD §10) — backend follow-ups

- **Exam lifecycle state** — optional explicit `state` column on `exams` (currently implicit).

---

## 8. `frontendspecs.md` — backend note

No API or schema in this file. Remaining backend work for UI flows is defined in `**technicalprd.md`**. Design specs inform response shape expectations indirectly (e.g. heatmap buckets, readiness colors).

---

## 9. Priority buckets (non-canvas)


| Priority                        | Focus                                                                                                                                         |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **P0 — Ship readiness product** | Env, Postgres, migrations, CORS, prod auth, health, export/storage hardening, API contract alignment (§1)., add more to env example as needed |
| **P1 — PRD fidelity**           | Object storage + ElevenLabs config; missing GET/PATCH routes; dashboard/alerts split; compute run by ID.                                      |
| **P2 — Study content**          | §3 — depends on P1 storage + ElevenLabs.                                                                                                      |


---

*Consolidates `mainprd.md` and `technicalprd.md`. Update when specs change. Infinite Canvas work is intentionally excluded.*