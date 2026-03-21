# Canvas "Claude-Style" UI/UX Implementation Plan

**Purpose:** This document details the step-by-step plan to revamp the Infinite Canvas to resemble Claude's minimalist, premium aesthetic, while preserving the existing brand colors. It also covers the new interactive features: Focus Mode, Grid Background, Minimap Navigation, and Node draggability improvements.

**Current Status:** Partially implemented. See inline status markers below.

---

## 1. Aesthetic Scheme & Typography (Claude Layout)

### Concept
Claude's interface feels premium due to its generous use of whitespace, smooth rounded corners (`rounded-xl`), soft drop shadows, and clean, legible typography, free of heavy borders.

### Frontend Changes Needed:

*   **Typography:**
    *   Import the `Inter` font via `next/font/google` in `app/layout.tsx` and apply it to the `<body>` tag:
        ```tsx
        import { Inter } from 'next/font/google';
        const inter = Inter({ subsets: ['latin'] });

        // In the component:
        <body className={inter.className}>
        ```
    *   Title weights should be medium/semibold, and body text should be highly legible with `leading-relaxed` line heights.
    *   **Status:** NOT DONE. No font is currently loaded; the app uses browser default sans-serif.

*   **Card Styling (Nodes):**
    *   Change the heavy borders on nodes to soft, subtle borders (e.g., `border border-slate-200/50`).
    *   Add premium drop shadows: `shadow-sm hover:shadow-md transition-shadow`.
    *   Set corner rounding to `rounded-xl` (not `rounded-2xl` — the larger radius clips the `NodeResizeControl` drag handle on ChatNode and looks odd on tall cards).
    *   *Color Retention:* Keep the primary buttons, accents, and node headers using the existing brand colors (e.g., `#00274C` / Michigan Blue).
    *   **Status:** PARTIALLY DONE. Nodes already use `border border-[#E2E8F0]` (soft border) and `shadow-lg`. Corner rounding is currently `rounded-lg` — needs bump to `rounded-xl`.

*   **Input Area:**
    *   The chat input (`MessageInput.tsx`) currently uses `rounded-md` on the textarea, which is appropriate for a multi-line input. Keep as-is; a `rounded-full` pill shape would break on multi-line text.
    *   The inset circular send button is already positioned inline.
    *   **Status:** DONE. No changes needed.

---

## 2. Feature: Focus Mode (Enlarge Node to Full Chat)

### Concept
Users should be able to focus on any Chat Node to temporarily leave the canvas layout and enter a dedicated, full-screen chat interface (similar to standard Claude).

### Frontend Changes Needed:

*   **Two entry points for Focus Mode:**
    1.  **Per-node Maximize button:** Add a `<Maximize2 />` icon button to the top-right of the `ChatNode.tsx` header (next to the existing Minimize button). Clicking it passes the node's ID upward via a callback in `data` (e.g., `data.onFocusNode(id)`).
    2.  **Global toggle (already exists):** The `ViewToggle` component (top-right FAB) switches to `LinearChatView` showing the first chat node. This serves as a quick shortcut.

*   **Triggering Focus:** Clicking either entry point sets `activeFocusNodeId` in `page.tsx`. The `LinearChatView` receives the matching node and its `useStreamingChat` hook instance so chat state is shared.
    *   **Important dependency:** `LinearChatView` requires `useStreamingChat(activeChatId)` to be called at the page level so the hook's message state persists across view switches.

*   **View Transition:** When `activeFocusNodeId` is set, `page.tsx` mounts `LinearChatView` full-screen instead of the `ReactFlow` canvas.

*   **Return to Canvas:** The `LinearChatView` already has access to the `ViewToggle` which shows "View Canvas" when in linear mode.

*   **Status:** PARTIALLY DONE. Global toggle and `LinearChatView` work. Per-node Maximize button is NOT yet added.

---

## 3. Feature: Clean Dot Grid Background

### Concept
A subtle, clean dot grid provides a sense of scale and infinite space without cluttering the screen.

### Frontend Changes Needed:

*   **Update `<Background />` Component:**
    In `app/canvas/[projectId]/page.tsx`, add `BackgroundVariant` to the import and set the variant to dots:
    ```tsx
    import { Background, BackgroundVariant } from '@xyflow/react';

    <Background
      variant={BackgroundVariant.Dots}
      gap={24}
      size={2}
      color="#CBD5E1"
      style={{ backgroundColor: '#FAFBFC' }}
    />
    ```
    **Note:** `BackgroundVariant` must be added to the existing `@xyflow/react` import statement. The current code is missing the `variant` prop entirely, so it renders default grid lines instead of dots.

