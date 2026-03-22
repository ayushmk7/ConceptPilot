# CanvasRoadmap — Codebase Context & Integration Reference

**Last updated:** 2026-03-21
**Purpose:** Ground truth for wiring the Infinite Canvas into the existing ConceptPilot codebase without conflicts.
Read this before touching any shared file.

---

## 1. What Is Already Built

### 1.1 Backend — Fully Implemented (Readiness Engine)

All readiness-engine routes are live under `/api/v1/exams/...`.

| Router file | Mount prefix | Status |
|---|---|---|
| `routers/courses.py` | `/api/v1/courses` | Done |
| `routers/exams.py` | `/api/v1/courses/{id}/exams` | Done |
| `routers/upload.py` | `/api/v1/exams/{id}/scores`, `.../mapping` | Done |
| `routers/graph.py` | `/api/v1/exams/{id}/graph` | Done |
| `routers/compute.py` | `/api/v1/exams/{id}/compute` | Done |
| `routers/dashboard.py` | `/api/v1/exams/{id}/dashboard`, `.../trace/{concept}` | Done |
| `routers/clusters.py` | `/api/v1/exams/{id}/clusters` | Done |
| `routers/reports.py` | `/api/v1/exams/{id}/reports` | Done |
| `routers/parameters.py` | `/api/v1/exams/{id}/parameters` | Done |
| `routers/ai_suggestions.py` | `/api/v1/exams/{id}/ai/suggestions` | Done |
| `routers/export.py` | `/api/v1/exams/{id}/export` | Done |
| `routers/chat.py` | `/chat/sessions`, `/chat/quick` | Done |

**All routers are already imported and mounted in `app/main.py`.**

Canvas router is NOT imported yet. See §4 for how to add it.

### 1.2 Backend — Database Models (All in `models/models.py`)

Existing tables (all without `canvas_` prefix — canvas must use `canvas_` prefix to avoid collisions):

```
courses, exams, concept_graphs, questions, question_concept_map,
scores, readiness_results, class_aggregates, clusters, cluster_assignments,
student_tokens, parameters, compute_runs, intervention_results,
ai_suggestions, audit_log, export_runs, chat_sessions, chat_messages
```

Alembic migrations: 3 migration files in `alembic/versions/` covering everything above.
**Canvas tables require a new migration file.**

### 1.3 Backend — Services

All services in `app/services/`. Canvas needs its own directory `app/services/canvas/`.
Do not import from existing services into canvas services (one-way dependency: canvas may call into readiness data if needed, but readiness engine never imports from canvas).

### 1.4 Frontend — Pages (Next.js App Router, no `src/` wrapper)

Root is `frontend/`. Pages live at `frontend/app/`:

| Route | File | Status |
|---|---|---|
| `/` | `app/page.tsx` | Exists (landing) |
| `/dashboard` | `app/dashboard/page.tsx` | Exists |
| `/upload` | `app/upload/page.tsx` | Exists |
| `/canvas` | `app/canvas/page.tsx` | Exists — **has conflicts, see §3** |
| `/reports` | `app/reports/page.tsx` | Exists |
| `/student-report` | `app/student-report/page.tsx` | Exists |
| `/suggestions` | `app/suggestions/page.tsx` | Exists |
| `/trace/[concept]` | `app/trace/[concept]/page.tsx` | Exists |
| `/canvas/[projectId]` | `app/canvas/[projectId]/page.tsx` | **MISSING — must be created** |

### 1.5 Frontend — Shared Components

```
components/InstructorLayout.tsx   — TopNav + Sidebar wrapper (do NOT use on canvas)
components/TopNav.tsx             — Michigan Blue nav bar
components/Sidebar.tsx            — Left sidebar with nav links
components/ui/                    — Full shadcn/ui library (safe to use anywhere)
```

### 1.6 Frontend — Canvas Components (Partial)

```
components/canvas/ChatNode.tsx    — Exists. Uses mock responses. No backend wiring.
components/canvas/DocumentNode.tsx — Exists. Static/display only.
```

Missing canvas components (need to be created):
```
components/canvas/ImageNode.tsx
components/canvas/ArtifactNode.tsx
components/canvas/chat/MessageList.tsx
components/canvas/chat/MessageInput.tsx
components/canvas/chat/MessageBubble.tsx
components/canvas/chat/BranchSelector.tsx
components/canvas/chat/SkillPicker.tsx
components/canvas/panels/Toolbar.tsx
components/canvas/panels/SettingsPanel.tsx
components/canvas/multiplayer/JoinModal.tsx
components/canvas/multiplayer/PresenceBar.tsx
components/canvas/multiplayer/LockIndicator.tsx
components/canvas/hooks/useStreamingChat.ts
components/canvas/hooks/useCanvasSocket.ts
components/canvas/hooks/useContextAssembly.ts
```

