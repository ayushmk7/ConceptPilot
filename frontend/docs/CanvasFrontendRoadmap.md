# Canvas Frontend Roadmap & Integration Reference

**Purpose:** Ground truth for building and integrating the Infinite Canvas on the frontend without creating merge conflicts with the existing codebase. 
*This document is a frontend-specific extraction of the main `CanvasRoadmap.md`.*

---

## 1. Directory Structure & New Folder

All new frontend documentation for the canvas feature can be stored in this new `docs` folder inside `frontend/` (e.g., `frontend/docs/`). 

---

## 2. What Is Already Built (Frontend)

### 2.1 Pages (Next.js App Router)
Root is `frontend/`. Pages live at `frontend/app/`:

| Route | File | Status |
|---|---|---|
| `/` | `app/page.tsx` | Exists (landing) |
| `/dashboard` | `app/dashboard/page.tsx` | Exists |
| `/upload` | `app/upload/page.tsx` | Exists |
| `/canvas` | `app/canvas/page.tsx` | Exists — **has conflicts, requires fixing** |
| `/canvas/[projectId]` | `app/canvas/[projectId]/page.tsx` | **MISSING — must be created** |

### 2.2 Shared Components
- `components/InstructorLayout.tsx` — TopNav + Sidebar wrapper (**do NOT use on canvas**)
- `components/TopNav.tsx` — Michigan Blue nav bar
- `components/Sidebar.tsx` — Left sidebar with nav links
- `components/ui/` — Full shadcn/ui library (safe to use anywhere, but read-only, do not modify)

### 2.3 Canvas Components
**Existing:**
- `components/canvas/ChatNode.tsx` — Uses mock responses. Needs backend wiring.
- `components/canvas/DocumentNode.tsx` — Static/display only.

**Missing (Need to be created):**
- `components/canvas/ImageNode.tsx`
- `components/canvas/ArtifactNode.tsx`
- `components/canvas/chat/MessageList.tsx`, `MessageInput.tsx`, `MessageBubble.tsx`, `BranchSelector.tsx`, `SkillPicker.tsx`
- `components/canvas/panels/Toolbar.tsx`, `SettingsPanel.tsx`
- `components/canvas/multiplayer/JoinModal.tsx`, `PresenceBar.tsx`, `LockIndicator.tsx`
- `components/canvas/hooks/useStreamingChat.ts`
- `components/canvas/hooks/useCanvasSocket.ts`

### 2.4 Dependencies
**Already Installed:** `@xyflow/react` (v12.10.1), `react-dnd`, `react-dnd-html5-backend`, `motion`, `recharts`, `lucide-react`, `next`.
*(Note: Import React Flow from `@xyflow/react`, not `reactflow`)*

**Missing (Need to be added):**
- `react-markdown` (Markdown rendering in chat)
- `react-syntax-highlighter` (Code block highlighting)

---

## 3. Shared File Edit Rules (Anti-Conflict)

To prevent merge conflicts, strictly follow these rules for shared files:

| File | Rule |
|---|---|
| `frontend/app/layout.tsx` | **Do NOT modify.** Canvas layout overrides via `app/canvas/layout.tsx`. |
| `frontend/components/ui/` | **Read-only** — imported shadcn/ui components. Never modify. |
| `frontend/package.json` | Add canvas-specific packages by appending to `dependencies`. |

---

## 4. Priority Conflict Resolutions (Blockers)

These must be fixed before building other frontend canvas features:

### Fix 1: Full-Bleed Layout (`app/canvas/layout.tsx`)
**Problem:** `app/canvas/page.tsx` uses `InstructorLayout`, squeezing the canvas.
**Fix:** Create `frontend/app/canvas/layout.tsx` to override the root layout:
```tsx
export default function CanvasLayout({ children }: { children: React.ReactNode }) {
  return <div className="h-screen w-screen overflow-hidden">{children}</div>;
}
```
*Remove `InstructorLayout` imports from any canvas pages.*

### Fix 2: Rename Canvas Route to `[projectId]`
**Problem:** `app/canvas/page.tsx` is static. We need dynamic per-project canvases.
**Fix:** Create `frontend/app/canvas/[projectId]/page.tsx` as the *real* canvas. Convert the old `app/canvas/page.tsx` into a project listing/redirect page.

### Fix 3: Wire up Real Chat (Replace Mock)
**Problem:** `ChatNode.tsx` uses `setTimeout` mocks.
**Fix:** Replace mockup `handleSend` with the `useStreamingChat(nodeId, sessionId)` hook calling the SSE endpoint.

---

## 5. Frontend Integration Points

### 5.1 API Setup
Create `frontend/lib/api.ts` (shared fetch wrapper) and `frontend/lib/canvas-api.ts` (canvas-specific typed calls).
Set environment variables:
- `NEXT_PUBLIC_API_URL=http://localhost:8000` (in `.env.local` and `.env.example`)

### 5.2 Canvas Page Mount Logic (`app/canvas/[projectId]/page.tsx`)
1. Read `projectId` from URL params.
2. Call `GET /api/canvas/projects/:projectId` to load nodes and edges.
3. Check `localStorage` for session. If missing, show `JoinModal`.
4. If exists, `POST /api/canvas/projects/:projectId/sessions` to rejoin.
5. Connect WebSocket: `ws://API_BASE/ws/canvas/{projectId}/{sessionId}`.
6. Init React Flow.

### 5.3 Node Type Registration
Map custom nodes for React Flow in the canvas page:
```typescript
const nodeTypes = {
  chat: ChatNode, image: ImageNode, document: DocumentNode, artifact: ArtifactNode,
};
```

### 5.4 ChatNode Data Contract
Pass `nodeId` and `sessionId` into each node's `data` prop:
```typescript
type ChatNodeData = {
  nodeId: string;
  title: string;
  skill: string;
  sessionId: string;
  isLocked: boolean;
  lockedByName?: string;
};
```

---

## 6. Implementation Order (Frontend Only)

1. **Routing & Layout:**
   - Create `app/canvas/layout.tsx` (full-bleed).
   - Create `app/canvas/[projectId]/page.tsx`.
   - Setup `lib/api.ts` and `lib/canvas-api.ts`.
2. **Streaming Chat:**
   - Create `useStreamingChat.ts` hook.
   - Wire `ChatNode.tsx` to the backend.
3. **Branching & Files:**
   - Create `BranchSelector.tsx`, `ImageNode.tsx`, `DocumentNode.tsx`.
   - Setup drag-and-drop file uploader on canvas.
4. **Tools & Artifacts:**
   - Support `tool_result` SSE events to render fan-out branches.
   - Create `ArtifactNode.tsx` and `SkillPicker.tsx`.
5. **Multiplayer (Sockets):**
   - Create `useCanvasSocket.ts` hook.
   - Build `JoinModal.tsx`, `PresenceBar.tsx`, `LockIndicator.tsx`.
