/**
 * Canvas-specific typed API calls.
 *
 * Uses the existing /chat backend endpoints for messaging.
 * Canvas project CRUD endpoints are stubbed — the backend doesn't have
 * a dedicated canvas router yet, so we fall back to local state.
 */

import { apiFetch } from './api';

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
/*  Canvas project stubs                                               */
/*  TODO: Replace with real endpoints once backend canvas router exists */
/* ------------------------------------------------------------------ */

export interface CanvasProject {
  id: string;
  name: string;
  nodes: SerializedNode[];
  edges: SerializedEdge[];
  created_at: string;
  updated_at: string;
}

export interface SerializedNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
}

export interface SerializedEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
}

/**
 * Stub: loads canvas project from localStorage.
 * Replace with `GET /api/canvas/projects/:id` when available.
 */
export function loadCanvasProject(projectId: string): CanvasProject | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(`canvas_project_${projectId}`);
  return raw ? (JSON.parse(raw) as CanvasProject) : null;
}

/**
 * Stub: saves canvas project to localStorage.
 * Replace with `PUT /api/canvas/projects/:id` when available.
 */
export function saveCanvasProject(project: CanvasProject): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`canvas_project_${project.id}`, JSON.stringify(project));
}
