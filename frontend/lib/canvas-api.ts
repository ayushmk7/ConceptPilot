/**
 * Canvas workspace persistence (API) + chat session helpers for the canvas UI.
 *
 * Anonymous student infinite canvas:
 * - Exam-scoped rows live in Postgres (`student_workspaces`, `canvas_projects`, and a matching
 *   `canvas_workspaces` row with the same UUID as `canvas_project_id`).
 * - The student UI syncs React Flow state via `GET/PUT /api/v1/student/canvas-workspace`.
 * - Legacy fallback: older builds only stored graph JSON in `localStorage` under `canvas_project_{id}`;
 *   the project page migrates from local storage when the API returns an empty graph.
 */

import { apiFetch } from './api';
import { readStudentWorkspace } from './student-workspace-storage';

/* ------------------------------------------------------------------ */
/*  Workspace API (backend)                                          */
/* ------------------------------------------------------------------ */

export interface CanvasWorkspaceApi {
  id: string;
  title: string;
  state: CanvasWorkspaceState;
  created_at: string;
  updated_at: string;
}

/** Persisted inside `state` JSONB (nodes/edges as plain JSON). */
export interface CanvasWorkspaceState {
  nodes?: SerializedNode[];
  edges?: SerializedEdge[];
  viewMode?: 'canvas' | 'linear';
  /** Toolbar file chips (metadata only; not the binary uploads). */
  files?: Array<{ id: string; name: string; type: string; size: number }>;
}

export interface SerializedNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  style?: Record<string, unknown>;
  data: Record<string, unknown>;
}

export interface SerializedEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
  animated?: boolean;
  style?: Record<string, unknown>;
}

export async function listCanvasWorkspaces(): Promise<CanvasWorkspaceApi[]> {
  return apiFetch<CanvasWorkspaceApi[]>('/api/v1/canvas-workspaces');
}

export async function createCanvasWorkspace(title?: string): Promise<CanvasWorkspaceApi> {
  return apiFetch<CanvasWorkspaceApi>('/api/v1/canvas-workspaces', {
    method: 'POST',
    jsonBody: {
      title: title?.trim() || 'Untitled Workspace',
      state: {},
    },
  });
}

export async function getCanvasWorkspace(id: string): Promise<CanvasWorkspaceApi> {
  return apiFetch<CanvasWorkspaceApi>(`/api/v1/canvas-workspaces/${encodeURIComponent(id)}`);
}

export async function updateCanvasWorkspace(
  id: string,
  body: { title?: string; state?: CanvasWorkspaceState },
): Promise<CanvasWorkspaceApi> {
  return apiFetch<CanvasWorkspaceApi>(`/api/v1/canvas-workspaces/${encodeURIComponent(id)}`, {
    method: 'PUT',
    jsonBody: body,
  });
}

export async function deleteCanvasWorkspace(id: string): Promise<void> {
  await apiFetch<void>(`/api/v1/canvas-workspaces/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

/** Student infinite canvas (same document id as `canvas_projects.id` for this workspace). */
export async function getStudentCanvasWorkspace(): Promise<CanvasWorkspaceApi> {
  return apiFetch<CanvasWorkspaceApi>('/api/v1/student/canvas-workspace');
}

export async function updateStudentCanvasWorkspace(body: {
  title?: string;
  state?: CanvasWorkspaceState;
}): Promise<CanvasWorkspaceApi> {
  return apiFetch<CanvasWorkspaceApi>('/api/v1/student/canvas-workspace', {
    method: 'PUT',
    jsonBody: body,
  });
}

/* ------------------------------------------------------------------ */
/*  Chat types (match backend schemas)                                 */
/* ------------------------------------------------------------------ */

export interface ChatSession {
  id: string;
  exam_id: string | null;
  surface?: string;
  title: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  tool_calls: unknown[] | null;
  tool_name: string | null;
  created_at: string;
}

export interface ChatSendResponse {
  session_id: string;
  assistant_message: string;
  tool_calls_made: string[];
}

/* ------------------------------------------------------------------ */
/*  Chat API calls                                                     */
/* ------------------------------------------------------------------ */

export type CanvasChatSurface = 'instructor' | 'student';

export function createChatSession(
  examId?: string,
  opts?: { surface?: CanvasChatSurface; reportToken?: string | null },
) {
  const surface = opts?.surface ?? 'instructor';
  const body: Record<string, unknown> = {
    exam_id: examId ?? null,
    title: null,
    surface,
  };
  if (surface === 'student' && opts?.reportToken) {
    body.report_token = opts.reportToken;
  }
  const headers = new Headers();
  if (surface === 'student' && !opts?.reportToken) {
    const wid = readStudentWorkspace()?.examId;
    if (wid) headers.set('X-Student-Exam-Id', wid);
  }
  return apiFetch<ChatSession>('/chat/sessions', {
    method: 'POST',
    jsonBody: body,
    headers: headers.has('X-Student-Exam-Id') ? headers : undefined,
  });
}

export function getSessionMessages(sessionId: string) {
  return apiFetch<ChatMessage[]>(`/chat/sessions/${encodeURIComponent(sessionId)}/messages`);
}

export function sendMessage(
  sessionId: string,
  message: string,
  examId?: string,
  opts?: { surface?: CanvasChatSurface; reportToken?: string | null },
) {
  const surface = opts?.surface ?? 'instructor';
  const headers = new Headers();
  if (surface === 'student' && !opts?.reportToken) {
    const wid = readStudentWorkspace()?.examId;
    if (wid) headers.set('X-Student-Exam-Id', wid);
  }
  return apiFetch<ChatSendResponse>(`/chat/sessions/${encodeURIComponent(sessionId)}/messages`, {
    method: 'POST',
    jsonBody: {
      message,
      exam_id: examId ?? null,
      surface,
    },
    headers: headers.has('X-Student-Exam-Id') ? headers : undefined,
  });
}

/* ------------------------------------------------------------------ */
/*  Local-storage project stubs (instructor / legacy student fallback)  */
/* ------------------------------------------------------------------ */

export interface CanvasProject {
  id: string;
  name: string;
  nodes: SerializedNode[];
  edges: SerializedEdge[];
  created_at: string;
  updated_at: string;
}

export function loadCanvasProject(projectId: string): CanvasProject | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(`canvas_project_${projectId}`);
  return raw ? (JSON.parse(raw) as CanvasProject) : null;
}

export function saveCanvasProject(project: CanvasProject): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`canvas_project_${project.id}`, JSON.stringify(project));
}
