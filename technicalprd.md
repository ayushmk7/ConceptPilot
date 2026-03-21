# PreReq — Technical Specification PRD

**Version:** 2.0  
**Date:** March 2026  
**Status:** Active Development

---

## 1. Project Overview

PreReq is an AI-assisted concept readiness and study platform. It combines a deterministic readiness computation engine (exam scores, concept graphs, prerequisite propagation) with an Infinite Canvas spatial interface for AI-assisted studying. Instructors upload exam data, run computation, and review analytics. Students access readiness reports and study on a zoomable canvas where Claude-powered chat nodes, uploaded documents, images, and AI-generated artifacts live as linked, branchable nodes. The platform generates supplemental study content (audio via ElevenLabs, presentations, video-style walkthroughs). The stack is Next.js on Vercel, FastAPI on Railway, PostgreSQL on Vultr, Vultr Object Storage for files, the Anthropic Claude API for all AI, and ElevenLabs for voice synthesis.

---

## 2. Backend Specifications

### 2.1 Architecture

**Framework:** FastAPI (Python 3.12, managed with uv)  
**ORM:** SQLAlchemy (sync and async support) with SQLModel for canvas-related models  
**Migrations:** Alembic  
**Database:** PostgreSQL (Vultr Managed Database or Neon Serverless Postgres)  
**Object Storage:** Vultr Object Storage (S3-compatible API)  
**Deployment:** Railway (auto-detect from pyproject.toml)

**Architectural rules:**
- Routers own HTTP concerns (request parsing, response formatting, status codes).
- Services own business logic (readiness computation, graph validation, AI orchestration, content generation).
- Schemas own request and response contracts (Pydantic models).
- Models own persistence definitions (SQLAlchemy/SQLModel table definitions).
- Compute logic must remain deterministic and testable in isolation.
- AI wrappers must remain isolated from core compute correctness.
- Canvas-related code (nodes, edges, branches, sessions, multiplayer) lives in its own module hierarchy, separate from the readiness engine modules.

### 2.2 Database Schema

#### 2.2.1 Readiness Engine Tables

```sql
-- Courses
CREATE TABLE courses (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Exams within courses
CREATE TABLE exams (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id       UUID REFERENCES courses(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Questions detected from score uploads
CREATE TABLE questions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id         UUID REFERENCES exams(id) ON DELETE CASCADE,
    external_id     TEXT NOT NULL,
    max_score       FLOAT DEFAULT 1.0,
    UNIQUE(exam_id, external_id)
);

-- Raw student scores
CREATE TABLE scores (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id         UUID REFERENCES exams(id) ON DELETE CASCADE,
    student_id      TEXT NOT NULL,          -- external identifier, not a profile
    question_id     UUID REFERENCES questions(id) ON DELETE CASCADE,
    raw_score       FLOAT NOT NULL,
    normalized_score FLOAT NOT NULL,
    UNIQUE(exam_id, student_id, question_id)
);

-- Question to concept mappings
CREATE TABLE question_concept_maps (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id         UUID REFERENCES exams(id) ON DELETE CASCADE,
    question_id     UUID REFERENCES questions(id) ON DELETE CASCADE,
    concept         TEXT NOT NULL,
    weight          FLOAT DEFAULT 1.0,
    UNIQUE(exam_id, question_id, concept)
);

-- Concept graph versions
CREATE TABLE concept_graphs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id         UUID REFERENCES exams(id) ON DELETE CASCADE,
    version         INTEGER NOT NULL DEFAULT 1,
    nodes           JSONB NOT NULL,         -- array of concept names
    edges           JSONB NOT NULL,         -- array of {source, target} objects
    created_at      TIMESTAMPTZ DEFAULT now(),
    UNIQUE(exam_id, version)
);

-- Analysis parameters
CREATE TABLE parameters (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id         UUID REFERENCES exams(id) ON DELETE CASCADE UNIQUE,
    alpha           FLOAT NOT NULL DEFAULT 0.5,
    beta            FLOAT NOT NULL DEFAULT 0.3,
    gamma           FLOAT NOT NULL DEFAULT 0.2,
    threshold       FLOAT NOT NULL DEFAULT 0.6,
    k               INTEGER NOT NULL DEFAULT 3
);

-- Compute run tracking
CREATE TABLE compute_runs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id         UUID REFERENCES exams(id) ON DELETE CASCADE,
    status          TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed')),
    error_detail    TEXT,
    started_at      TIMESTAMPTZ DEFAULT now(),
    completed_at    TIMESTAMPTZ,
    parameters_snapshot JSONB
);

-- Per-student per-concept readiness results
CREATE TABLE readiness_results (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id         UUID REFERENCES exams(id) ON DELETE CASCADE,
    compute_run_id  UUID REFERENCES compute_runs(id) ON DELETE CASCADE,
    student_id      TEXT NOT NULL,
    concept         TEXT NOT NULL,
    direct_readiness    FLOAT NOT NULL,
    prerequisite_penalty FLOAT NOT NULL DEFAULT 0.0,
    downstream_boost    FLOAT NOT NULL DEFAULT 0.0,
    final_readiness     FLOAT NOT NULL,
    confidence          TEXT NOT NULL CHECK (confidence IN ('high', 'medium', 'low')),
    UNIQUE(compute_run_id, student_id, concept)
);

-- Class-level aggregate stats per concept
CREATE TABLE class_aggregates (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id         UUID REFERENCES exams(id) ON DELETE CASCADE,
    compute_run_id  UUID REFERENCES compute_runs(id) ON DELETE CASCADE,
    concept         TEXT NOT NULL,
    mean_readiness  FLOAT NOT NULL,
    median_readiness FLOAT NOT NULL,
    std_readiness   FLOAT NOT NULL,
    student_count   INTEGER NOT NULL,
    below_threshold_count INTEGER NOT NULL,
    UNIQUE(compute_run_id, concept)
);

-- Student clusters
CREATE TABLE clusters (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id         UUID REFERENCES exams(id) ON DELETE CASCADE,
    compute_run_id  UUID REFERENCES compute_runs(id) ON DELETE CASCADE,
    cluster_index   INTEGER NOT NULL,
    centroid        JSONB NOT NULL,          -- {concept: readiness} map
    label           TEXT,
    student_count   INTEGER NOT NULL
);

CREATE TABLE cluster_assignments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cluster_id      UUID REFERENCES clusters(id) ON DELETE CASCADE,
    student_id      TEXT NOT NULL
);

-- Intervention recommendations
CREATE TABLE intervention_results (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id         UUID REFERENCES exams(id) ON DELETE CASCADE,
    compute_run_id  UUID REFERENCES compute_runs(id) ON DELETE CASCADE,
    concept         TEXT NOT NULL,
    rank            INTEGER NOT NULL,
    affected_students INTEGER NOT NULL,
    downstream_reach INTEGER NOT NULL,
    severity        FLOAT NOT NULL,
    description     TEXT,
    ai_draft        TEXT
);

-- Student report tokens for public access
CREATE TABLE student_tokens (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id         UUID REFERENCES exams(id) ON DELETE CASCADE,
    student_id      TEXT NOT NULL,
    token           TEXT NOT NULL UNIQUE,
    expires_at      TIMESTAMPTZ NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- AI suggestion audit trail
CREATE TABLE ai_suggestions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id         UUID REFERENCES exams(id) ON DELETE CASCADE,
    suggestion_type TEXT NOT NULL,           -- 'concept_tags', 'edges', 'graph_expansion', 'intervention_draft'
    request_payload JSONB,
    response_payload JSONB,
    model           TEXT NOT NULL,
    prompt_version  TEXT,
    request_id      TEXT,
    latency_ms      INTEGER,
    token_usage     JSONB,
    review_status   TEXT NOT NULL DEFAULT 'pending' CHECK (review_status IN ('pending', 'accepted', 'rejected', 'applied')),
    reviewer_notes  TEXT,
    created_at      TIMESTAMPTZ DEFAULT now(),
    reviewed_at     TIMESTAMPTZ
);

-- Export runs
CREATE TABLE export_runs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id         UUID REFERENCES exams(id) ON DELETE CASCADE,
    compute_run_id  UUID REFERENCES compute_runs(id),
    status          TEXT NOT NULL CHECK (status IN ('pending', 'generating', 'completed', 'failed')),
    file_path       TEXT,
    checksum        TEXT,
    created_at      TIMESTAMPTZ DEFAULT now(),
    completed_at    TIMESTAMPTZ
);
```