### 1.7 Frontend — Dependencies (Already Installed)

```json
"@xyflow/react": "^12.10.1"     — React Flow (canvas engine)
"react-dnd": "16.0.1"           — Drag-and-drop (for file drops)
"react-dnd-html5-backend"        — DnD HTML5 backend
"motion": "12.23.24"            — Animations (Framer Motion)
"recharts": "2.15.2"            — Charts
"lucide-react": "0.487.0"       — Icons
"next": "15.3.3"                — App framework
```

Missing packages that need to be added:
```
react-markdown        — Markdown rendering in chat
react-syntax-highlighter — Code block highlighting in messages
```

---

## 2. Configuration & Environment

### 2.1 Backend Config (`app/config.py`)

Current env vars (all from `Settings` pydantic model):

| Variable | Default | Notes |
|---|---|---|
| `DATABASE_URL` | required | `postgresql+asyncpg://...` |
| `ANTHROPIC_API_KEY` | `""` | Required for AI features |
| `ANTHROPIC_MODEL` | `claude-sonnet-4-20250514` | Sonnet 4.5 |
| `ANTHROPIC_MAX_TOKENS` | `4096` | |
| `ANTHROPIC_TIMEOUT_SECONDS` | `60` | |
| `ANTHROPIC_MAX_RETRIES` | `2` | |
| `INSTRUCTOR_USERNAME` | `admin` | Basic auth |
| `INSTRUCTOR_PASSWORD` | `admin` | Basic auth |
| `STUDENT_TOKEN_EXPIRY_DAYS` | `30` | |
| `EXPORT_DIR` | `/tmp/conceptpilot_exports` | Local file fallback |
| `APP_ENV` | `development` | |
| `CORS_ALLOWED_ORIGINS` | `*` | Comma-separated for prod |
| `COMPUTE_ASYNC_ENABLED` | `false` | |
| `COMPUTE_QUEUE_BACKEND` | `file` | |
| `OCI_OBJECT_STORAGE_ENABLED` | `false` | OCI hooks, not Vultr |

**Missing from config — must be added for canvas:**

| Variable | Purpose |
|---|---|
| `ELEVENLABS_API_KEY` | TTS for study content generation |
| `ELEVENLABS_VOICE_ID` | ElevenLabs voice model |
| `VULTR_ACCESS_KEY` | S3-compatible object storage |
| `VULTR_SECRET_KEY` | S3-compatible object storage |
| `VULTR_BUCKET_NAME` | Bucket for canvas files & exports |
| `VULTR_ENDPOINT_URL` | e.g. `https://ewr1.vultrobjects.com` |
| `CANVAS_RATE_LIMIT_DAILY` | Max messages per session/day |
| `CANVAS_RATE_LIMIT_COOLDOWN_SECONDS` | Cooldown between messages |

Add these to `config.py` and `.env.example`. All should be optional with sensible defaults so the app still boots without them.

### 2.2 Object Storage Reality Check

The codebase has `app/services/object_storage_service.py` using OCI hooks (disabled by default). The PRD specifies Vultr S3-compatible storage. The canvas feature should use a new `app/services/canvas/storage.py` that uses `boto3` with the Vultr S3 endpoint. Do not modify the existing OCI service — leave it for backward compatibility.

### 2.3 CORS

Current: `CORS_ALLOWED_ORIGINS=*` in development. For production, set to actual Vercel domain.

---

## 3. Conflicts & Fixes Required

### Conflict 1 — Canvas Route Has No `[projectId]`

**Current:** `app/canvas/page.tsx` — static canvas with hardcoded nodes
**Required:** `app/canvas/[projectId]/page.tsx` — dynamic route per project

**Fix:** Create `app/canvas/[projectId]/page.tsx` (the real canvas). Leave `app/canvas/page.tsx` as a redirect or project listing page, or remove it.

### Conflict 2 — Canvas Wrapped in InstructorLayout (Has Sidebar)

**Current:** `app/canvas/page.tsx` imports and uses `InstructorLayout`, which renders TopNav + Sidebar.
**Required:** Canvas must be full-bleed (`h-screen w-screen overflow-hidden`), no sidebar.

**Fix:** Create `app/canvas/layout.tsx`:

```tsx
// frontend/app/canvas/layout.tsx
export default function CanvasLayout({ children }: { children: React.ReactNode }) {
  return <div className="h-screen w-screen overflow-hidden">{children}</div>;
}
```

The canvas page should NOT import `InstructorLayout`. The layout file will override the root layout automatically.

### Conflict 3 — ChatNode Uses Mock Responses

**Current:** `ChatNode.tsx` uses `setTimeout` + hardcoded string for assistant responses.
**Required:** SSE stream from `POST /api/canvas/nodes/:id/messages`.

**Fix:** Wire `ChatNode.tsx` to call the backend SSE endpoint via `useStreamingChat` hook. The node needs to receive a `nodeId` prop from the canvas page (passed via React Flow `data`).

### Conflict 4 — No `canvas-api.ts`

**Current:** No typed API client for canvas endpoints.
**Required:** `frontend/lib/canvas-api.ts` — typed functions for every canvas endpoint.

There is no `frontend/lib/api.ts` either. Both need to be created. Pattern:

```typescript
// frontend/lib/api.ts — shared fetch wrapper
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

export async function apiFetch(path: string, options?: RequestInit) {
  return fetch(`${API_BASE}${path}`, options);
}
```

```typescript
// frontend/lib/canvas-api.ts — canvas-specific typed calls
import { apiFetch } from './api';
// ... typed wrappers for every canvas REST endpoint
```

### Conflict 5 — Backend Has No Canvas Router or Models

**Current:** `app/main.py` has zero canvas imports.
**Required:** Canvas router at `/api/canvas/...` and WebSocket at `/ws/canvas/...`.

**Fix:** See §4.2 for the exact lines to add to `main.py`.

---

## 4. What Needs to Be Created

### 4.1 Backend: New Files

```
backend/app/models/canvas.py              ← Canvas SQLAlchemy models
backend/app/routers/canvas.py             ← All canvas REST endpoints
backend/app/services/canvas/__init__.py
backend/app/services/canvas/claude.py     ← Anthropic API + streaming
backend/app/services/canvas/context.py   ← Context assembly engine
backend/app/services/canvas/tools.py     ← Tool definitions
backend/app/services/canvas/skills.py    ← Skill system prompt templates
backend/app/services/canvas/multiplayer.py ← WebSocket room manager
backend/app/services/canvas/storage.py   ← Vultr S3 file storage
backend/app/ws/__init__.py
backend/app/ws/canvas.py                  ← WebSocket endpoint
backend/alembic/versions/<hash>_add_canvas_tables.py ← Migration
```

### 4.2 Backend: `main.py` Additions

Add exactly these lines to `app/main.py` — append after the last `app.include_router(...)` call:

```python
# Canvas REST routes
from app.routers import canvas as canvas_router
app.include_router(canvas_router.router, prefix="/api/canvas", tags=["canvas"])

# Canvas WebSocket
from app.ws.canvas import router as canvas_ws_router
app.include_router(canvas_ws_router)
```

Do not restructure `main.py`. Append only.

### 4.3 Backend: Canvas Database Models

All canvas tables must use the `canvas_` prefix. Defined in `app/models/canvas.py`:

```
canvas_projects       — id, title, created_at, updated_at
canvas_nodes          — id, project_id, type (chat/image/document/artifact),
                        title, position_x, position_y, is_collapsed, skill,
                        active_user (lock holder session_id), created_at
canvas_edges          — id, project_id, source_node_id, target_node_id, created_at
canvas_messages       — id, node_id, role (user/assistant/tool), content,
                        tool_calls_json, tool_call_id, tool_name, created_at
canvas_branches       — id, parent_node_id, child_node_id, source_message_ids_json, created_at
canvas_files          — id, project_id, node_id, filename, content_type,
                        file_data (base64 text or storage key), created_at
canvas_sessions       — id, project_id, display_name, created_at
```

### 4.4 Frontend: New Files

```
frontend/app/canvas/layout.tsx                  ← Full-bleed canvas layout (no sidebar)
frontend/app/canvas/[projectId]/page.tsx        ← Main canvas page
frontend/lib/api.ts                             ← Shared fetch wrapper
frontend/lib/canvas-api.ts                      ← Canvas API typed functions
frontend/components/canvas/ImageNode.tsx
frontend/components/canvas/ArtifactNode.tsx
frontend/components/canvas/chat/MessageList.tsx
frontend/components/canvas/chat/MessageInput.tsx
frontend/components/canvas/chat/MessageBubble.tsx
frontend/components/canvas/chat/BranchSelector.tsx
frontend/components/canvas/chat/SkillPicker.tsx
frontend/components/canvas/panels/Toolbar.tsx
frontend/components/canvas/panels/SettingsPanel.tsx
frontend/components/canvas/multiplayer/JoinModal.tsx
frontend/components/canvas/multiplayer/PresenceBar.tsx
frontend/components/canvas/multiplayer/LockIndicator.tsx
frontend/components/canvas/hooks/useStreamingChat.ts
frontend/components/canvas/hooks/useCanvasSocket.ts
```

