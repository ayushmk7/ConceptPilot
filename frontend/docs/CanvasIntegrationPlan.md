# Integrating Canvas Frontend with Backend API

## Goal Description
The infinite canvas frontend currently mocks data and saves its state strictly to `localStorage`. We need to wire it up to the existing backend endpoints mapped at `/api/canvas/` to achieve true persistence, support for server-side streaming chat, and properly register nodes/edges in the PostgreSQL database.

---

## Proposed Changes

### 1. Canvas Networking Layer
**File to modify:** `frontend/lib/canvas-api.ts`
- Expand `canvas-api.ts` to include typed wrappers for:
  - `GET /api/canvas/projects/:id` (load project nodes/edges)
  - `POST /api/canvas/projects/:id/nodes` (create node)
  - `PATCH /api/canvas/nodes/:id` (update position, title, etc.)
  - `DELETE /api/canvas/nodes/:id` (delete node)
  - `POST /api/canvas/projects/:id/edges` (create edge)
  - `DELETE /api/canvas/edges/:id` (delete edge)
  - `GET /api/canvas/nodes/:id/messages` (fetch chat history)
  - `POST /api/canvas/nodes/:id/branch` (create a branch node and edge)
  - `POST /api/canvas/projects/:id/sessions` (join/create user session)
- Deprecate/remove `localStorage` mock functions `loadCanvasProject` and `saveCanvasProject`.

### 2. Streaming Chat Hook
**File to modify:** `frontend/components/canvas/hooks/useStreamingChat.ts`
- Modify `useStreamingChat` to fetch conversation history via `GET /api/canvas/nodes/:id/messages` on component load.
- Rewrite the `send` function to use `fetch` directly against `POST /api/canvas/nodes/:id/messages`.
- Properly handle Server-Sent Events (SSE). It needs to parse chunks properly to extract text tokens (`"type": "token"`), tool calls (`"type": "tool_result"`), and completion status (`"type": "done"`).

### 3. Main Canvas Component
**File to modify:** `frontend/app/canvas/[projectId]/page.tsx`
- Replace `localStorage` loading/saving mechanisms with `useEffect` hooks relying on the `canvas-api` SDK functions.
- **On mount:** ensure a session exists using `createSession` and fetch the active `CanvasProject` structure to load `nodes` and `edges` into the `ReactFlow` instance.
- Pass `nodeId` and `sessionId` into the `data` prop of each node.
- **On node create:** Hook UI actions (like `addChat`) to execute `POST /api/canvas/projects/:projectId/nodes` before updating React state.
- **On edge connect:** Rewrite `onConnect` to push a new Edge via API `POST /api/canvas/projects/:projectId/edges`, applying the returned specific ID to local state.
- **On delete:** Hook `handleDeleteNode` to hit `DELETE /api/canvas/nodes/:id` (and equivalent edges).
- **On drag:** Handle Node dragging (`onNodesChange`) by firing a debounced `PATCH /api/canvas/nodes/:id` update so the database remains in sync securely without blocking UI thread.
- **On branch:** Modify `stableBranchCreate` to hit the `/api/canvas/nodes/:id/branch` endpoint, returning the newly created child node and auto-drawing the generated edge.

---

## Action Plan Checklist

- [ ] Update `frontend/lib/canvas-api.ts` with typed definitions for `/api/canvas/*` endpoints.
  - [ ] `getProject(projectId)`
  - [ ] `createNode(projectId, data)`
  - [ ] `updateNode(nodeId, data)`
  - [ ] `deleteNode(nodeId)`
  - [ ] `createEdge(projectId, data)`
  - [ ] `deleteEdge(edgeId)`
  - [ ] `createBranch(nodeId, data)`
  - [ ] `createSession(projectId, data)`

- [ ] Update `frontend/components/canvas/hooks/useStreamingChat.ts`
  - [ ] Fetch existing messages on mount from `GET /api/canvas/nodes/:nodeId/messages`
  - [ ] Rewrite `send` function to use `fetch` and parse SSE from `POST /api/canvas/nodes/:nodeId/messages`
  - [ ] Correctly handle SSE events (`token`, `tool_start`, `tool_result`, `done`, `error`)

- [ ] Update `frontend/app/canvas/[projectId]/page.tsx`
  - [ ] Remove `loadCanvasProject` and `saveCanvasProject` `localStorage` logic
  - [ ] On mount: join session via `POST /api/canvas/projects/:projectId/sessions` and fetch project data
  - [ ] Send `nodeId` and `sessionId` into `ChatNode` `data` props
  - [ ] Hook `addChat` node creation to the `POST /api/canvas/projects/:projectId/nodes` endpoint
  - [ ] Hook `onConnect` edge creation to `POST /api/canvas/projects/:projectId/edges` endpoint
  - [ ] Hook `handleDeleteNode` to `DELETE /api/canvas/nodes/:id` and `DELETE /api/canvas/edges/:id` endpoints
  - [ ] Hook node dragging to update positions using `PATCH /api/canvas/nodes/:id`
  - [ ] Hook `stableBranchCreate` to use `POST /api/canvas/nodes/:id/branch` endpoint