#### 2.2.2 Canvas Tables

```sql
-- Projects are the top-level canvas container
CREATE TABLE projects (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title           TEXT NOT NULL,
    exam_id         UUID REFERENCES exams(id) ON DELETE SET NULL,  -- optional link to exam context
    settings        JSONB DEFAULT '{}',     -- MCP server URLs, canvas preferences
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Canvas nodes: chats, images, documents, artifacts
CREATE TABLE canvas_nodes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID REFERENCES projects(id) ON DELETE CASCADE,
    type            TEXT NOT NULL CHECK (type IN ('chat', 'image', 'document', 'artifact')),
    title           TEXT,
    position_x      FLOAT NOT NULL DEFAULT 0,
    position_y      FLOAT NOT NULL DEFAULT 0,
    is_collapsed    BOOLEAN DEFAULT false,
    skill           TEXT,                   -- system prompt template key, nullable
    active_user     TEXT,                   -- lock holder session ID, nullable
    metadata        JSONB DEFAULT '{}',     -- file info, dimensions, artifact type, etc.
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- Messages within chat nodes
CREATE TABLE messages (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id         UUID REFERENCES canvas_nodes(id) ON DELETE CASCADE,
    role            TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content         TEXT NOT NULL,
    content_type    TEXT DEFAULT 'text',     -- 'text', 'tool_use', 'tool_result', 'image', 'document'
    metadata        JSONB DEFAULT '{}',     -- tool call details, artifact data, token counts
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- Edges define context flow between nodes
CREATE TABLE canvas_edges (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID REFERENCES projects(id) ON DELETE CASCADE,
    source_node_id  UUID REFERENCES canvas_nodes(id) ON DELETE CASCADE,
    target_node_id  UUID REFERENCES canvas_nodes(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ DEFAULT now(),
    UNIQUE(source_node_id, target_node_id)
);

-- Branch metadata: which messages were selected to create the branch
CREATE TABLE branches (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_node_id  UUID REFERENCES canvas_nodes(id) ON DELETE CASCADE,
    child_node_id   UUID REFERENCES canvas_nodes(id) ON DELETE CASCADE,
    source_message_ids UUID[] NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- File storage references (actual bytes in Vultr Object Storage)
CREATE TABLE files (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id         UUID REFERENCES canvas_nodes(id) ON DELETE CASCADE,
    filename        TEXT NOT NULL,
    mime_type       TEXT NOT NULL,
    storage_key     TEXT NOT NULL,           -- Vultr Object Storage key
    size_bytes      INTEGER,
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- Student sessions (lightweight, no auth)
CREATE TABLE sessions (
    id              TEXT PRIMARY KEY,        -- generated session token
    project_id      UUID REFERENCES projects(id) ON DELETE CASCADE,
    display_name    TEXT NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT now(),
    request_count   INTEGER DEFAULT 0,
    last_request_at TIMESTAMPTZ
);

-- Generated study content (audio, presentations, video walkthroughs)
CREATE TABLE study_content (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID REFERENCES projects(id) ON DELETE CASCADE,
    exam_id         UUID REFERENCES exams(id) ON DELETE SET NULL,
    content_type    TEXT NOT NULL CHECK (content_type IN ('audio', 'presentation', 'video_walkthrough')),
    title           TEXT NOT NULL,
    source_context  JSONB NOT NULL,         -- which nodes/concepts/data were used to generate
    storage_key     TEXT,                   -- Vultr Object Storage key for media file
    transcript      TEXT,                   -- text transcript of audio content
    slides_data     JSONB,                  -- structured slide data for presentations
    duration_seconds INTEGER,               -- for audio/video content
    status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'completed', 'failed')),
    error_detail    TEXT,
    created_at      TIMESTAMPTZ DEFAULT now(),
    completed_at    TIMESTAMPTZ
);
```

### 2.3 API Route Groups

#### 2.3.1 Readiness Engine Routes

```
POST   /api/v1/courses
GET    /api/v1/courses
POST   /api/v1/courses/{course_id}/exams
GET    /api/v1/courses/{course_id}/exams

GET    /api/v1/exams/{exam_id}
POST   /api/v1/exams/{exam_id}/scores              -- upload scores CSV
GET    /api/v1/exams/{exam_id}/scores/summary
POST   /api/v1/exams/{exam_id}/mapping              -- upload mapping CSV
GET    /api/v1/exams/{exam_id}/mapping

POST   /api/v1/exams/{exam_id}/graph                -- upload or replace graph
GET    /api/v1/exams/{exam_id}/graph
PATCH  /api/v1/exams/{exam_id}/graph                -- add/remove nodes and edges
GET    /api/v1/exams/{exam_id}/graph/versions
POST   /api/v1/exams/{exam_id}/graph/expand          -- AI graph expansion

GET    /api/v1/exams/{exam_id}/parameters
PUT    /api/v1/exams/{exam_id}/parameters

POST   /api/v1/exams/{exam_id}/compute               -- trigger compute
GET    /api/v1/exams/{exam_id}/compute/runs
GET    /api/v1/exams/{exam_id}/compute/runs/{run_id}

GET    /api/v1/exams/{exam_id}/dashboard              -- readiness matrix, aggregates
GET    /api/v1/exams/{exam_id}/dashboard/alerts
GET    /api/v1/exams/{exam_id}/dashboard/trace/{concept}

GET    /api/v1/exams/{exam_id}/clusters
GET    /api/v1/exams/{exam_id}/interventions

GET    /api/v1/exams/{exam_id}/students
GET    /api/v1/exams/{exam_id}/students/{student_id}/report

POST   /api/v1/exams/{exam_id}/reports/tokens         -- generate student tokens
GET    /api/v1/reports/{token}                         -- public tokenized report access

POST   /api/v1/exams/{exam_id}/ai/suggest-tags
POST   /api/v1/exams/{exam_id}/ai/suggest-edges
POST   /api/v1/exams/{exam_id}/ai/draft-interventions
GET    /api/v1/exams/{exam_id}/ai/suggestions
PATCH  /api/v1/exams/{exam_id}/ai/suggestions/{suggestion_id}  -- accept/reject

POST   /api/v1/exams/{exam_id}/export
GET    /api/v1/exams/{exam_id}/export/{export_id}
GET    /api/v1/exams/{exam_id}/export/{export_id}/download
```

#### 2.3.2 Canvas Routes

```
POST   /api/v1/projects
GET    /api/v1/projects
GET    /api/v1/projects/{project_id}
PUT    /api/v1/projects/{project_id}
DELETE /api/v1/projects/{project_id}
PUT    /api/v1/projects/{project_id}/settings          -- MCP servers, preferences

POST   /api/v1/projects/{project_id}/nodes
GET    /api/v1/projects/{project_id}/nodes
GET    /api/v1/projects/{project_id}/nodes/{node_id}
PUT    /api/v1/projects/{project_id}/nodes/{node_id}
DELETE /api/v1/projects/{project_id}/nodes/{node_id}

POST   /api/v1/projects/{project_id}/edges
GET    /api/v1/projects/{project_id}/edges
DELETE /api/v1/projects/{project_id}/edges/{edge_id}

POST   /api/v1/projects/{project_id}/nodes/{node_id}/messages   -- send message, triggers Claude
GET    /api/v1/projects/{project_id}/nodes/{node_id}/messages

POST   /api/v1/projects/{project_id}/branches                    -- create branch from selected messages
GET    /api/v1/projects/{project_id}/branches

POST   /api/v1/projects/{project_id}/nodes/{node_id}/files       -- upload file to a node
GET    /api/v1/projects/{project_id}/nodes/{node_id}/files
GET    /api/v1/files/{file_id}/download

POST   /api/v1/projects/{project_id}/sessions                    -- create or join session
GET    /api/v1/projects/{project_id}/sessions

WS     /ws/{project_id}/{session_id}                              -- multiplayer WebSocket
```