---

## 5. API Contract

### 5.1 REST Endpoints (Canvas, mount at `/api/canvas/`)

```
Projects
  POST   /api/canvas/projects                     → { id, title, created_at }
  GET    /api/canvas/projects/:id                 → project + all nodes + all edges

Nodes
  POST   /api/canvas/projects/:id/nodes           → create node
         Body: { type, title, position_x, position_y, skill? }
  PATCH  /api/canvas/nodes/:id                    → update node
         Body: { position_x?, position_y?, is_collapsed?, title?, skill? }
  DELETE /api/canvas/nodes/:id                    → delete node + its messages

Edges
  POST   /api/canvas/projects/:id/edges           → create edge
         Body: { source_node_id, target_node_id }
  DELETE /api/canvas/edges/:id                    → delete edge

Messages & Streaming Chat
  GET    /api/canvas/nodes/:id/messages           → list all messages for node
  POST   /api/canvas/nodes/:id/messages           → send message, SSE stream
         Body: { content: string, session_id: string }
         Response: text/event-stream
         SSE events: token | tool_start | tool_result | done | error

Branching
  POST   /api/canvas/nodes/:id/branch             → create branch
         Body: { source_message_ids: string[], title: string }
         Returns: { child_node, edge, branch_record }

Files
  POST   /api/canvas/projects/:id/files           → upload file (multipart)
         Returns: { node_id, file_id, type: "image"|"document" }

Sessions
  POST   /api/canvas/projects/:id/sessions        → join project
         Body: { display_name: string }
         Returns: { session_id, display_name }
```

### 5.2 WebSocket Protocol (mount at `/ws/canvas/{project_id}/{session_id}`)

```
Client → Server:
  { "type": "lock_request",  "node_id": "..." }
  { "type": "lock_release",  "node_id": "..." }
  { "type": "node_moved",    "node_id": "...", "x": 100, "y": 200 }

Server → All Clients (room broadcast, excludes sender for moves):
  { "type": "node_created",   "node": { ...full node object } }
  { "type": "node_moved",     "node_id": "...", "x": 100, "y": 200 }
  { "type": "node_collapsed", "node_id": "...", "is_collapsed": true }
  { "type": "node_deleted",   "node_id": "..." }
  { "type": "node_locked",    "node_id": "...", "session_id": "...", "display_name": "Alex" }
  { "type": "node_unlocked",  "node_id": "..." }
  { "type": "edge_created",   "edge": { ...full edge object } }
  { "type": "edge_deleted",   "edge_id": "..." }
  { "type": "message_complete", "node_id": "...", "message": { ...full message } }
  { "type": "session_joined", "session_id": "...", "display_name": "Alex" }
  { "type": "session_left",   "session_id": "..." }
```

### 5.3 SSE Event Format (Streaming Chat)

Each SSE event is `data: <JSON>\n\n`.

```
{ "type": "token",       "text": "..." }                        ← stream a token
{ "type": "tool_start",  "name": "create_branches" }            ← tool call began
{ "type": "tool_result", "name": "create_branches", "nodes": [...], "edges": [...] }
{ "type": "done",        "message_id": "...", "usage": { ... } }
{ "type": "error",       "message": "..." }
```

### 5.4 Canvas Tools (Claude tool use)

Defined in `services/canvas/tools.py`:

| Tool | Trigger | Effect |
|---|---|---|
| `create_branches` | Claude sees multiple valid approaches | Creates N child nodes + edges in DB; returns them in `tool_result` SSE event for frontend to render |
| `generate_quiz` | Student asks for quiz | Returns structured quiz data; frontend renders as interactive card in chat |
| `create_flashcard` | Student asks for flashcards | Creates artifact node on canvas |
| `check_understanding` | Claude wants to verify comprehension | Returns a question; frontend renders in chat |
| `suggest_branch` | Claude wants to propose one branch | Returns suggestion; frontend shows "Create this branch?" UI, does NOT auto-create |

### 5.5 Canvas Skills (System Prompt Variants)

