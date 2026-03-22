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

import { apiFetch, API_BASE } from './api';
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

/* ------------------------------------------------------------------ */
/*  Infinite Canvas — backend REST API (/api/canvas/)                  */
/* ------------------------------------------------------------------ */

/* ---- Shared types ---- */

export type CanvasNodeType = 'chat' | 'image' | 'document' | 'artifact';
export type CanvasMessageRole = 'user' | 'assistant' | 'tool';

export interface InfCanvasProject {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface InfCanvasProjectFull extends InfCanvasProject {
  nodes: InfCanvasNode[];
  edges: InfCanvasEdge[];
}

export interface InfCanvasNode {
  id: string;
  project_id: string;
  type: CanvasNodeType;
  title: string;
  position_x: number;
  position_y: number;
  is_collapsed: boolean;
  skill: string | null;
  active_user: string | null;
  created_at: string;
}

export interface InfCanvasEdge {
  id: string;
  project_id: string;
  source_node_id: string;
  target_node_id: string;
  created_at: string;
}

export interface InfCanvasMessage {
  id: string;
  node_id: string;
  role: CanvasMessageRole;
  content: string;
  tool_calls_json: unknown | null;
  tool_call_id: string | null;
  tool_name: string | null;
  created_at: string;
}

export interface InfCanvasBranch {
  id: string;
  parent_node_id: string;
  child_node_id: string;
  source_message_ids_json: string[];
  created_at: string;
}

export interface InfCanvasSession {
  session_id: string;
  display_name: string;
}

/* ---- Projects ---- */

export function infCreateProject(title?: string): Promise<InfCanvasProject> {
  return apiFetch<InfCanvasProject>('/api/canvas/projects', {
    method: 'POST',
    jsonBody: { title: title ?? 'Untitled Canvas' },
  });
}

export function infGetProject(projectId: string): Promise<InfCanvasProjectFull> {
  return apiFetch<InfCanvasProjectFull>(`/api/canvas/projects/${encodeURIComponent(projectId)}`);
}

/* ---- Nodes ---- */

export interface CreateNodeBody {
  type: CanvasNodeType;
  title: string;
  position_x: number;
  position_y: number;
  skill?: string;
}

export function infCreateNode(projectId: string, body: CreateNodeBody): Promise<InfCanvasNode> {
  return apiFetch<InfCanvasNode>(`/api/canvas/projects/${encodeURIComponent(projectId)}/nodes`, {
    method: 'POST',
    jsonBody: body,
  });
}

export interface UpdateNodeBody {
  position_x?: number;
  position_y?: number;
  is_collapsed?: boolean;
  title?: string;
  skill?: string;
}

export function infUpdateNode(nodeId: string, body: UpdateNodeBody): Promise<InfCanvasNode> {
  return apiFetch<InfCanvasNode>(`/api/canvas/nodes/${encodeURIComponent(nodeId)}`, {
    method: 'PATCH',
    jsonBody: body,
  });
}

export function infDeleteNode(nodeId: string): Promise<void> {
  return apiFetch<void>(`/api/canvas/nodes/${encodeURIComponent(nodeId)}`, {
    method: 'DELETE',
  });
}

/* ---- Edges ---- */

export function infCreateEdge(
  projectId: string,
  sourceNodeId: string,
  targetNodeId: string,
): Promise<InfCanvasEdge> {
  return apiFetch<InfCanvasEdge>(`/api/canvas/projects/${encodeURIComponent(projectId)}/edges`, {
    method: 'POST',
    jsonBody: { source_node_id: sourceNodeId, target_node_id: targetNodeId },
  });
}

export function infDeleteEdge(edgeId: string): Promise<void> {
  return apiFetch<void>(`/api/canvas/edges/${encodeURIComponent(edgeId)}`, {
    method: 'DELETE',
  });
}

/* ---- Messages ---- */

export function infGetMessages(nodeId: string): Promise<InfCanvasMessage[]> {
  return apiFetch<InfCanvasMessage[]>(`/api/canvas/nodes/${encodeURIComponent(nodeId)}/messages`);
}

/**
 * Opens an SSE stream for a chat message. Returns the raw Response so the
 * caller (useStreamingChat) can consume the event stream.
 *
 * Does NOT use apiFetch — SSE must stay as a raw Response to be read line-by-line.
 */
export async function infStreamMessage(
  nodeId: string,
  content: string,
  sessionId: string,
  signal?: AbortSignal,
): Promise<Response> {
  const res = await fetch(`${API_BASE}/api/canvas/nodes/${encodeURIComponent(nodeId)}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, session_id: sessionId }),
    signal,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Stream request failed ${res.status}: ${text}`);
  }
  return res;
}

/* ---- Branches ---- */

export interface CreateBranchResult {
  child_node: InfCanvasNode;
  edge: InfCanvasEdge;
  branch_record: InfCanvasBranch;
}

export function infCreateBranch(
  nodeId: string,
  sourceMessageIds: string[],
  title: string,
): Promise<CreateBranchResult> {
  return apiFetch<CreateBranchResult>(`/api/canvas/nodes/${encodeURIComponent(nodeId)}/branch`, {
    method: 'POST',
    jsonBody: { source_message_ids: sourceMessageIds, title },
  });
}

/* ---- Sessions ---- */

export function infJoinSession(
  projectId: string,
  displayName: string,
): Promise<InfCanvasSession> {
  return apiFetch<InfCanvasSession>(
    `/api/canvas/projects/${encodeURIComponent(projectId)}/sessions`,
    {
      method: 'POST',
      jsonBody: { display_name: displayName },
    },
  );
}

/* ---- Files ---- */

export interface InfCanvasFile {
  node_id: string;
  file_id: string;
  type: 'image' | 'document';
}

export function infUploadFile(projectId: string, file: File): Promise<InfCanvasFile> {
  const form = new FormData();
  form.append('file', file);
  return apiFetch<InfCanvasFile>(
    `/api/canvas/projects/${encodeURIComponent(projectId)}/files`,
    { method: 'POST', body: form },
  );
}