#### 2.3.3 Study Content Routes

```
POST   /api/v1/projects/{project_id}/study-content       -- request content generation
GET    /api/v1/projects/{project_id}/study-content
GET    /api/v1/study-content/{content_id}
GET    /api/v1/study-content/{content_id}/download        -- download audio/video file
GET    /api/v1/study-content/{content_id}/stream           -- stream audio playback

POST   /api/v1/exams/{exam_id}/study-content              -- generate from exam/readiness context
GET    /api/v1/exams/{exam_id}/study-content
```

#### 2.3.4 Chat Assistant Routes

```
POST   /chat/sessions                                     -- create chat session
POST   /chat/sessions/{session_id}/messages                -- send message with tool use
GET    /chat/sessions/{session_id}/messages
```

#### 2.3.5 System Routes

```
GET    /health                                             -- DB status, AI key status, storage status
```

### 2.4 File Upload and Storage

Files uploaded by students or instructors follow this flow:

1. Client sends the file as multipart form data to the appropriate upload endpoint.
2. Backend validates the file type, size, and format.
3. Backend uploads the file to Vultr Object Storage via S3-compatible API. The storage key follows the pattern: `{project_id}/{node_id}/{uuid}_{filename}`.
4. Backend creates a `files` record with the storage key, mime type, and size.
5. For score and mapping CSVs (instructor uploads), the file is parsed and validated row by row. Parsed data is inserted into the appropriate tables. The raw file is also stored in object storage for audit.
6. For canvas uploads (student uploads), the file is stored and a canvas node is created at the drop position.

Supported file types for canvas uploads: PNG, JPEG, GIF, WebP (image nodes), PDF, TXT, MD, CSV (document nodes).

Max file size: 50MB for documents, 20MB for images. Configurable via environment variables.

### 2.5 Readiness Computation Engine

This is a pure Python module with no HTTP or database dependencies at the computation layer. It takes dataclass inputs and returns dataclass outputs.

#### 2.5.1 Input Dataclasses

```python
@dataclass
class ComputeInput:
    scores: list[StudentScore]          # student_id, question_id, normalized_score
    mappings: list[QuestionConceptMap]   # question_id, concept, weight
    graph_nodes: list[str]              # concept names
    graph_edges: list[tuple[str, str]]  # (source, target) prerequisite pairs
    parameters: Parameters              # alpha, beta, gamma, threshold, k
```

#### 2.5.2 Computation Stages

**Stage 1: Direct Readiness**

For each (student, concept) pair, compute the weighted average of normalized scores on questions mapped to that concept.

$$r_{direct}(s, c) = \frac{\sum_{q \in Q_c} w_{q,c} \cdot score(s, q)}{\sum_{q \in Q_c} w_{q,c}}$$

Where $Q_c$ is the set of questions mapped to concept $c$, and $w_{q,c}$ is the mapping weight.

If no questions map to a concept for a student, direct readiness is 0.0 and confidence is "low."

**Stage 2: Prerequisite Penalty**

For each concept $c$, identify its prerequisite concepts (parents in the DAG). For each prerequisite $p$ where $r_{direct}(s, p) < threshold$:

$$penalty(s, c) = \beta \cdot \frac{\sum_{p \in prereqs(c)} \max(0, threshold - r_{direct}(s, p))}{|prereqs(c)|}$$

If the concept has no prerequisites, penalty is 0.

**Stage 3: Downstream Boost**

For each concept $c$, identify its downstream concepts (children in the DAG). If downstream concepts show strong performance, this provides bounded positive evidence:

$$boost(s, c) = \gamma \cdot \frac{\sum_{d \in downstream(c)} \max(0, r_{direct}(s, d) - threshold)}{|downstream(c)|}$$

If the concept has no downstream dependents, boost is 0.

**Stage 4: Final Readiness**

$$r_{final}(s, c) = \text{clamp}\left(\alpha \cdot r_{direct}(s, c) - penalty(s, c) + boost(s, c), \; 0, \; 1\right)$$

**Stage 5: Confidence**

Confidence is computed per (student, concept) based on:
- `question_count`: number of questions mapped to the concept that the student answered.
- `point_coverage`: total max score of those questions as a fraction of the exam total.
- `variance`: standard deviation of the student's scores on those questions.

Thresholds (configurable but defaults):
- **High:** question_count >= 3 AND point_coverage >= 0.05 AND variance < 0.2
- **Medium:** question_count >= 2 AND point_coverage >= 0.02
- **Low:** everything else

**Stage 6: Class Aggregates**

Per concept across all students: mean, median, standard deviation, total count, count below threshold.

**Stage 7: Clustering**

K-means clustering on the student readiness vectors (each student is a vector of final readiness values, one per concept). K is set by the `k` parameter. The random seed is fixed (default: 42) for determinism.

Output: cluster index, centroid vector, student assignments.

**Stage 8: Interventions**

For each concept below the class mean threshold, compute intervention priority:

$$priority(c) = affected\_students(c) \times downstream\_reach(c) \times severity(c)$$

Where:
- `affected_students(c)` = count of students with $r_{final} < threshold$ on concept $c$
- `downstream_reach(c)` = number of direct and transitive descendants of $c$ in the DAG
- `severity(c)` = $threshold - mean\_readiness(c)$, clamped to [0, 1]

Interventions are sorted by priority descending.

#### 2.5.3 Determinism Requirements

- Same inputs always produce the same outputs.
- NaN and infinite values must be replaced with 0.0 before persistence.
- Concepts and students must be processed in sorted order where ordering affects output.
- K-means uses a fixed seed.
- No floating-point accumulation order ambiguity (use sorted keys).

### 2.6 Graph Validation

The concept graph must be a valid DAG at all times. Validation checks:

1. **Cycle detection:** On every graph mutation (upload, patch, AI-applied expansion), run topological sort. If the sort fails, return the cycle path in the error response.
2. **Node existence:** Every edge must reference existing nodes.
3. **Self-loops:** Rejected.
4. **Duplicate edges:** Rejected (enforced by unique constraint).
5. **Orphan nodes:** Allowed (a concept with no prerequisites and no dependents is valid).

Patch operations:
- `add_nodes`: list of concept names to add.
- `remove_nodes`: list of concept names to remove. Removing a node also removes all edges referencing it.
- `add_edges`: list of (source, target) pairs. Validated for DAG.
- `remove_edges`: list of (source, target) pairs.

Every mutation creates a new graph version. Previous versions are preserved.

### 2.7 CSV Validation

#### Scores CSV

Required columns: `student_id`, `question_id`, `score`. Optional: `max_score`.

Validation rules:
- Reject rows missing `student_id` or `question_id`.
- Reject rows where `score` is not a valid number.
- Reject rows where `score < 0` or (if `max_score` present) `score > max_score`.
- Reject duplicate `(student_id, question_id)` pairs.
- Default `max_score` to 1.0 if not present.
- Normalize: `normalized_score = score / max_score`.

Response includes: total rows parsed, valid rows inserted, structured error list with row numbers and reasons, student count, question count.

#### Mapping CSV

Required columns: `question_id`, `concept`. Optional: `weight`.

Validation rules:
- Reject rows missing `question_id` or `concept`.
- Reject rows where `weight` is present but not a valid positive number.
- Default `weight` to 1.0 if not present.
- Warn if a question in the scores data has no mapping entry.

### 2.8 Authentication and Authorization

