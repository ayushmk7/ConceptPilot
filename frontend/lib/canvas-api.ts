/**
 * Canvas workspace persistence (API) + chat session helpers for the canvas UI.
 */

import { apiFetch } from './api';

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

/* ------------------------------------------------------------------ */
/*  Chat types (match backend schemas)                                 */
/* ------------------------------------------------------------------ */

export interface ChatSession {
  id: string;
  exam_id: string | null;
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

export function createChatSession(examId?: string) {
  return apiFetch<ChatSession>('/chat/sessions', {
    method: 'POST',
    body: JSON.stringify({ exam_id: examId ?? null, title: null }),
  });
}

export function getSessionMessages(sessionId: string) {
  return apiFetch<ChatMessage[]>(`/chat/sessions/${sessionId}/messages`);
}

export function sendMessage(sessionId: string, message: string, examId?: string) {
  return apiFetch<ChatSendResponse>(`/chat/sessions/${sessionId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ message, exam_id: examId ?? null }),
  });
}

/* ------------------------------------------------------------------ */
/*  Local-storage project stubs (used by Infinite Canvas page)         */
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