Defined in `services/canvas/skills.py` as a static dict keyed by skill name:

| Skill | Behavior |
|---|---|
| `Tutor` | Patient explanation, step-by-step |
| `Socratic` | Answers questions with questions |
| `Research Assistant` | Summarizes, cites, structures information |

> **Scope decision:** Reduced from 6 skills to 3. Removed: Devil's Advocate, Code Coach, Study Buddy.

---

## 6. Context Assembly Engine

The most critical backend component. Lives in `services/canvas/context.py`.

When a chat node receives a message:
1. Query all `canvas_edges` where `target_node_id = this_node_id`
2. For each source node:
   - If `type = "chat"`: load its `canvas_messages` (all messages). If it came via a branch, load only `source_message_ids` from the `canvas_branches` record.
   - If `type = "image"`: load `canvas_files.file_data` (base64), format as Anthropic `image` content block.
   - If `type = "document"`: load `canvas_files.file_data` (base64 PDF), format as Anthropic `document` content block.
3. Combine all context into the `messages` array passed to `messages.create()`.
4. Apply the skill system prompt for this node.
5. Stream the response token-by-token via SSE.

**Truncation rule**: If assembled context exceeds ~80k tokens, truncate older messages from linked chat nodes (keep the most recent 10 messages per linked node). Emit a context warning in the `done` event.

---

## 7. Frontend Integration Points

### 7.1 Canvas Page (`app/canvas/[projectId]/page.tsx`)

On mount:
1. Read `projectId` from route params.
2. Call `GET /api/canvas/projects/:projectId` — load all nodes and edges.
3. Check `localStorage` for `{ session_id, display_name }`. If missing, show `JoinModal`.
4. If session exists, call `POST /api/canvas/projects/:projectId/sessions` to rejoin.
5. Connect WebSocket at `ws://API_BASE/ws/canvas/{projectId}/{sessionId}`.
6. Initialize React Flow with loaded nodes and edges.

### 7.2 Node Type Registration

```typescript
// In canvas/[projectId]/page.tsx
import { ChatNode } from '@/components/canvas/ChatNode';
import { ImageNode } from '@/components/canvas/ImageNode';
import { DocumentNode } from '@/components/canvas/DocumentNode';
import { ArtifactNode } from '@/components/canvas/ArtifactNode';

const nodeTypes = {
  chat: ChatNode,
  image: ImageNode,
  document: DocumentNode,
  artifact: ArtifactNode,
};
```

### 7.3 ChatNode Data Contract

Each ChatNode receives `data` from React Flow:

```typescript
type ChatNodeData = {
  nodeId: string;           // canvas_nodes.id — needed for API calls
  title: string;
  skill: string;
  sessionId: string;        // current user's session_id
  isLocked: boolean;
  lockedByName?: string;
};
```

Pass `nodeId` and `sessionId` from the canvas page into each node's `data` prop when building the React Flow nodes array.

### 7.4 API Base URL

Add to `frontend/.env.local` (not committed):
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Add to `frontend/.env.example` (committed):
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## 8. Shared File Edit Rules

These files are shared between canvas and other features. Follow the rules below to avoid conflicts.

| File | Rule |
|---|---|
| `backend/app/main.py` | Append canvas router imports and `include_router` calls. Never restructure. |
| `backend/app/models/models.py` | Do NOT add canvas models here. Put them in `models/canvas.py` and import in the migration only. |
| `backend/app/config.py` | Append new canvas env vars to `Settings`. Do not rename existing vars. |
| `backend/.env.example` | Append canvas vars under a `# Canvas` comment block. |
| `frontend/app/layout.tsx` | Do NOT modify. Canvas layout overrides via `app/canvas/layout.tsx`. |
| `frontend/components/ui/` | Read-only — shadcn/ui. Import from here, never modify. |
| `frontend/package.json` | Add canvas-specific packages by appending to `dependencies`. |

---

## 9. Priority Conflict Resolutions

These three conflicts must be fixed before any other canvas work. They are blocking — nothing else hooks up correctly until they are resolved.

### Fix 1 — Create `app/canvas/layout.tsx` (Full-Bleed Layout)

**Why full-bleed:** ReactFlow needs to own the full viewport (`h-screen w-screen`). With InstructorLayout present, the canvas is squeezed into the space beside the sidebar, breaking coordinate math, fitView, minimap alignment, and the overall spatial feel. Full-bleed means the canvas renders edge-to-edge with no chrome (no TopNav, no Sidebar). Navigation back to the dashboard lives in the floating toolbar as a single icon.