**Instructor:** Basic HTTP auth with username/password from environment variables (`INSTRUCTOR_USERNAME`, `INSTRUCTOR_PASSWORD`). All instructor-facing endpoints require this. Future iterations may support OAuth or session tokens.

**Student:** Lightweight session tokens. A student joins a project by providing a display name. The backend generates a session ID (UUID or short token). No password. Sessions are scoped to a project.

**Report access:** Tokenized. Instructors generate time-limited tokens per student per exam. The token URL is shareable. Token expiry is configurable (`STUDENT_TOKEN_EXPIRY_DAYS`).

### 2.9 WebSocket Multiplayer Protocol

**Connection:** `ws://{host}/ws/{project_id}/{session_id}`

On connect, the server:
1. Validates that the session exists and belongs to the project.
2. Adds the connection to the in-memory room for that project.
3. Broadcasts a `user_joined` event to all other clients in the room.

**Event types broadcast to all clients in the room:**

| Event | Payload | Trigger |
|-------|---------|---------|
| `node_created` | `{node_id, type, position_x, position_y, title}` | Any node creation |
| `node_moved` | `{node_id, position_x, position_y}` | User drags a node |
| `node_collapsed` | `{node_id, is_collapsed}` | User minimizes or expands |
| `node_deleted` | `{node_id}` | User deletes a node |
| `node_locked` | `{node_id, session_id, display_name}` | User claims a chat node |
| `node_unlocked` | `{node_id}` | User releases a chat node |
| `edge_created` | `{edge_id, source_node_id, target_node_id}` | User draws an edge |
| `edge_deleted` | `{edge_id}` | User removes an edge |
| `message_complete` | `{node_id, message_id, role, content_preview}` | AI response finishes |
| `user_joined` | `{session_id, display_name}` | New connection |
| `user_left` | `{session_id}` | Disconnect |
| `study_content_ready` | `{content_id, content_type, title}` | Study content finishes generating |

**Not broadcast:** Streaming tokens (only the prompting user sees live streaming), cursor positions, typing indicators.

**Branch locking:**
- Lock request: client sends `{"action": "lock_request", "node_id": "..."}` over WebSocket.
- Server checks `canvas_nodes.active_user`. If null, sets it to the requesting session ID and broadcasts `node_locked`. If already locked by another session, responds with `{"action": "lock_denied", "node_id": "...", "held_by": "..."}`.
- Lock release: triggered by collapse, navigate away, or WebSocket disconnect. Server sets `active_user` to null and broadcasts `node_unlocked`.

### 2.10 Configuration

All configuration via environment variables.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | - | PostgreSQL connection string |
| `ANTHROPIC_API_KEY` | Yes | - | Claude API key |
| `ANTHROPIC_MODEL` | No | `claude-sonnet-4-20250514` | Default model for AI features |
| `ANTHROPIC_TIMEOUT_SECONDS` | No | `60` | Request timeout |
| `ANTHROPIC_MAX_RETRIES` | No | `2` | Retry count on transient failures |
| `ELEVENLABS_API_KEY` | Yes | - | ElevenLabs API key for voice synthesis |
| `ELEVENLABS_VOICE_ID` | No | (default voice) | Voice ID for study content narration |
| `ELEVENLABS_MODEL_ID` | No | `eleven_multilingual_v2` | ElevenLabs model |
| `VULTR_OBJECT_STORAGE_ENDPOINT` | Yes | - | S3-compatible endpoint |
| `VULTR_OBJECT_STORAGE_ACCESS_KEY` | Yes | - | Access key |
| `VULTR_OBJECT_STORAGE_SECRET_KEY` | Yes | - | Secret key |
| `VULTR_OBJECT_STORAGE_BUCKET` | Yes | - | Bucket name |
| `INSTRUCTOR_USERNAME` | Yes | - | Basic auth username |
| `INSTRUCTOR_PASSWORD` | Yes | - | Basic auth password |
| `STUDENT_TOKEN_EXPIRY_DAYS` | No | `7` | Report token lifetime |
| `APP_ENV` | No | `development` | Environment flag |
| `CORS_ALLOWED_ORIGINS` | No | `http://localhost:3000` | Comma-separated origins |
| `MAX_FILE_SIZE_MB` | No | `50` | Max upload size |
| `RATE_LIMIT_DAILY` | No | `100` | Per-session daily request cap |
| `RATE_LIMIT_COOLDOWN_SECONDS` | No | `2` | Minimum seconds between requests |

---

## 3. Frontend Specifications

### 3.1 Architecture

**Framework:** Next.js 15 (App Router) with TypeScript  
**Runtime:** Bun  
**Canvas Engine:** React Flow  
**UI Components:** shadcn/ui, Tailwind CSS  
**Deployment:** Vercel

**Structural rules:**
- Typed API contracts must mirror backend Pydantic schemas. A shared `types.ts` contract layer defines all request/response types.
- Every backend endpoint has a typed service wrapper in a `services/` directory.
- Views fail gracefully when data is missing. Loading and empty states are explicit.
- Student-facing UI remains understandable to non-technical users.
- No mock data in production paths. Mock behavior is limited to development stubs.

### 3.2 Page and Component Hierarchy

```
app/
  layout.tsx                        -- root layout, font, global providers
  page.tsx                          -- landing page (instructor entry point)

  upload/
    page.tsx                        -- upload wizard

  dashboard/
    page.tsx                        -- instructor dashboard
    [concept]/
      page.tsx                      -- root-cause trace for a concept

  students/
    page.tsx                        -- student report viewer (instructor selects student)

  report/
    [token]/
      page.tsx                      -- public tokenized student report

  canvas/
    [projectId]/
      page.tsx                      -- infinite canvas workspace

  study/
    [contentId]/
      page.tsx                      -- study content player (audio/video/slides)

  chat/
    page.tsx                        -- instructor chat assistant (full page or overlay)

components/
  canvas/
    CanvasWorkspace.tsx             -- React Flow wrapper, node/edge management
    ChatNode.tsx                    -- expanded and collapsed chat node
    ImageNode.tsx                   -- expanded and collapsed image node
    DocumentNode.tsx                -- expanded and collapsed document node
    ArtifactNode.tsx                -- expanded and collapsed artifact node
    SkillSelector.tsx               -- dropdown for skill selection on chat nodes
    BranchControls.tsx              -- message selection mode, branch creation
    ContextIndicator.tsx            -- context window usage meter
    NodeToolbar.tsx                 -- per-node actions (delete, collapse, lock status)
    EdgeHandle.tsx                  -- custom edge handle for drawing connections
    CanvasToolbar.tsx               -- top-level actions: add node, summary, export, content gen
    FileDropZone.tsx                -- canvas-level drag-and-drop handler

  dashboard/
    ReadinessMatrix.tsx             -- heatmap-style readiness by concept
    AlertsPanel.tsx                 -- weak foundational concept alerts
    InterventionList.tsx            -- ranked intervention recommendations
    ClusterView.tsx                 -- cluster summary cards
    ParameterDisplay.tsx            -- alpha/beta/gamma/threshold visualization
    TraceDrilldown.tsx              -- waterfall: direct, penalty, boost, final

  upload/
    CourseExamSelector.tsx          -- create or select course and exam
    FileUploader.tsx                -- CSV upload with validation error display
    ParameterEditor.tsx             -- slider/input controls for parameters
    ComputeTrigger.tsx              -- run compute button with status

  report/
    ConceptGraphView.tsx            -- interactive concept map (React Flow or D3)
    ReadinessBreakdown.tsx          -- per-concept readiness display
    WeakConceptsList.tsx            -- top weak concepts with confidence cues
    StudyPlan.tsx                   -- prerequisite-ordered study sequence
    ContactInfo.tsx                 -- instructor/TA contact details

  study/
    AudioPlayer.tsx                 -- play/pause/scrub for audio study content
    SlideViewer.tsx                 -- slide-by-slide presentation viewer
    VideoWalkthrough.tsx            -- synchronized slides + audio playback
    ContentRequestForm.tsx          -- request study content generation

  chat/
    ChatAssistant.tsx               -- instructor chat interface
    MessageList.tsx                 -- message rendering with markdown, code, LaTeX
    ToolIndicator.tsx               -- shows when Claude is using a tool

  shared/
    LoadingState.tsx
    EmptyState.tsx
    ErrorBoundary.tsx
    ConfirmDialog.tsx

services/
  api.ts                            -- base fetch wrapper with auth, error handling
  courses.ts                        -- course CRUD
  exams.ts                          -- exam CRUD
  scores.ts                         -- score upload
  mappings.ts                       -- mapping upload
  graphs.ts                         -- graph CRUD, patch, expand
  parameters.ts                     -- parameter get/set
  compute.ts                        -- compute trigger, run history
  dashboard.ts                      -- dashboard data, alerts, trace
  clusters.ts                       -- cluster data
  interventions.ts                  -- intervention data
  students.ts                       -- student list, individual report
  reports.ts                        -- token generation, tokenized access
  ai.ts                             -- AI suggestions: tags, edges, interventions, review
  exports.ts                        -- export trigger, status, download
  projects.ts                       -- canvas project CRUD
  nodes.ts                          -- canvas node CRUD
  edges.ts                          -- canvas edge CRUD
  messages.ts                       -- send message, get messages (SSE streaming)
  branches.ts                       -- branch creation
  files.ts                          -- file upload, download
  sessions.ts                       -- session create/join
  studyContent.ts                   -- study content generation, status, playback
  chat.ts                           -- instructor chat assistant

types/
  index.ts                          -- all shared type definitions
```

