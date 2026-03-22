# Phase 2 — Streaming Chat Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire Claude streaming chat to the canvas backend — a user message hits `POST /api/canvas/nodes/:id/messages` and Claude's response streams back as SSE tokens.

**Architecture:** Three focused service files handle skills (static prompts), context assembly (walks canvas edges to build Claude's messages array), and streaming (calls Anthropic API, emits SSE). The router adds two endpoints that use these services. No tool use — pure token streaming only.

**Tech Stack:** FastAPI `StreamingResponse`, Anthropic async SDK (`client.messages.stream`), SQLAlchemy async ORM, SSE (`data: <json>\n\n` format)

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `backend/app/services/canvas/__init__.py` | Package marker (empty) |
| Create | `backend/app/services/canvas/skills.py` | 3 skill system prompts + `get_skill_prompt()` |
| Create | `backend/app/services/canvas/context.py` | `assemble_context()` — walks edges, builds Anthropic messages array |
| Create | `backend/app/services/canvas/claude.py` | `stream_canvas_response()` — Anthropic streaming, DB persistence, SSE emission |
| Modify | `backend/app/routers/canvas.py` | Add `GET` + `POST /nodes/{node_id}/messages` endpoints |

---

## Task 1: Package Init

**Files:**
- Create: `backend/app/services/canvas/__init__.py`

- [ ] Create the directory and the file

```
backend/app/services/canvas/__init__.py  ← empty file
```

- [ ] Verify Python can find it:

```bash
cd backend
uv run python -c "from app.services import canvas; print('ok')"
```

Expected: `ok`

- [ ] Commit

```bash
git add backend/app/services/canvas/__init__.py
git commit -m "canvas-be: add services/canvas package"
```

---

## Task 2: Skills

**Files:**
- Create: `backend/app/services/canvas/skills.py`

**What to write:** A module-level dict `SKILLS` mapping skill name → system prompt string, a `DEFAULT_SKILL` constant, and a `get_skill_prompt(skill: str) -> str` function that returns `SKILLS.get(skill, SKILLS[DEFAULT_SKILL])`.

The 3 skills and their prompts (copy from `CanvasRoadmap.md §5.5` or `backend/CLAUDE.md §Skills`):
- `"Tutor"` — patient, step-by-step, asks one clarifying question if confused
- `"Socratic"` — answers with guiding questions, never gives direct answers
- `"Research Assistant"` — summarizes, structures, flags uncertainties, uses headers

- [ ] Write `skills.py` with the `SKILLS` dict, `DEFAULT_SKILL = "Tutor"`, and `get_skill_prompt()`

- [ ] Verify in a Python shell:

```bash
uv run python -c "
from app.services.canvas.skills import get_skill_prompt
print(get_skill_prompt('Tutor')[:40])
print(get_skill_prompt('BadSkill')[:40])  # should return Tutor prompt
"
```

Expected: first 40 chars of the Tutor prompt, printed twice.

- [ ] Commit

```bash
git add backend/app/services/canvas/skills.py
git commit -m "canvas-be: add 3 skill system prompts"
```

---

## Task 3: Context Assembly Engine

**Files:**
- Create: `backend/app/services/canvas/context.py`

**What to write:** One async function:

```python
async def assemble_context(
    node_id: UUID,
    db: AsyncSession,
) -> tuple[str, list[dict], bool]:
```

Returns `(system_prompt, messages, context_truncated)` to pass directly to `messages.stream()`.

**The full algorithm is specified in `backend/CLAUDE.md` under "Context Assembly Engine".** Read that section in full before writing this file. Here is the outline:

**Step 1** — Fetch the current node. Look up `node.skill`, call `get_skill_prompt()` to get `skill_prompt`. Query all `CanvasMessage` rows for this node ordered by `created_at`, filter to `role in ("user", "assistant")`, build `own_history` list of `{"role": ..., "content": ...}` dicts.

**Step 2** — Query `CanvasEdge` rows where `target_node_id == node_id`. These are the nodes that feed context into this one.

**Step 3** — For each source node (one hop only, not transitive), handle by type:
- `"chat"` — check if there's a `CanvasBranch` record linking `parent_node_id=source.id` → `child_node_id=node_id`. If yes: load only the message IDs in `branch.source_message_ids`. If no: load all messages. Append `{"role": ..., "content": ...}` dicts to `linked_messages`.
- `"image"` — load `CanvasFile` for this node, build an Anthropic image content block: `{"role": "user", "content": [{"type": "image", "source": {"type": "base64", "media_type": ..., "data": ...}}]}`. Append to `linked_messages`.
- `"document"` — same shape but `"type": "document"` and `"media_type": "application/pdf"`.
- `"artifact"` — load the most recent `CanvasMessage` for this node, append its content to `artifact_references` list (will be injected into system prompt, not messages).

**Step 4** — Compose final outputs:
- `system_prompt`: join `[skill_prompt]` + artifact reference block (if any)
- `messages`: `linked_messages + own_history` (linked context first, this node's history after)

**Step 5 — Truncation:** If `len(messages) > 150`, trim older messages from `linked_messages`, keeping only the last 10 per linked chat node. Set a local `context_truncated: bool` flag. Return all three values: `return system_prompt, messages, context_truncated`.

> **Why linked context goes first:** Claude reads messages in order. Putting linked context before this node's own conversation gives Claude the background it needs before seeing the current exchange.

- [ ] Write `context.py` with `assemble_context()` following the 5-step algorithm

- [ ] Verify imports are clean:

```bash
uv run python -c "from app.services.canvas.context import assemble_context; print('ok')"
```

Expected: `ok` (no import errors)

- [ ] Commit

```bash
git add backend/app/services/canvas/context.py
git commit -m "canvas-be: add context assembly engine"
```

---

## Task 4: Anthropic Streaming Wrapper

**Files:**
- Create: `backend/app/services/canvas/claude.py`

**What to write:** Two things — a client singleton and an async generator.

**Client singleton** (lazy-init, reused across requests):

```python
_client: anthropic.AsyncAnthropic | None = None

def get_client() -> anthropic.AsyncAnthropic:
    global _client
    if _client is None:
        _client = anthropic.AsyncAnthropic(
            api_key=settings.ANTHROPIC_API_KEY,
            timeout=settings.ANTHROPIC_TIMEOUT_SECONDS,
            max_retries=settings.ANTHROPIC_MAX_RETRIES,
        )
    return _client
```

**Main generator** — signature:

```python
async def stream_canvas_response(
    node_id: UUID,
    content: str,
    session_id: str,
    db: AsyncSession,
) -> AsyncGenerator[str, None]:
```

This generator must:

1. **Save the user message** to `canvas_messages` with `role="user"`, `content=content`, `node_id=node_id`. Call `await db.flush()` so it gets an ID. Do this before calling Anthropic.

2. **Call `assemble_context(node_id, db)`** to get `(system_prompt, messages, context_truncated)`.

3. **Append the new user message** to the `messages` list: `messages.append({"role": "user", "content": content})`.

4. **Open a stream** with `client.messages.stream(model=settings.ANTHROPIC_MODEL, max_tokens=settings.ANTHROPIC_MAX_TOKENS, system=system_prompt, messages=messages)`.

5. **Iterate `async for event in stream`:**
   - On `event.type == "content_block_delta"` and `event.delta.type == "text_delta"`: yield `f'data: {json.dumps({"type": "token", "text": event.delta.text})}\n\n'`
   - Accumulate `event.delta.text` into a `full_text` string.

6. **After the stream ends:** save the complete assistant response to `canvas_messages` with `role="assistant"`, `content=full_text`. Call `await db.flush()`.

7. **Yield the `done` event:** `f'data: {json.dumps({"type": "done", "message_id": str(assistant_msg.id), "usage": {...}, "context_truncated": context_truncated})}\n\n'`

8. **Wrap the entire generator body** in a try/except. On any exception, yield `f'data: {json.dumps({"type": "error", "message": str(e)})}\n\n'`.

> **Usage dict:** After the stream closes, call `final = await stream.get_final_message()` — usage is at `final.usage`. Do not use `stream.usage` — that attribute does not exist on the `AsyncStream` object and will raise `AttributeError` at runtime.

- [ ] Write `claude.py` with `get_client()` and `stream_canvas_response()`

- [ ] Verify imports:

```bash
uv run python -c "from app.services.canvas.claude import stream_canvas_response; print('ok')"
```

Expected: `ok`

- [ ] Commit

```bash
git add backend/app/services/canvas/claude.py
git commit -m "canvas-be: add Anthropic streaming wrapper"
```

---

## Task 5: Add Message Endpoints to Router

**Files:**
- Modify: `backend/app/routers/canvas.py`

Add two endpoints. Reference the existing endpoint patterns in `canvas.py` for style consistency.

**Endpoint 1 — GET (list messages):**

```
GET /api/canvas/nodes/{node_id}/messages
```

- Query all `CanvasMessage` rows for this node, ordered by `created_at`
- Return as a list: `[{"id": ..., "role": ..., "content": ..., "created_at": ...}]`
- 404 if the node doesn't exist

**Add a `_message_dict()` helper** (like the existing `_node_dict()`) to serialize a `CanvasMessage` to a plain dict.

**Endpoint 2 — POST (send message, SSE stream):**

```
POST /api/canvas/nodes/{node_id}/messages
Body: { "content": str, "session_id": str }
Response: StreamingResponse(media_type="text/event-stream")
```

- Add a `MessageCreate` Pydantic model with `content: str` and `session_id: str`
- 404 if the node doesn't exist
- Call `stream_canvas_response(node_id, body.content, body.session_id, db)`
- Return `StreamingResponse(event_stream(), media_type="text/event-stream")`

Pattern:

```python
from fastapi.responses import StreamingResponse
from app.services.canvas.claude import stream_canvas_response

@router.post("/nodes/{node_id}/messages")
async def send_message(node_id: UUID, body: MessageCreate, db: AsyncSession = Depends(get_db)):
    node = await db.get(CanvasNode, node_id)
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")

    async def event_stream():
        async for chunk in stream_canvas_response(node_id, body.content, body.session_id, db):
            yield chunk

    return StreamingResponse(event_stream(), media_type="text/event-stream")
```

- [ ] Add `MessageCreate` Pydantic model to `canvas.py`
- [ ] Add `_message_dict()` helper to `canvas.py`
- [ ] Add `GET /nodes/{node_id}/messages` endpoint
- [ ] Add `POST /nodes/{node_id}/messages` endpoint (StreamingResponse)

- [ ] Verify server starts without errors:

```bash
cd backend
uv run uvicorn app.main:app --reload --port 8000
```

Expected: server starts, no import errors in the log.

- [ ] Commit

```bash
git add backend/app/routers/canvas.py
git commit -m "canvas-be: add GET and POST /nodes/:id/messages endpoints"
```

---

## Task 6: End-to-End Test

With the server running (`uv run uvicorn app.main:app --reload --port 8000`):

- [ ] Create a project and a chat node:

```bash
# Create project
PROJECT=$(curl -s -X POST http://localhost:8000/api/canvas/projects \
  -H "Content-Type: application/json" \
  -d '{"title": "Test Canvas"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
echo "Project: $PROJECT"

# Create chat node
NODE=$(curl -s -X POST http://localhost:8000/api/canvas/projects/$PROJECT/nodes \
  -H "Content-Type: application/json" \
  -d '{"type": "chat", "title": "Test Node", "position_x": 0, "position_y": 0, "skill": "Tutor"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
echo "Node: $NODE"
```

- [ ] Stream a message to the node:

```bash
curl -N -X POST http://localhost:8000/api/canvas/nodes/$NODE/messages \
  -H "Content-Type: application/json" \
  -d "{\"content\": \"What is recursion?\", \"session_id\": \"test-session-1\"}"
```

Expected output: a stream of `data: {"type": "token", "text": "..."}` lines followed by a final `data: {"type": "done", ...}` line.

- [ ] Verify messages were persisted:

```bash
curl -s http://localhost:8000/api/canvas/nodes/$NODE/messages | python3 -m json.tool
```

Expected: JSON array with 2 messages — one `"role": "user"`, one `"role": "assistant"`.

- [ ] Commit any fixes found during testing, then tag Phase 2 done:

```bash
git commit -m "canvas-be: phase 2 complete — streaming chat working" --allow-empty
```

---

## Phase 2 Acceptance Criteria

- [ ] `curl -N POST .../messages` produces streaming SSE tokens in the terminal
- [ ] Both user and assistant messages are saved to `canvas_messages` after a stream completes
- [ ] `GET /nodes/:id/messages` returns the persisted conversation
- [ ] Sending a second message in the same node includes prior conversation history (Claude responds in context)
- [ ] A node linked via an edge has its messages included as context (manually test by creating two nodes + edge, then messaging the target node)