**Do NOT use a minimized/collapsed sidebar:** The Sidebar component supports collapsing to 56px (icon-only), but this still offsets the ReactFlow container. Node positions are stored as absolute canvas coordinates in the DB — if the container width changes when the sidebar opens/closes, stored positions render incorrectly. The floating toolbar already contains everything the sidebar provides for the canvas context.

**Fix:** Create `frontend/app/canvas/layout.tsx`. Next.js App Router layout files are scoped — this file automatically applies to all routes under `/canvas/*` and overrides the root layout for those routes.

```tsx
// frontend/app/canvas/layout.tsx
export default function CanvasLayout({ children }: { children: React.ReactNode }) {
  return <div className="h-screen w-screen overflow-hidden">{children}</div>;
}
```

The canvas page must NOT import or use `InstructorLayout`. Remove it from `app/canvas/page.tsx` (and the future `[projectId]/page.tsx`).

---

### Fix 2 — Rename Canvas Route to `[projectId]`

**Problem:** Current canvas lives at `app/canvas/page.tsx` — a static route. Every user hitting `/canvas` sees the same hardcoded page. The spec requires one canvas per project, addressed by project ID in the URL.

**Fix:** Create `frontend/app/canvas/[projectId]/page.tsx` as the real canvas page. The existing `app/canvas/page.tsx` should become either:
- A project listing page ("Your canvases") that links to `/canvas/{projectId}`, or
- A redirect to a default/demo project.

Do not delete `app/canvas/page.tsx` until a replacement behavior is decided. Just do not route real canvas work through it.

---

### Fix 3 — Wire `ChatNode.tsx` to Real Backend (Replace Mock)

**Problem:** `ChatNode.tsx` lines 11–19 use `setTimeout` + a hardcoded string for AI responses. There is no API call anywhere in the component. This means the canvas appears to work during development but produces no real AI output.

**Fix:** Replace the `handleSend` function body with a call to `useStreamingChat(nodeId, sessionId)` hook that hits `POST /api/canvas/nodes/:id/messages` and streams SSE tokens into the message list. The `nodeId` must be passed through React Flow's `data` prop from the canvas page.

The mock can stay as a fallback (e.g., when `NEXT_PUBLIC_API_URL` is not set) but must not be the default path.

---

### Fix Summary Table

| Fix | File(s) to create | File(s) to modify | Blocks |
|---|---|---|---|
| 1 — Full-bleed layout | `app/canvas/layout.tsx` | `app/canvas/page.tsx` (remove InstructorLayout import) | Canvas rendering, ReactFlow coordinates |
| 2 — Dynamic route | `app/canvas/[projectId]/page.tsx` | `app/canvas/page.tsx` (convert to listing/redirect) | Per-project canvas, backend projectId wiring |
| 3 — Real chat | `lib/canvas-api.ts`, `hooks/useStreamingChat.ts` | `components/canvas/ChatNode.tsx` | All AI functionality |

---

## 11. Implementation Order

Build in this sequence. Each step is independently testable.

### Phase 1 — Backend Scaffold (testable via curl) ✅ DONE

1. ✅ Add canvas models to `models/canvas.py`
2. ✅ Create Alembic migration for canvas tables
3. ✅ Create `routers/canvas.py` with project + node + edge CRUD only (no chat, no WebSocket yet)
4. Mount router in `main.py`
5. ✅ Add canvas env vars to `config.py` and `.env.example`
6. **Test**: `POST /api/canvas/projects` → `POST /api/canvas/projects/:id/nodes` → `GET /api/canvas/projects/:id`

### Phase 2 — Streaming Chat (testable via curl + EventSource) ✅ DONE

1. ✅ Create `services/canvas/skills.py` (3 skills only: Tutor, Socratic, Research Assistant)
2. ✅ Create `services/canvas/context.py` (context assembly — builds messages array from linked nodes)
3. ✅ Create `services/canvas/claude.py` (Anthropic streaming wrapper — no tool handling in initial scope)
4. ✅ Add `POST /api/canvas/nodes/:id/messages` SSE endpoint to `routers/canvas.py`
5. ✅ Add `GET /api/canvas/nodes/:id/messages` list endpoint
6. ✅ **Test**: `curl -N -X POST .../messages` → SSE tokens stream, messages persisted to DB

> **Initial scope decisions:**
> - Tools (`create_branches`, `generate_quiz`, etc.) — **SKIPPED**, too complex under time pressure
> - Skills reduced to 3: **Tutor**, **Socratic**, **Research Assistant**