### 3.3 Canvas View Specifications

#### 3.3.1 Chat Node

**Expanded state:** approximately 400x500px. Contains:
- Scrollable message list (markdown, code blocks, LaTeX rendered).
- Text input with send button.
- Skill selector dropdown in the header.
- "Branch" button that activates message selection mode (checkboxes on each message).
- Context indicator showing estimated context window usage.
- Lock indicator if claimed by another user.

**Collapsed state:** approximately 120x60px. Shows node title, message count badge, skill icon, and lock icon if another user holds it.

**Streaming:** When the user sends a message, the response streams token-by-token via SSE. A typing indicator shows during streaming. Tool use (like `create_branches`) shows a brief "Using tool..." indicator.

**Context assembly:** When a message is sent, the backend traverses all inbound edges (direct parents only, not transitive) and gathers content from each source node by type:
- Chat nodes: selected messages from the branch record, injected as conversation context.
- Image nodes: base64 image data sent as image content blocks (Claude vision).
- Document nodes: PDFs sent as document content blocks; text files injected into the system prompt.
- Artifact nodes: text content injected into the system prompt.

The skill's system prompt is prepended. The node's own message history is included. This assembled payload is sent to the Anthropic API.

#### 3.3.2 Image Node

**Expanded:** renders the full image in a resizable container (default 300x300px). Shows filename and dimensions.  
**Collapsed:** 60x60px thumbnail with filename.  
**Upload:** drag-and-drop onto canvas background. Frontend reads via FileReader, uploads to backend, creates node at drop position. Supported: PNG, JPEG, GIF, WebP.

#### 3.3.3 Document Node

**Expanded:** preview of the document. PDFs render a paginated viewer. Text files show content. Default 350x450px.  
**Collapsed:** 100x50px card with file icon, filename, page count or size.  
**Upload:** same drag-and-drop. Supported: PDF, TXT, MD, CSV.

#### 3.3.4 Artifact Node

**Expanded:** renders the artifact appropriately. Syntax-highlighted code, rendered LaTeX, mermaid diagrams, formatted markdown. Default 350x400px.  
**Collapsed:** 120x80px preview card with artifact type icon and title.  
**Creation:** when Claude's response contains a recognized artifact pattern (fenced code block, LaTeX block, mermaid diagram, structured study content), the frontend shows a "Promote to canvas" button on that message. Clicking it creates a new artifact node with an edge back to the source chat.

#### 3.3.5 Edge Drawing

User hovers over a node's edge handle (small circle on the border), clicks, and drags to another node. React Flow handles the visual connection. On release, the frontend sends a POST to create the edge record. Edges render as curved lines with directional arrows. When a chat node is active (user is typing), inbound edges glow to indicate active context sources.

#### 3.3.6 Branching

1. User clicks "Branch" in a chat node header.
2. Chat enters selection mode. Each message gets a checkbox.
3. User checks the messages to carry forward.
4. User clicks "Create branch."
5. Frontend sends POST to `/api/v1/projects/{project_id}/branches` with `parent_node_id`, `child_node_id` (optional, backend creates), and `source_message_ids`.
6. A new chat node appears to the right of the parent. An edge is drawn. A branch record is created.
7. The child chat's context includes only the selected messages as background.

#### 3.3.7 Canvas Toolbar

Top-level actions available in the canvas toolbar:
- **Add chat node:** creates an empty chat node at a default position.
- **Generate summary:** triggers a canvas-wide summary (reads all nodes, generates an overview as a new chat node at the top).
- **Export canvas:** downloads the entire canvas as a structured markdown document, walking the node graph breadth-first.
- **Generate study content:** opens the ContentRequestForm for audio, presentation, or video walkthrough generation.
- **Settings:** project settings including MCP server URLs.

#### 3.3.8 Context Size Indicator

Each chat node displays a small meter showing context window usage relative to Claude's limit. Calculated from: own messages token count + linked node content token count. Color-coded: green (under 50%), yellow (50-80%), red (over 80%). This helps students know when to branch.

### 3.4 Instructor Dashboard View

**Readiness matrix:** heatmap showing readiness distribution buckets (e.g., 0-0.2, 0.2-0.4, ...) by concept. Primary class-level entry point.

**Alerts panel:** lists weak foundational concepts with meaningful downstream impact. Priority reflects affected student count and downstream dependency reach.

**Intervention list:** ranked by estimated impact. Each row shows concept, affected student count, downstream reach, severity, and optional AI-drafted description.

**Cluster view:** cards summarizing each cluster's centroid profile and student count. Used for instructional planning, not student labeling.

**Parameter display:** visual representation of current alpha, beta, gamma, threshold, and k values with brief explanations of what each controls.

**Root-cause trace (separate page):** drill-down on one concept. Shows direct readiness evidence, prerequisite penalty sources (which prerequisites are weak), downstream boost sources, final readiness waterfall, and affected student count.

### 3.5 Student Report View

Accessed via tokenized URL or instructor-selected student view.

Displays:
- Student identifier and exam name.
- Interactive concept graph visualization (nodes colored by readiness, edges showing prerequisites).
- Readiness per concept with confidence indicators.
- Top weak concepts highlighted.
- Study plan: ordered list of concepts to study, sequenced by prerequisites (study foundations first).
- Concise per-concept explanations.
- Instructor/TA contact path.
- Link to study canvas if available.
- Link to generated study content if available.

Does not display: class rank, percentiles, peer comparisons, risk labels as identity judgments.

### 3.6 Study Content Player View

**Audio player:** standard playback controls (play, pause, scrub, speed adjustment). Displays transcript alongside audio with highlighted current section. The audio is generated by ElevenLabs from Claude-produced text.

**Slide viewer:** slide-by-slide navigation. Each slide shows title, content, and optional diagrams or concept graph fragments. Slides are rendered from structured JSON data.

**Video walkthrough:** synchronized view. Slides advance automatically in sync with audio narration. User can pause, scrub, and jump to specific slides. This is not a literal video file; it is a frontend-rendered synchronized experience of slides and audio.

### 3.7 Upload Wizard View

