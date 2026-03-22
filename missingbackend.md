# ConceptPilot — Backend gaps & implementation backlog (non–Infinite Canvas)

This document lists **what is still missing, partial, or should be implemented** on the backend compared to `technicalprd.md` and `mainprd.md`, **excluding the Infinite Canvas** surface area (projects, canvas nodes/edges, canvas chat, branches, files on canvas, multiplayer WebSocket, canvas sessions). It also summarizes **test coverage gaps** relative to Technical PRD §6.

**How this was produced:** Inventory of `backend/app/routers/*.py` and `app/models/models.py`, cross-checked against `technicalprd.md` §2.2–2.3; `python -m pytest backend/tests/` — **126 passed** (as of last run in this workspace). See also `BACKEND_REMAINING_WORK.md` for an overlapping narrative backlog.

---

## Out of scope (Infinite Canvas)

Do **not** track here: `projects`, `canvas_nodes`, `canvas_edges`, `messages` (canvas), `branches`, canvas `files`, canvas `sessions`, REST under `/api/v1/projects/...`, **`WS /ws/{project_id}/{session_id}`**, canvas-specific chat streaming/tools, and student no-password **canvas** sessions. Treat as a separate initiative when Infinite Canvas ships.

---

## 1. API routes — missing vs Technical PRD

### 1.1 Readiness engine (`technicalprd.md` §2.3.1)

The **exam-scoped readiness table** in the PRD is largely implemented (courses, exams, uploads, graph, compute, dashboard, clusters, interventions, students/reports, AI suggest + suggestions workflow, export, parameters). PRD fidelity tests in `backend/tests/test_prd_fidelity.py` assert the core route set on the **production** `app`.

**Still missing or not PRD-identical:**

| Item | PRD / expectation | Current notes |
|------|-------------------|---------------|
| **Project-scoped study content** | `POST` / `GET` `/api/v1/projects/{project_id}/study-content` (§2.3.3) | Not implemented. Only **exam-scoped** `.../exams/{exam_id}/study-content` exists (plus shared `GET` download/stream by `content_id`). |
| **Export list in PRD table** | §2.3.1 lists only `POST` export and `GET` by id/download | Backend also exposes `GET /api/v1/exams/{exam_id}/export` (list). Extra vs narrow PRD table but useful; document in OpenAPI/frontend contract. |
| **Chat path prefix** | §2.3.4 shows `/chat/...` (no `/api/v1`) | Matches implementation (`APIRouter(prefix="/chat")`). Frontend must use the same paths. |

### 1.2 Study content (`technicalprd.md` §2.3.3)

| Route | Status |
|-------|--------|
| `POST/GET /api/v1/exams/{exam_id}/study-content` | Implemented |
| `GET /api/v1/study-content/{content_id}`, `/download`, `/stream` | Implemented |
| `POST/GET /api/v1/projects/{project_id}/study-content` | **Missing** (depends on `projects` / canvas or a standalone project entity) |

### 1.3 Instructor chat (`technicalprd.md` §2.3.4)

Minimum PRD set is covered; the app adds **list session, get session, delete session, quick** endpoints. No change required unless you want strict PRD-only surface.

---

## 2. Database / schema drift vs Technical PRD §2.2.1

The ORM models **implement the product** but **names and enums differ** from the SQL sketch in the PRD. If the frontend or external tools assume PRD literals, align or document canonical API values.

| PRD concept | PRD sketch | Implementation notes |
|-------------|------------|-------------------------|
| `exams.updated_at` | Present | `Exam` has `created_at` only (no `updated_at`). |
| `questions.external_id` | Column name | `question_id_external` in code. |
| `question_concept_maps` | `exam_id`, `concept` | `QuestionConceptMap`: `concept_id`, no `exam_id` on row (join via question). |
| `concept_graphs.nodes/edges` | Separate JSONB | `graph_json` blob with nodes/edges structure. |
| `compute_runs` | `status`: pending/running/completed/failed; internal `id` as PK | Uses `run_id` UUID + `status` values like **`success`** vs PRD **`completed`**. |
| `readiness_results` / aggregates | `concept` text | Code uses `concept_id`-style string fields on results/aggregates. |
| `ai_suggestions` | `review_status`, rich audit fields | Code uses **`status`**, `output_payload`, etc. — same idea, different names. |
| `export_runs` | status pending/generating/completed/failed | Code uses e.g. **`ready`** vs **`completed`**. |
| `study_content` | `project_id` + optional `exam_id` | **`exam_id` only** today; **`project_id` missing** on model — blocks PRD project-scoped study content until added or PRD is narrowed. |

**Optional PRD item:** explicit **`exams.state`** lifecycle column (mentioned in `BACKEND_REMAINING_WORK.md` §7) — still not required by current tests.

---

## 3. Features & behavior — incomplete vs PRD workflows

