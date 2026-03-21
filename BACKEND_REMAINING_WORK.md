# ConceptPilot — Remaining Backend Work (from PRDs)

This document consolidates **backend-related follow-up items** implied by the three markdown specs in this repo. It is a planning checklist, not a commitment order.

**Sources**

| Document | Role for backend |
|----------|------------------|
| `technicalprd.md` | Primary source: API surface, schema, infra, workflows, NFRs, testing. |
| `mainprd.md` | Product goals, roadmap themes, AI principles, deployment table. |
| `frontendspecs.md` | **No backend/API specification** — visual/design only. Backend work below is inferred only where the **Technical PRD** defines the APIs those screens would call. |

---

## 1. Parity with Technical PRD — Readiness engine APIs

The Technical PRD lists several routes that may differ from the **current** FastAPI implementation (naming, HTTP verbs, or extra endpoints). Backend should be reconciled explicitly:

- [ ] **`GET /api/v1/exams/{exam_id}/scores/summary`** — scores summary (if not merged into another response).
- [ ] **`GET /api/v1/exams/{exam_id}/mapping`** — retrieve mapping (upload exists; GET may be missing).
- [ ] **`GET /api/v1/exams/{exam_id}/graph/versions`** — list graph versions.
- [ ] **`GET /api/v1/exams/{exam_id}/dashboard/alerts`** — Technical PRD splits alerts from main dashboard; current API may combine them.
- [ ] **`GET /api/v1/exams/{exam_id}/compute/runs/{run_id}`** — single run detail.
- [ ] **`PATCH /api/v1/exams/{exam_id}/ai/suggestions/{suggestion_id}`** — Technical PRD specifies PATCH for accept/reject; implementation may use `POST .../review` instead — align contracts with frontend.
- [ ] **`GET /api/v1/exams/{exam_id}/export/{export_id}`** — export status by ID (in addition to list/download patterns).
- [ ] **CSV column naming** — Technical PRD uses `student_id` / `concept` in places; existing parsers may use `StudentID` / `ConceptID`. Document canonical format or support both.

---

## 2. Infrastructure & configuration (Technical PRD §2.10, §7)

- [ ] **Vultr Object Storage (S3-compatible)** — env vars (`VULTR_OBJECT_STORAGE_*`) and first-class upload/download paths for canvas files, exports, and generated media (Technical PRD). Current code may use OCI hooks or local-only paths; unify on one S3 abstraction + filesystem fallback for local dev.
- [ ] **ElevenLabs** — `ELEVENLABS_API_KEY`, voice/model IDs, and service module for TTS (study content).
- [ ] **Health endpoint** — extend beyond DB + Anthropic: **object storage reachability** (and optionally ElevenLabs) per Technical PRD §7.4.
- [ ] **Deployment packaging** — Technical PRD references **`uv`** + **`pyproject.toml`** and Railway auto-detect; repo may use `requirements.txt` only — add `pyproject.toml` if you want parity with the spec.
- [ ] **SSL / DB** — managed Postgres often requires stricter SSL than local; review `database.py` for prod vs dev.
- [ ] **CORS** — set `CORS_ALLOWED_ORIGINS` to real frontend URLs in production (Technical PRD default `http://localhost:3000` vs `*`).

---

## 3. Canvas & realtime (major greenfield — Technical PRD §2.2.2, §2.3.2, §2.9)

Not covered by the readiness-only backend port; full product requires:

- [ ] **Database tables** — `projects`, `canvas_nodes`, `messages`, `canvas_edges`, `branches`, `files`, `sessions` (and related indexes/constraints).
- [ ] **REST routes** — project CRUD, nodes, edges, per-node messages, branches, file uploads, sessions.
- [ ] **WebSocket** — `WS /ws/{project_id}/{session_id}` with room broadcast, branch locking, reconnect behavior (Technical PRD §2.9).
- [ ] **Canvas chat pipeline** — context assembly from linked nodes, **streaming** (SSE) to client, tool execution for canvas tools (`create_branches`, etc.).
- [ ] **Student sessions** — lightweight tokens, rate limits (`RATE_LIMIT_DAILY`, `RATE_LIMIT_COOLDOWN_SECONDS`).