### Phase 3 — Frontend Canvas Route 🤝 FRONTEND HANDOFF

> **Owner: Frontend partner.** Backend is ready — SSE endpoint is live and tested.
> Partner needs `NEXT_PUBLIC_API_URL=http://localhost:8000` in `frontend/.env.local`.

**What the backend provides (ready now):**
- `POST /api/canvas/projects` — create project
- `GET /api/canvas/projects/:id` — load all nodes + edges
- `POST /api/canvas/projects/:id/nodes` — create node
- `PATCH /api/canvas/nodes/:id` — update position/skill
- `POST /api/canvas/nodes/:id/messages` — SSE stream
- `GET /api/canvas/nodes/:id/messages` — load conversation history

**Frontend tasks:**
1. Create `frontend/app/canvas/layout.tsx` (full-bleed, no sidebar)
2. Create `frontend/lib/api.ts` (shared fetch wrapper)
3. Create `frontend/lib/canvas-api.ts` (typed canvas API calls)
4. Create `frontend/app/canvas/[projectId]/page.tsx` (loads project, initializes React Flow)
5. Wire `ChatNode.tsx` to real backend: replace mock `setTimeout` with `useStreamingChat` hook
6. Create `frontend/components/canvas/hooks/useStreamingChat.ts`
7. **Test**: Open canvas page, type a message, see real Claude response stream

### Phase 4 — Branching & Files

**Backend tasks (this session):**
1. `POST /api/canvas/nodes/:id/branch` endpoint
2. `POST /api/canvas/projects/:id/files` upload endpoint
3. Wire image + document files into `context.py`

**Frontend tasks (partner):**
4. `BranchSelector.tsx` — checkbox selection + "Create Branch" action
5. `ImageNode.tsx` + `DocumentNode.tsx` (real file display, not placeholders)
6. Canvas drag-and-drop file handler → calls upload endpoint → adds node at drop position
7. **Test**: Branch a conversation, upload an image, draw edge to chat, ask Claude about image

### Phase 5 — Tools & Artifacts 🔄 IN PROGRESS

> Phases 1, 2, 4, and 6 are complete. Phase 5 is now the active backend focus.

#### Artifact Design Decisions

- All artifacts are stored as **markdown** (with inline math using `$...$` / `$$...$$` syntax)
- Frontend renders with `react-markdown` + `remark-math` + `rehype-katex` for math support
- **LaTeX document generation dropped** — KaTeX renders math expressions only, not full LaTeX documents. Markdown + KaTeX covers 95% of the use case with zero server-side complexity.
- Artifact nodes are **connectable** — draw an edge from an artifact node to a chat node and the context assembly engine (`context.py`) injects the artifact content into the system prompt as reference material. Students can branch off artifacts to discuss them.
- All artifacts are **downloadable** as `.md` files via `GET /api/canvas/nodes/:id/artifact/download`

#### Artifact Content Types (stored as markdown in `canvas_messages`)

| Type | Stored as | Renders as |
|---|---|---|
| `quiz` | Markdown with Q&A structure | Interactive card or rendered markdown |
| `flashcard` | Markdown with term/definition/example | Flip card UI or rendered markdown |
| `study_guide` | Freeform markdown | Rendered markdown + download button |
| Math-heavy content | Markdown with `$math$` syntax | KaTeX-rendered equations |

#### Tool Definitions (priority order)

| Tool | Priority | Effect |
|---|---|---|
| `create_branches` | 1 — highest demo impact | Creates N child chat nodes + edges in DB; broadcasts via WebSocket |
| `generate_quiz` | 2 | Creates artifact node with quiz markdown; connectable to chat |
| `create_flashcard` | 3 | Creates artifact node with flashcard markdown; connectable to chat |
| `suggest_branch` | 4 — stretch | Returns suggestion only; no DB write; frontend shows confirm UI |

**Backend tasks:**
1. `services/canvas/tools.py` — tool JSON schemas for Claude (`create_branches`, `generate_quiz`, `create_flashcard`, `suggest_branch`)
2. Wire tool handling into `claude.py` — separate accumulation + execution code path (finish stream → execute tool → emit `tool_result` SSE → follow-up stream)
3. Implement `create_branches` execution — create N child nodes + edges in DB, broadcast `node_created` + `edge_created` per node/edge
4. Implement `generate_quiz` execution — create artifact node + store quiz as markdown message, broadcast `node_created`
5. Implement `create_flashcard` execution — create artifact node + store flashcard as markdown message, broadcast `node_created`
6. Add `GET /api/canvas/nodes/:id/artifact/download` endpoint — serves artifact content as `.md` file download