*   **Status:** NOT DONE. Current background uses `gap={20}`, `size={1}`, and no `variant` prop.

---

## 4. Feature: Interactive Bottom-Right Minimap

### Concept
To navigate large canvases, the user should be able to click and drag within a minimap located at the bottom right.

### Frontend Changes Needed:

*   **Enable Minimap Interactivity:**
    Update the `<MiniMap />` component in `page.tsx`:
    ```tsx
    <MiniMap
      className="bg-white/80 backdrop-blur-md rounded-xl shadow-lg border border-slate-200"
      nodeColor="#00274C"
      maskColor="rgba(248, 250, 252, 0.7)"
      pannable={true}
      zoomable={true}
      position="bottom-right"
    />
    ```

*   **Changes from current code:**
    *   Add `pannable={true}` — enables click/drag navigation within the minimap.
    *   Add `zoomable={true}` — enables scroll-to-zoom within the minimap.
    *   Add `position="bottom-right"` — explicitly set position.
    *   Change `maskColor` from `rgba(0, 0, 0, 0.1)` (dark overlay) to `rgba(248, 250, 252, 0.7)` (light, frosted overlay matching the canvas bg).
    *   Add `backdrop-blur-md` to the className for a frosted glass effect.

*   **Performance note:** `backdrop-blur-md` can cause jank on low-end devices. If performance is a concern, remove it and use a solid `bg-white` instead.

*   **Status:** NOT DONE. Current minimap has no interactivity props and uses a dark mask color.

---

## 5. Feature: Node Visibility & Draggability

### Concept
Nodes must be easy to move without accidentally highlighting text or triggering inputs.

### Frontend Changes Needed:

*   **Drag isolation (already solved):**
    The `nodrag` and `nowheel` CSS classes are already applied to all scrollable content areas (`MessageList`, `MessageInput`, `ArtifactNode` code area, `DocumentNode` page viewer). This prevents text selection and scroll events from triggering node drags or canvas zoom. No `custom-drag-handle` class is needed — the existing approach is simpler and already works.

*   **Drag threshold:**
    Add `nodeDragThreshold={5}` to the `<ReactFlow>` component in `page.tsx` as an additional safety net against accidental micro-drags:
    ```tsx
    <ReactFlow
      ...
      nodeDragThreshold={5}
    >
    ```
    **Status:** NOT DONE.

*   **DELETE the progress bar:**
    The green progress bar in `ChatNode.tsx` (the `<div>` with `bg-[#16A34A]` that fills based on `messages.length * 10%`) serves no purpose and clutters the interface. Delete the entire progress bar section (the `px-3 pt-2 shrink-0` wrapper and its children).
    **Status:** NOT DONE. Still present in ChatNode.tsx.

---

## 6. Backend Requirements (Post-Frontend)

Once the frontend layout and Focus Mode are complete, the backend will need to be updated to fully support these features:

1.  **Message History Endpoint (`GET /api/canvas/nodes/{id}/messages`):**
    *   *Why:* When a user expands a node into Focus Mode, the frontend will need to fetch the full conversation history for that specific node (especially if they refresh the page while in Focus Mode).
2.  **State Persistence (`PATCH /api/canvas/nodes/{id}`):**
    *   *Why:* If you want the app to remember which nodes were expanded or minimized (if we add minimization later), the database `canvas_nodes` table will need an `is_focused` or `is_maximized` column.
3.  **Context Assembly for Focus Mode (`POST /api/canvas/nodes/{id}/messages`):**
    *   *Why:* Even when in Focus Mode, if that chat node is connected to a Document Node on the hidden canvas, the backend's context assembly engine must still fetch the file contents from the parent node to provide Claude with the correct context. The backend must traverse the `canvas_edges` regardless of which view the frontend is rendering.

**Status:** NOT STARTED. This is post-frontend work.

---

## Implementation Priority

| Priority | Item | Section | Effort |
|----------|------|---------|--------|
| HIGH | Add `BackgroundVariant.Dots` to Background | 3 | ~5 min |
| HIGH | Add `pannable`/`zoomable` to MiniMap | 4 | ~5 min |
| HIGH | Delete progress bar from ChatNode | 5 | ~5 min |
| HIGH | Add `nodeDragThreshold={5}` to ReactFlow | 5 | ~2 min |
| MEDIUM | Import Inter font in layout.tsx | 1 | ~10 min |
| MEDIUM | Bump node rounding to `rounded-xl` | 1 | ~15 min |
| MEDIUM | Update MiniMap maskColor + styling | 4 | ~5 min |
| LOW | Add per-node Maximize button for Focus Mode | 2 | ~30 min |