Step-by-step flow:
1. **Course/exam selection:** create or select from existing. Dropdowns with create-new option.
2. **Score upload:** file input for CSV. On upload, displays validation results: row count, error list with row numbers, student/question counts. Errors block progression until resolved or acknowledged.
3. **Mapping upload:** same pattern. Warns if unmapped questions exist.
4. **Graph upload or generation:** file input for structured graph, or "Generate with AI" button that triggers AI edge suggestions.
5. **Parameter configuration:** sliders for alpha, beta, gamma, threshold. Number input for k. Brief tooltip explanations.
6. **Compute:** button to trigger. Shows progress indicator. On completion, navigates to dashboard.

---

## 4. AI Specifications

### 4.1 AI Provider

All AI calls use the **Anthropic Python SDK** (`anthropic` package). The model is configurable via `ANTHROPIC_MODEL` environment variable, defaulting to `claude-sonnet-4-20250514`. There is no OpenAI dependency in the system.

### 4.2 Canvas Chat (Claude Conversations)

Each chat node is an independent Claude conversation. The backend assembles the message payload:

```python
import anthropic

client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

# Context assembly
system_prompt = build_system_prompt(skill, linked_contexts, readiness_context)
messages = build_messages(node_message_history, linked_chat_contexts)

# Streaming response
with client.messages.stream(
    model=settings.ANTHROPIC_MODEL,
    max_tokens=4096,
    system=system_prompt,
    messages=messages,
    tools=get_registered_tools(project),
) as stream:
    for event in stream:
        yield event  # forwarded to client via SSE
```

**Registered tools for canvas chat nodes:**

1. **create_branches** -- Claude can propose and create multiple branches when it identifies divergent approaches.

```python
{
    "name": "create_branches",
    "description": "When you identify multiple valid approaches, methods, perspectives, or sub-topics worth exploring separately, use this tool to create distinct exploration branches on the canvas. Only branch when the paths lead to meaningfully different understanding.",
    "input_schema": {
        "type": "object",
        "properties": {
            "branches": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "title": {"type": "string", "description": "Short title (2-5 words)"},
                        "description": {"type": "string", "description": "One sentence on what this branch explores"},
                        "initial_context": {"type": "string", "description": "Background context to pre-load"}
                    },
                    "required": ["title", "description", "initial_context"]
                }
            },
            "reasoning": {"type": "string", "description": "Why branching is appropriate here"}
        },
        "required": ["branches", "reasoning"]
    }
}
```

2. **generate_quiz** -- Creates a multi-question quiz from conversation context. Returns structured JSON: questions, options, correct answers, explanations. Frontend renders as an interactive quiz card.

```python
{
    "name": "generate_quiz",
    "description": "Create a quiz to test understanding of the current topic. Return structured questions with options and explanations.",
    "input_schema": {
        "type": "object",
        "properties": {
            "topic": {"type": "string"},
            "question_count": {"type": "integer", "default": 5},
            "difficulty": {"type": "string", "enum": ["easy", "medium", "hard"]}
        },
        "required": ["topic"]
    }
}
```

3. **create_flashcard** -- Extracts key terms and definitions. Returns term/definition pairs. Frontend creates an artifact node with a flippable card interface.

4. **check_understanding** -- Poses a targeted question to the student before continuing. Acts as a conversational checkpoint.

5. **suggest_branch** -- Suggests a single branch for a subtopic. Unlike `create_branches`, this presents the suggestion to the student with a confirmation button.

6. **generate_study_content** -- Triggers generation of audio, presentation, or video walkthrough content from the current conversation context.

**MCP server support:** If the project has configured MCP server URLs in `project.settings`, they are included in the API call:

```python
response = client.messages.create(
    ...,
    mcp_servers=[
        {"type": "url", "url": url, "name": name}
        for url, name in project_mcp_servers
    ]
)
```

### 4.3 Instructor Chat Assistant

The instructor chat assistant is a separate Claude conversation with tool-backed access to real product data.

**System prompt:** You are an assistant for instructors using the PreReq platform. You have tools to access real course, exam, readiness, and student data. Never fabricate data. If you lack exam context, ask for it.

**Registered tools:**

| Tool | Description |
|------|-------------|
| `list_courses` | Returns all courses |
| `list_exams` | Returns exams for a course |
| `get_exam_summary` | Returns score/mapping/graph status for an exam |
| `get_students` | Returns student list for an exam |
| `get_readiness` | Returns readiness results for a student or all students |
| `get_parameters` | Returns current parameters for an exam |
| `update_parameters` | Updates parameters (triggers recompute warning) |
| `trigger_compute` | Runs computation |
| `get_dashboard_summary` | Returns aggregate readiness and alert data |
| `get_interventions` | Returns ranked intervention list |
| `get_clusters` | Returns cluster summaries |
| `generate_export` | Triggers export generation |
| `get_concept_trace` | Returns root-cause trace for a concept |

Each tool maps to a real backend service call. Claude cannot mutate data through free-form text; all state changes go through explicit tool invocations.

### 4.4 AI Suggestion Features (Readiness Engine)

#### 4.4.1 Concept Tag Suggestions

**Input:** question text (from uploaded exam or student-uploaded study material)  
**System prompt:** Given the following exam question, identify the academic concepts being tested. Return a JSON array of concept names. Be specific and use standard academic terminology.  
**Output schema:**
```json
{
    "concepts": [
        {"name": "string", "confidence": "float 0-1", "reasoning": "string"}
    ]
}
```
**Review:** instructor reviews, accepts/rejects individual concept tags.

#### 4.4.2 Prerequisite Edge Suggestions

**Input:** list of concept names  
**System prompt:** Given the following concepts from a course, identify prerequisite relationships. An edge from A to B means A should be understood before B. Return only edges where the prerequisite relationship is pedagogically meaningful.  
**Output schema:**
```json
{
    "edges": [
        {"source": "string", "target": "string", "reasoning": "string"}
    ]
}
```
**Validation:** proposed edges are validated against DAG constraints before presentation.

#### 4.4.3 Graph Expansion

**Input:** current graph + selected concept to expand around  
**System prompt:** Given the current concept graph and the selected concept, suggest additional concepts and edges that would make the graph more complete around this area. Do not duplicate existing nodes or edges.  
**Output schema:**
```json
{
    "new_nodes": ["string"],
    "new_edges": [{"source": "string", "target": "string", "reasoning": "string"}]
}
```
**Validation:** proposed additions validated against DAG. Cycle-creating edges rejected before presentation.

#### 4.4.4 Intervention Drafts

**Input:** weak concept data, cluster summaries, downstream impact  
**System prompt:** Given the following intervention target data, draft a brief instructor-facing recommendation for addressing this concept weakness. Include: what to do, why it matters, and which student group is most affected.  
**Output schema:**
```json
{
    "concept": "string",
    "recommendation": "string",
    "target_group": "string",
    "expected_impact": "string"
}
```

#### 4.4.5 Suggestion Audit Requirements

Every suggestion stored in `ai_suggestions` must include:
- `suggestion_type`
- `request_payload` (what was sent to Claude)
- `response_payload` (what Claude returned)
- `model` (which Claude model was used)
- `prompt_version` (string identifier for the prompt template version)
- `request_id` (from Anthropic API response headers if available)
- `latency_ms`
- `token_usage` (input tokens, output tokens)
- `review_status` (pending, accepted, rejected, applied)
- `reviewer_notes` (optional)
- `reviewed_at` (timestamp of review)

### 4.5 Study Content Generation

#### 4.5.1 Audio Study Content (ElevenLabs)

**Flow:**
1. Backend collects source material: weak concepts from readiness data, chat history from relevant canvas nodes, uploaded document content, concept graph structure.
2. Claude generates a structured study script. The prompt instructs Claude to produce a clear, conversational explanation of the material organized by prerequisite order. The script covers: what concepts the student is weak on, why they matter, key explanations, and a summary of what to focus on.
3. The script text is sent to ElevenLabs text-to-speech API:

```python
import httpx

async def generate_audio(text: str, voice_id: str, model_id: str) -> bytes:
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}",
            headers={
                "xi-api-key": settings.ELEVENLABS_API_KEY,
                "Content-Type": "application/json"
            },
            json={
                "text": text,
                "model_id": model_id,
                "voice_settings": {
                    "stability": 0.5,
                    "similarity_boost": 0.75
                }
            }
        )
        return response.content  # MP3 bytes
```

4. The MP3 bytes are uploaded to Vultr Object Storage.
5. A `study_content` record is created with `content_type = 'audio'`, the storage key, transcript text, and duration.
6. The frontend renders the audio player with transcript.

**Script generation prompt version tracking:** the prompt used to generate the script is versioned and stored in the `study_content.source_context` JSONB field alongside the input data references.

#### 4.5.2 Presentation Generation

**Flow:**
1. Backend collects the same source material as audio.
2. Claude generates structured slide data:

```json
{
    "title": "Study Guide: [Topic]",
    "slides": [
        {
            "title": "Concept: [Name]",
            "content": "Explanation text",
            "bullet_points": ["point 1", "point 2"],
            "concept_graph_fragment": {"nodes": [...], "edges": [...]},
            "notes": "Speaker notes for this slide"
        }
    ]
}
```

3. The structured data is stored in `study_content.slides_data`.
4. The frontend renders slides using a slide viewer component. Each slide can display text, bullet points, and a concept graph fragment rendered via React Flow or a simple SVG.

Optionally, the backend can generate a downloadable PPTX file from the slide data using python-pptx and store it in object storage.

#### 4.5.3 Video-Style Walkthrough

This combines audio and presentation:
1. Generate slide data (as above).
2. Generate audio narration from slide notes/content (as above, but segmented per slide).
3. Store both the slide data and per-slide audio segments.
4. The frontend renders a synchronized experience: slides advance automatically as each audio segment plays. User can pause, skip, and scrub.

The `study_content` record stores both `slides_data` and a reference to the audio segments in object storage.

### 4.6 AI Governance Rules

1. Human review is required before any AI suggestion modifies readiness engine data (graph, mappings).
2. AI-generated graph edits must still pass DAG validation.
3. Chat tool calls that mutate canvas state (create_branches, create_flashcard) take effect immediately because they are student-initiated exploratory actions, not instructional data mutations.
4. All suggestion records preserve acceptance, rejection, reviewer identity (when available), and optional notes.
5. AI failures surface as recoverable errors, never silent missing output.
6. Claude never sees raw student demographic data. Only external student identifiers and readiness scores.

### 4.7 Prompt Versioning

Every prompt template is stored as a Python constant or file with a version string (e.g., `"suggest_tags_v1"`, `"study_script_v2"`). The version string is recorded in the AI suggestion or study content record. When a prompt is updated, the version is incremented. Old versions are preserved in version control.

---

## 5. Workflow Specifications

### 5.1 Exam Lifecycle States

An exam progresses through:

1. **Created** -- course and exam records exist.
2. **Scores uploaded** -- scores CSV parsed and stored.
3. **Mapping uploaded** -- question-concept mapping parsed and stored.
4. **Graph uploaded or generated** -- concept graph is valid DAG, stored with version.
5. **Parameters configured** -- parameters record exists (defaults applied on exam creation).
6. **Compute initiated** -- compute run created, status pending/running.
7. **Results available** -- readiness, aggregates, clusters, interventions persisted. Dashboard accessible.
8. **Reports available** -- student tokens can be generated. Reports accessible.
9. **Study content available** -- audio, presentations, walkthroughs generated and accessible.
10. **AI suggestions reviewed** -- suggestions accepted/rejected, changes applied where accepted.

These states are implicit (derived from which data exists) in the current implementation. Future iterations may formalize them in a state column on the exam record.

### 5.2 Canvas Session Lifecycle

1. User navigates to `/canvas/{projectId}`.
2. If no session exists, the user enters a display name. A session record is created.
3. WebSocket connection opens to `/ws/{projectId}/{sessionId}`.
4. User interacts with the canvas: creates/moves/deletes nodes, draws edges, sends messages, uploads files, branches conversations.
5. All canvas mutations are persisted via REST API calls and broadcast via WebSocket.
6. On disconnect, any held locks are released.

### 5.3 Message Send Workflow (Canvas Chat)

1. User types a message in a chat node and clicks send.
2. Frontend sends POST to `/api/v1/projects/{project_id}/nodes/{node_id}/messages` with `{content, role: "user"}`.
3. Backend:
   a. Saves the user message to the `messages` table.
   b. Assembles context: traverses inbound edges, gathers linked content by node type.
   c. Retrieves the node's skill (if set) and builds the system prompt.
   d. Checks if the project has readiness context (linked exam) and includes relevant readiness data if the student's identity is known.
   e. Builds the full messages array.
   f. Calls Anthropic API with streaming enabled.
   g. Forwards streaming events to the client via SSE.
   h. If Claude calls a tool (create_branches, generate_quiz, etc.), executes the tool, sends the result back to Claude, and continues streaming.
   i. When streaming completes, saves the assistant message to the `messages` table.
   j. Broadcasts `message_complete` to all WebSocket clients in the room.
4. Frontend renders the response token-by-token during streaming.

### 5.4 Branch Creation Workflow

1. User clicks "Branch" in a chat node.
2. Frontend enters selection mode: each message gets a checkbox.
3. User selects messages and clicks "Create branch."
4. Frontend sends POST to `/api/v1/projects/{project_id}/branches` with `{parent_node_id, source_message_ids}`.
5. Backend:
   a. Creates a new `canvas_nodes` record of type 'chat' positioned to the right of the parent.
   b. Creates a `canvas_edges` record from parent to child.
   c. Creates a `branches` record with the selected message IDs.
   d. Broadcasts `node_created` and `edge_created` to all WebSocket clients.
6. Frontend adds the new node and edge to React Flow.

### 5.5 AI Auto-Branch Workflow

1. During a streaming response, Claude calls the `create_branches` tool.
2. Backend receives the tool call with branch definitions (title, description, initial_context for each).
3. Backend creates one `canvas_nodes` record per branch, each with an edge from the parent.
4. Each child node gets a system message containing `initial_context`.
5. Positions are calculated in a fan layout: 2 branches fan left/right, 3+ spread in an arc.
6. Backend returns the tool result to Claude confirming branch creation.
7. Claude continues its response with a summary of the branches it created.
8. Backend broadcasts `node_created` and `edge_created` events for each new node/edge.
9. Frontend animates the new nodes expanding outward from the parent.

### 5.6 File Upload Workflow (Canvas)

1. User drags a file onto the canvas background.
2. Frontend reads the file via FileReader, determines type (image or document).
3. Frontend sends POST to `/api/v1/projects/{project_id}/nodes/{node_id}/files` (or a combined create-node-and-upload endpoint).
4. Backend:
   a. Validates file type and size.
   b. Uploads to Vultr Object Storage.
   c. Creates a `canvas_nodes` record of the appropriate type at the drop position.
   d. Creates a `files` record with the storage key.
   e. Broadcasts `node_created`.
5. Frontend renders the new node.

### 5.7 Study Content Generation Workflow

1. User requests content generation via the canvas toolbar or study content form.
2. User selects content type (audio, presentation, video walkthrough) and optionally selects specific nodes or concepts to focus on.
3. Frontend sends POST to `/api/v1/projects/{project_id}/study-content` with `{content_type, source_node_ids, focus_concepts}`.
4. Backend:
   a. Creates a `study_content` record with status 'pending'.
   b. Collects source material from specified nodes and/or exam readiness data.
   c. Sends content to Claude for script/slide generation.
   d. For audio content: sends generated text to ElevenLabs. Stores resulting MP3 in Vultr Object Storage.
   e. For presentations: stores structured slide data in the record.
   f. For video walkthroughs: generates both slides and per-slide audio segments.
   g. Updates record status to 'completed' with storage keys and metadata.
   h. Broadcasts `study_content_ready` to WebSocket clients.