- **NotebookLM-style study content (full):** Script/slides + **ElevenLabs TTS** + **object storage** exists in code paths, but **video walkthrough** (synchronized slides + per-slide audio), **PPTX export** (`python-pptx`), and **project-linked** generation are not fully specified in implementation vs §2.3.3 / §4.5 narratives.
- **Instructor CSV audit to object storage:** Raw upload artifacts can be stored (`upload_raw_upload_artifact` in upload flow) when storage is configured; verify **all** upload types and failure modes match §2.4 (transaction / compensating pattern) under load.
- **Compute queue:** `compute_queue_service` supports **file** and **redis** backends — for **multi-instance Railway**, production must use **redis** (or equivalent); file queue is dev/single-instance friendly only.
- **Rate limiting (§5.11):** PRD describes **per-session** counters for **canvas** chat. Backend has **`enforce_instructor_write_limit`** on some instructor writes — not the same as per-session canvas limits. Decide parity for **instructor** vs **canvas** and document.
- **Auth:** Production guards in `main.py` enforce non-wildcard CORS and non-default instructor credentials. **OAuth / session tokens** remain future per PRD §2.8.
- **Observability (§7.4):** Structured logging exists; **correlation IDs** and field alignment with PRD are partial. **`/health`** covers DB, Anthropic, ElevenLabs reachability, optional object storage, Convex placeholder — extend if new dependencies become critical.
- **Convex:** Health reports `configured` when URL set; clarify whether Convex is required for non-canvas product or remove noise from health.

---

## 4. Testing — what exists vs what Technical PRD §6 asks for

**Current suite (high level):**

| Area | Tests | Gap vs PRD §6 |
|------|--------|----------------|
| Readiness route presence + key behaviors | `test_prd_fidelity.py` | Does **not** enumerate **study-content** routes in the same matrix (OpenAPI test covers paths separately). |
| OpenAPI export | `test_openapi_contract.py` | Asserts `openapi.json` export and **study-content** paths exist — **no** comparison to frontend `types.ts`. |
| Upload → compute → dashboard | `test_integration_flow.py` | **Narrow** subgraph of routers; no export, AI apply, reports/tokens, or study pipeline in same flow. |
| Study content | `test_study_content.py` | Pipeline + API with test app; **ElevenLabs mocked** in service tests where applicable — good; extend for storage + failure retries. |
| Compute queue | `test_compute_queue_service.py` | Unit-level; **no** multi-worker redis integration in CI by default. |
| Rate limit | `test_rate_limit.py` | Dependency behavior; not full HTTP integration across all limited routes. |
| P0 / export bundle | `test_p0_hardening.py`, `test_export.py` | Useful regression; not a full **contract** with frontend. |

**Missing or weak (recommended):**

1. **§6.2** End-to-end: AI suggestion **generate → review → apply** with real router stack (or heavy mocks) in one test module.
2. **§6.2** Study content **E2E** with **MinIO** (or local S3) in CI — workflow exists in `.github/workflows/backend-minio-smoke.yml`; ensure it runs on main and covers upload + head bucket.
3. **§6.3** **Automated** OpenAPI ↔ **frontend `types.ts`** (or generated client) diff in CI.
4. **§6.4** **Determinism:** byte-stable JSON for fixed inputs (sorted keys) for readiness outputs.
5. **§6.4** Student report: assert **no** rank/percentile/peer fields in public report payloads (if not already asserted elsewhere).
6. **Canvas / WebSocket** items in §6.2 — **out of scope** for this file.

---

## 5. Infrastructure & packaging

- **uv + `pyproject.toml`:** Present alongside `requirements.txt`; align install docs (Railway, local) with a single source of truth if desired.
- **Postgres SSL:** Review `database.py` for managed-Postgres (Vultr/Neon) vs local dev.
- **CORS:** Production must not use `*` — enforced at startup when `APP_ENV=production`.

---

## 6. Priority-backed backlog (non-canvas)

| Priority | Focus |
|----------|--------|
| **P0** | Redis compute queue in prod; prod auth/CORS/env validation; student/report reliability; export + storage behavior under failure. |
| **P1** | **Project-scoped study content** (needs `project_id` on `study_content` or deferred PRD change); schema/enum alignment (`completed` vs `success`, etc.) for API docs and clients; OpenAPI ↔ frontend contract check in CI. |
| **P2** | Video walkthrough, PPTX, deeper observability, OAuth roadmap, expanded integration tests per §6.2. |

---

## 7. Quick reference — sources

| Document | Use |
|----------|-----|
| `technicalprd.md` | Canonical API and schema intent |
| `mainprd.md` | Roadmap themes → backend implications |
| `BACKEND_REMAINING_WORK.md` | Older consolidated backlog (some items may already be done) |
| `backend/tests/test_prd_fidelity.py` | Readiness route matrix and assertions |

---

*Infinite Canvas backend work is intentionally excluded. Update this file when the PRD or implementation changes materially.*