---

## 4. Study content generation (Technical PRD §2.3.3, §4.5, §5.7)

- [ ] **Tables** — `study_content` (audio, presentation, video walkthrough) with status lifecycle.
- [ ] **Routes** — `POST/GET` under `/api/v1/projects/{project_id}/study-content` and `/api/v1/study-content/{content_id}` (+ download/stream).
- [ ] **Exam-scoped generation** — `POST/GET /api/v1/exams/{exam_id}/study-content`.
- [ ] **Pipeline** — Claude for script/slides → ElevenLabs for audio → upload blobs to object storage → persist metadata.
- [ ] **Optional** — PPTX export via `python-pptx`; synchronized “video walkthrough” (slides + per-slide audio).

---

## 5. Product roadmap themes → backend implications (`mainprd.md` §14)

- [ ] **Harden student report reliability and student listing** — edge cases, empty states, token lifecycle vs spec.
- [ ] **Mature async compute + worker deployment** — shared queue backend for multi-instance (file queue is dev-friendly only), monitoring, retries.
- [ ] **NotebookLM-style study content** — same as §4 above.
- [ ] **Deepen export integrations** — storage-backed exports, checksums, optional PDFs per Technical PRD export workflow.
- [ ] **AI suggestion review UX** — backend support for PATCH/bulk flows as in spec; audit fields completeness.
- [ ] **Chat assistant as reliable ops tool** — expand tool coverage, idempotency, error surfaces (instructor chat under `/chat`).

---

## 6. Auth & security (Technical PRD §2.8, §8)

- [ ] **Production instructor auth** — enforce HTTP Basic (or future OAuth) on all instructor routes consistently.
- [ ] **Student canvas sessions** — no-password session model as specified; validate WebSocket against session.
- [ ] **Rate limiting** — per-session limits for canvas chat (Technical PRD §5.11).

---

## 7. Observability & testing (Technical PRD §6–7)

- [ ] **Structured logging** — correlation IDs (partially present); align field names with §7.4.
- [ ] **Integration tests** — full upload → compute → dashboard; AI suggestion review; **WebSocket**; study content with **mocked ElevenLabs**; object storage in CI (e.g. MinIO).
- [ ] **Contract tests** — Pydantic/OpenAPI ↔ frontend `types.ts` (Technical PRD §6.3).

---

## 8. Known issues / constraints (Technical PRD §10) — backend follow-ups

- [ ] **Branch locking** — today in-memory; document scale limits; optional Redis for multi-instance.
- [ ] **Large canvas context** — truncation strategy before calling Claude (weak concepts, recent messages, linked docs).
- [ ] **Exam lifecycle state** — optional explicit `state` column on `exams` (currently implicit).

---

## 9. `frontendspecs.md` — backend note

- **No API or schema** in this file. Any “remaining backend” work for UI flows is defined in **`technicalprd.md`** (routes above). Design specs only inform **response shape expectations** indirectly (e.g. heatmap buckets, readiness colors).

---

## 10. Quick priority buckets

| Priority | Focus |
|----------|--------|
| **P0 — Ship readiness product** | Env, Postgres, migrations, CORS, prod auth, health, export/storage hardening, API contract alignment (§1). |
| **P1 — PRD fidelity** | Object storage + ElevenLabs config; missing GET/PATCH routes; dashboard/alerts split; compute run by ID. |
| **P2 — Canvas + WS** | Full §3 — large schema + WebSocket + streaming chat. |
| **P3 — Study content** | §4 — depends on P1 storage + ElevenLabs. |

---

*Generated by consolidating `mainprd.md`, `technicalprd.md`, and `frontendspecs.md`. Update this file when the Technical PRD changes.*