**Frontend tasks (partner):**
7. Handle `tool_result` SSE events — render new nodes/edges immediately from event payload
8. `ArtifactNode.tsx` — renders markdown content with KaTeX math support + download button
9. Install `remark-math` + `rehype-katex` for math rendering in artifact nodes
10. **Test**: Ask Claude a multi-angle question → `create_branches` fires → new nodes appear on canvas; ask for a quiz → artifact node appears, draw edge to new chat, discuss it

### Phase 6 — Multiplayer

**Backend tasks (this session):**
1. `services/canvas/multiplayer.py` — in-memory room manager
2. `app/ws/__init__.py` + `app/ws/canvas.py` — WebSocket endpoint + lock logic
3. Mount WebSocket router in `main.py`
4. Broadcast mutation events from all REST endpoints
5. `POST /api/canvas/projects/:id/sessions` endpoint

**Frontend tasks (partner):**
6. `useCanvasSocket.ts` hook — connect, handle events, update React Flow state
7. `JoinModal.tsx`, `PresenceBar.tsx`, `LockIndicator.tsx`
8. **Test**: Two browser tabs on same project — nodes created in one appear in the other

---

## 12. Known Constraints & Decisions

| Item | Decision |
|---|---|
| File storage | Canvas files stored as base64 in `canvas_files.file_data` for MVP. Add Vultr S3 when `VULTR_ACCESS_KEY` is set — fall back to DB storage if not configured. |
| WebSocket locks | In-memory dict in `multiplayer.py`. Acceptable for single-instance deploy. Document that Redis is needed for multi-instance. |
| Canvas tables | All prefixed `canvas_` — no naming conflicts with existing 19 tables. |
| Auth on canvas | Canvas sessions use lightweight display-name tokens (no password). Existing instructor basic auth is NOT applied to canvas endpoints. Student canvas is unauthenticated by design. |
| Claude model | Reuse `settings.ANTHROPIC_MODEL` (`claude-sonnet-4-20250514`). Do not hardcode model in canvas service. |
| Streaming | Use FastAPI `StreamingResponse` with `media_type="text/event-stream"`. Each SSE chunk is `data: <json>\n\n`. |
| Context size | `max_tokens=1024` for canvas chat during development; raise to `4096` for demo. Add rate limiting before exposing to real users. |
| Canvas page layout conflict | `app/canvas/page.tsx` currently uses `InstructorLayout`. The new `app/canvas/layout.tsx` will apply to all routes under `/canvas/*`, overriding the root layout. The old `app/canvas/page.tsx` becomes a project-listing or redirect page and no longer uses `InstructorLayout`. |
| React Flow import | Already using `@xyflow/react` (v12). Import from `@xyflow/react`, not `reactflow`. The existing canvas page already shows the correct import pattern. |
| Artifact format | All artifacts stored as markdown. LaTeX document generation dropped — KaTeX handles math expressions inside markdown. No server-side PDF compilation. |
| Artifact download | `GET /api/canvas/nodes/:id/artifact/download` — returns raw markdown as `Content-Disposition: attachment; filename=artifact.md`. |
| Artifact math rendering | Frontend uses `react-markdown` + `remark-math` + `rehype-katex`. Inline math: `$...$`. Block math: `$$...$$`. |
| Artifact nodes as context | Artifact node content is injected into the system prompt (not conversation history) when a downstream chat node references it via an edge. Already handled in `context.py`. |

---

## 13. Environment Variable Summary

Full `.env` required for complete canvas functionality:

```bash
# Existing (required)
DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/conceptpilot
ANTHROPIC_API_KEY=sk-ant-...

# Existing (optional overrides)
ANTHROPIC_MODEL=claude-sonnet-4-20250514
CORS_ALLOWED_ORIGINS=http://localhost:3000

# New — Canvas (optional, features degrade gracefully if absent)
ELEVENLABS_API_KEY=           # TTS study content
ELEVENLABS_VOICE_ID=          # ElevenLabs voice model ID
VULTR_ACCESS_KEY=             # S3-compatible object storage
VULTR_SECRET_KEY=
VULTR_BUCKET_NAME=
VULTR_ENDPOINT_URL=           # e.g. https://ewr1.vultrobjects.com
CANVAS_RATE_LIMIT_DAILY=100
CANVAS_RATE_LIMIT_COOLDOWN_SECONDS=2

# Frontend (.env.local, not committed)
NEXT_PUBLIC_API_URL=http://localhost:8000
```