5. Frontend shows a notification. User can navigate to the study content player.

### 5.8 Compute Workflow

1. Instructor triggers compute via upload wizard or dashboard.
2. Backend validates that scores, mapping, and graph exist for the exam.
3. Creates a `compute_runs` record with status 'pending' and a snapshot of current parameters.
4. Loads all input data into the compute engine's dataclasses.
5. Runs the computation pipeline (stages 1-8).
6. Persists all outputs transactionally: readiness results, class aggregates, clusters, cluster assignments, interventions.
7. Updates compute run status to 'completed' (or 'failed' with error detail).
8. Returns the compute run ID.

### 5.9 Export Workflow

1. Instructor requests export for an exam.
2. Backend creates an `export_runs` record with status 'pending'.
3. Generates export artifacts from the most recent compute run: readiness CSV, intervention report, cluster summary, concept graph JSON, student report PDFs (optional).
4. Bundles artifacts and uploads to Vultr Object Storage.
5. Records the storage key, checksum, and updates status to 'completed'.
6. Download endpoint returns the file from object storage.

### 5.10 Error Handling Across Workflows

- **Upload validation errors:** row-aware. Each error includes the row number, column, and reason. Errors are returned in the upload response, not thrown as exceptions.
- **Graph errors:** cycle paths are returned as an ordered list of concept names forming the cycle.
- **Compute failures:** error detail is persisted in the compute run record. The dashboard shows the last successful run's data.
- **AI failures:** timeouts and API errors are caught, logged, and returned as recoverable errors. No core data is corrupted. The suggestion record is created with an error status if the request itself succeeded but the response was malformed.
- **WebSocket disconnects:** locks are released, user_left is broadcast. Reconnection re-adds the client to the room.
- **File upload failures:** storage errors are returned to the client. No orphan database records are created (upload and record creation are in a transaction or compensating pattern).
- **ElevenLabs failures:** study content record is marked 'failed' with error detail. User can retry.
- **Rate limit exceeded:** friendly message returned with time until next allowed request.

### 5.11 Rate Limiting

Per-session rate limiting for canvas chat requests:
- Each `sessions` record tracks `request_count` and `last_request_at`.
- On each message send, the backend checks:
  - If `request_count` >= `RATE_LIMIT_DAILY` and `last_request_at` is today: reject with 429.
  - If time since `last_request_at` < `RATE_LIMIT_COOLDOWN_SECONDS`: reject with 429.
- On success: increment `request_count`, update `last_request_at`.
- Counter resets daily (check based on UTC date comparison).

---

## 6. Testing Requirements

### 6.1 Unit Tests

- Readiness computation: each stage tested independently with known inputs and expected outputs.
- Graph validation: cycle detection, self-loop rejection, duplicate edge rejection, orphan node handling.
- CSV parsing: valid files, malformed rows, missing columns, out-of-range scores, duplicate records.
- Confidence computation: edge cases for question count, point coverage, and variance thresholds.
- Intervention priority ranking: verified with hand-calculated examples.
- Context assembly: correct content gathered from each node type, correct edge traversal (direct only, not transitive).

### 6.2 Integration Tests

- Full upload-to-compute-to-dashboard flow.
- Score upload followed by mapping upload followed by graph upload followed by compute, then dashboard query.
- AI suggestion generation, review, and application (with graph revalidation).
- Canvas node creation, edge creation, message send, response streaming.
- Branch creation and context inheritance verification.
- File upload to object storage and retrieval.
- Study content generation end-to-end (with mocked ElevenLabs for CI).
- WebSocket connection, event broadcasting, lock acquisition/release.
- Rate limiting enforcement.

### 6.3 Contract Tests

- Every Pydantic schema change is covered by a test that validates the schema against a sample payload.
- Frontend types.ts and backend schemas must stay in sync. A CI check can compare exported JSON schemas.

### 6.4 Regression Coverage

- Determinism: a fixed set of inputs always produces the exact same readiness outputs (byte-level comparison of sorted JSON).
- Student report: never includes rank, percentile, or peer comparison fields.
- Graph: never allows cycles after any mutation sequence.
- AI suggestions: never applied without review_status change.

---

## 7. Deployment Specifications

### 7.1 Local Development

- Backend: `uv run fastapi dev` (or `uvicorn app.main:app --reload`).
- Frontend: `bun dev` (Next.js dev server).
- Database: local PostgreSQL or Docker `postgres:16`.
- Object storage: local filesystem fallback or MinIO container.
- Environment variables in `.env` files (not committed).

### 7.2 Production

| Component | Platform | Config |
|-----------|----------|--------|
| Frontend | Vercel | Connected to git repo, auto-deploy on push. Environment variables for API URL. |
| Backend | Railway | Connected to git repo, auto-detect Python. Environment variables for all secrets. |
| Database | Vultr Managed PostgreSQL | Connection string in Railway env. SSL required. |
| Object Storage | Vultr Object Storage | S3-compatible. Endpoint, keys in Railway env. |
| ElevenLabs | External API | API key in Railway env. |
| Anthropic | External API | API key in Railway env. |

### 7.3 Migrations

Alembic manages schema migrations. Every schema change requires a migration file. Migrations run on deploy (Railway start command: `alembic upgrade head && uvicorn app.main:app`).

Rollback: each migration must have a working downgrade function. Test downgrade in staging before production schema changes.

### 7.4 Observability

- Structured JSON logging on all backend services.
- Request correlation IDs via middleware.
- Compute runs record start time, end time, status, and error detail.
- AI calls record latency, token usage, and model.
- ElevenLabs calls record latency and character count.
- Health endpoint reports: database connectivity, Anthropic API key validity (via a lightweight test call or key format check), Vultr storage accessibility.

---

## 8. Security

- Instructor endpoints require basic auth.
- Student report tokens are time-limited and single-use-scoped.
- API keys (Anthropic, ElevenLabs, Vultr) are never exposed to the frontend.
- CORS is configured per environment.
- File uploads are validated for type and size before storage.
- WebSocket connections are validated against existing sessions.
- No student demographic data is stored or processed.
- Exports do not include data from students outside the requesting exam scope.

---

## 9. Non-Functional Requirements

- Compute should complete within a few seconds for class sizes under 500 students and under 50 concepts.
- Dashboard load should feel near-interactive after results exist (target under 500ms for API response).
- Canvas node operations (create, move, delete) should reflect in under 100ms locally and broadcast within 200ms.
- Streaming responses should show the first token within 1-2 seconds of message send.
- Study content generation is async. Audio generation may take 10-30 seconds depending on length. The user sees a progress indicator.
- The system must degrade gracefully when ElevenLabs is unavailable (study content generation fails, everything else works).
- The system must degrade gracefully when Anthropic API is unavailable (canvas chat and AI suggestions fail, readiness engine and dashboard still work from cached results).

---

## 10. Known Issues and Constraints

- The student dropdown on the students page may not show available students in certain conditions. This is a known frontend issue that needs investigation.
- Base64 file storage in the database (from the original Infinite Canvas design) is replaced by Vultr Object Storage references. However, during local development without object storage, a filesystem fallback is acceptable.
- Branch locking is in-memory on the backend. If the backend restarts, all locks are released. This is acceptable for the current scale.
- Canvas-wide summary is bounded by Claude's context window. For very large canvases, the backend must truncate content intelligently (prioritize recent messages, weak concepts, and linked documents).

---

## 11. Template for Future Feature Specs

Any new feature added to this system must document:

1. **Feature name** and one-sentence summary.
2. **User problem** it solves.
3. **Product behavior** after the feature ships.
4. **Backend changes:** models, migrations, services, routes, schemas, validation.
5. **Frontend changes:** pages, components, service layer, loading/error states.
6. **AI changes:** prompt, output schema, review flow, safety constraints.
7. **Workflow impact:** what upstream and downstream flows change.
8. **Risks:** what can break or become misleading.
9. **Tests:** unit, integration, and regression coverage required.