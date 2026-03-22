/**
 * API client — real FastAPI integration for ConceptPilot.
 */

import type {
  Course,
  Exam,
  ReadinessParams,
  AISuggestion,
  AIMetadata,
  ConceptReadiness,
  StudentReadiness,
  Alert,
  Intervention,
  Cluster,
  WaterfallItem,
  StudyPlanStep,
  StudyContent,
  SlideData,
  ChatMessage,
  UploadResult,
  ComputeResult,
  ReportConfig,
  ConceptGraphNode,
  ConceptGraphEdge,
  ApiError,
} from './types';
import type { StudentReportResponse } from './api-types';
import {
  getCachedStudentReport,
  setStudentSession,
  getStoredStudentToken,
} from './student-report';
import {
  API_BASE,
  COMPUTE_POLL_INTERVAL_MS,
  COMPUTE_POLL_MAX_ATTEMPTS,
} from './config';
import { getReportConfigs as getReportConfigsList } from './report-config';

export { API_BASE } from './config';

export interface ApiFetchOptions extends Omit<RequestInit, 'body'> {
  /** When set, serializes to JSON and sends as body (unless `body` is also set). */
  jsonBody?: unknown;
  body?: RequestInit['body'];
  /** Abort the request after this many milliseconds (browser has no default fetch timeout). */
  timeoutMs?: number;
}

function parseErrorMessage(body: unknown, fallback: string): string {
  if (!body || typeof body !== 'object') return fallback;
  const o = body as Record<string, unknown>;
  if (typeof o.detail === 'string') return o.detail;
  if (Array.isArray(o.detail)) {
    return o.detail
      .map((d) => (typeof d === 'object' && d && 'msg' in d ? String((d as { msg: unknown }).msg) : JSON.stringify(d)))
      .join('; ');
  }
  if (typeof o.message === 'string') return o.message;
  return fallback;
}

/**
 * Unified fetch for JSON APIs.
 */
export async function apiFetch<T = unknown>(path: string, init: ApiFetchOptions = {}): Promise<T> {
  const { jsonBody, timeoutMs, headers: initHeaders, body: initBody, signal: userSignal, ...rest } = init;
  const headers = new Headers(initHeaders as HeadersInit);

  let body: BodyInit | null | undefined = initBody ?? null;
  if (jsonBody !== undefined && initBody === undefined) {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(jsonBody);
  }

  if (typeof FormData !== 'undefined' && initBody instanceof FormData) {
    headers.delete('Content-Type');
  }

  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;

  let abortTimer: ReturnType<typeof setTimeout> | undefined;
  let signal = userSignal;
  if (timeoutMs != null && timeoutMs > 0) {
    const ctrl = new AbortController();
    abortTimer = setTimeout(() => ctrl.abort(), timeoutMs);
    signal = ctrl.signal;
  }

  let res: Response;
  try {
    res = await fetch(url, { ...rest, headers, body: body ?? undefined, signal });
  } catch (e) {
    const name = e instanceof Error ? e.name : '';
    if (name === 'AbortError' || (e instanceof DOMException && e.name === 'AbortError')) {
      throw {
        status: 0,
        message:
          'Request timed out. Ensure the backend is running, reachable at the configured API URL, and Anthropic calls can complete.',
      } as ApiError;
    }
    throw { status: 0, message: 'Network error — backend unreachable' } as ApiError;
  } finally {
    if (abortTimer !== undefined) clearTimeout(abortTimer);
  }

  if (!res.ok) {
    let parsed: unknown = {};
    const text = await res.text();
    try {
      parsed = text ? JSON.parse(text) : {};
    } catch {
      parsed = { detail: text || res.statusText };
    }
    throw {
      status: res.status,
      message: parseErrorMessage(parsed, res.statusText),
      details: (parsed as { details?: Record<string, string[]> }).details,
    } as ApiError;
  }

  if (res.status === 204) return undefined as T;
  const ct = res.headers.get('content-type') ?? '';
  if (!ct.includes('application/json')) {
    return (await res.text()) as T;
  }
  return res.json() as Promise<T>;
}

async function request<T>(path: string, options?: ApiFetchOptions): Promise<T> {
  return apiFetch<T>(path, options);
}

// ── Student Reports ──

export async function fetchStudentReport(token: string): Promise<StudentReportResponse> {
  const data = await apiFetch<StudentReportResponse>(`/api/v1/reports/${encodeURIComponent(token)}`);
  setStudentSession(token, data);
  return data;
}

export function getStudentReportFromCache(): StudentReportResponse | null {
  return getCachedStudentReport();
}

/** Map cached report to UI concept rows (student portal). */
export function studentReportToConcepts(r: StudentReportResponse): ConceptReadiness[] {
  return (r.readiness ?? []).map((x) => ({
    concept: x.concept_label,
    readiness: x.final_readiness,
    confidence: (['high', 'medium', 'low'].includes(x.confidence)
      ? x.confidence
      : 'medium') as ConceptReadiness['confidence'],
    questionCount: 0,
    directReadiness: x.direct_readiness ?? x.final_readiness,
    prerequisitePenalty: 0,
    downstreamBoost: 0,
  }));
}

/** Map cached report graph_json to UI graph (student portal). */
export function studentReportToGraph(r: StudentReportResponse): {
  nodes: ConceptGraphNode[];
  edges: ConceptGraphEdge[];
} {
  const g = r.concept_graph as {
    nodes?: Array<{ id: string; label?: string }>;
    edges?: Array<{ source: string; target: string }>;
  };
  const nodes: ConceptGraphNode[] = (g?.nodes ?? []).map((n) => ({
    id: n.id,
    label: n.label ?? n.id,
    readiness: r.readiness?.find((x) => x.concept_id === n.id)?.final_readiness,
  }));
  const edges: ConceptGraphEdge[] = (g?.edges ?? []).map((e, i) => ({
    id: `e-${e.source}-${e.target}-${i}`,
    source: e.source,
    target: e.target,
  }));
  return { nodes, edges };
}

// ── Courses & Exams ──

function mapCourse(c: { id: string; name: string; created_at: string }): Course {
  return {
    id: c.id,
    name: c.name,
    code: '',
    term: new Date(c.created_at).getFullYear().toString(),
  };
}

function mapExam(e: { id: string; course_id: string; name: string; created_at: string }): Exam {
  return {
    id: e.id,
    courseId: e.course_id,
    name: e.name,
    createdAt: e.created_at,
  };
}

export async function getCourses(): Promise<Course[]> {
  const rows = await request<Array<{ id: string; name: string; created_at: string }>>('/api/v1/courses');
  return rows.map(mapCourse);
}

export async function createCourse(name: string): Promise<Course> {
  const c = await request<{ id: string; name: string; created_at: string }>('/api/v1/courses', {
    method: 'POST',
    jsonBody: { name },
  });
  return mapCourse(c);
}

export async function getExams(courseId: string): Promise<Exam[]> {
  const rows = await request<Array<{ id: string; course_id: string; name: string; created_at: string }>>(
    `/api/v1/courses/${courseId}/exams`,
  );
  return rows.map(mapExam);
}

export async function createExam(courseId: string, name: string): Promise<Exam> {
  const e = await request<{ id: string; course_id: string; name: string; created_at: string }>(
    `/api/v1/courses/${courseId}/exams`,
    { method: 'POST', jsonBody: { name } },
  );
  return mapExam(e);
}

// ── Upload ──

function validationErrorsToStrings(errors: Array<{ message?: string; row?: number }>): string[] {
  return errors.map((e) => (e.row != null ? `Row ${e.row}: ${e.message ?? ''}` : e.message ?? 'Validation error'));
}

export async function uploadScores(examId: string, file: File): Promise<UploadResult> {
  const form = new FormData();
  form.append('file', file);
  const res = await apiFetch<{
    status: string;
    row_count: number;
    errors: Array<{ message?: string; row?: number }>;
    student_detection?: { warnings?: string[] };
  }>(`/api/v1/exams/${examId}/scores`, { method: 'POST', body: form });

  const errs = validationErrorsToStrings(res.errors ?? []);
  return {
    filename: file.name,
    rowCount: res.row_count,
    columnCount: 0,
    warnings: res.student_detection?.warnings ?? [],
    errors: errs,
    preview: [],
  };
}

export async function uploadMapping(examId: string, file: File): Promise<UploadResult> {
  const form = new FormData();
  form.append('file', file);
  const res = await apiFetch<{
    status: string;
    concept_count: number;
    errors: Array<{ message?: string; row?: number }>;
  }>(`/api/v1/exams/${examId}/mapping`, { method: 'POST', body: form });

  const errs = validationErrorsToStrings(res.errors ?? []);
  return {
    filename: file.name,
    rowCount: res.concept_count,
    columnCount: 3,
    warnings: [],
    errors: errs,
    preview: [],
  };
}

export async function uploadGraphJson(
  examId: string,
  body: { nodes: Array<{ id: string; label: string }>; edges: Array<{ source: string; target: string; weight?: number }> },
): Promise<{ nodeCount: number; edgeCount: number }> {
  const res = await request<{
    status: string;
    node_count: number;
    edge_count: number;
    errors?: Array<{ message: string }>;
  }>(`/api/v1/exams/${examId}/graph`, { method: 'POST', jsonBody: body });
  if (res.status !== 'success') {
    const msg = res.errors?.map((e) => e.message).join('; ') ?? 'Graph validation failed';
    throw { status: 400, message: msg } as ApiError;
  }
  return { nodeCount: res.node_count, edgeCount: res.edge_count };
}

/** Accept JSON graph file or CSV with Source,Target columns (best-effort). */
export async function uploadGraph(examId: string, file: File): Promise<{ nodeCount: number; edgeCount: number }> {
  const text = await file.text();
  if (file.name.endsWith('.json')) {
    const parsed = JSON.parse(text) as {
      nodes?: Array<{ id: string; label: string }>;
      edges?: Array<{ source: string; target: string; weight?: number }>;
    };
    if (!parsed.nodes || !parsed.edges) {
      throw { status: 400, message: 'JSON must include nodes and edges arrays' } as ApiError;
    }
    return uploadGraphJson(examId, {
      nodes: parsed.nodes,
      edges: parsed.edges.map((e) => ({ ...e, weight: e.weight ?? 0.5 })),
    });
  }
  throw {
    status: 400,
    message: 'Please upload a graph as JSON (nodes/edges). CSV graph upload is not supported by the API.',
  } as ApiError;
}

export async function generateGraphWithAI(_examId: string, _concepts: string[]): Promise<{ nodeCount: number; edgeCount: number }> {
  throw {
    status: 501,
    message: 'Use the Graph editor’s “Expand with AI” or upload a JSON graph. Bulk AI graph generation is not available.',
  } as ApiError;
}

// ── Compute ──

export async function runCompute(examId: string, params: ReadinessParams): Promise<ComputeResult> {
  const res = await request<{
    status: string;
    run_id?: string;
    students_processed?: number;
    concepts_processed?: number;
    time_ms?: number;
  }>(`/api/v1/exams/${examId}/compute`, {
    method: 'POST',
    jsonBody: {
      alpha: params.alpha,
      beta: params.beta,
      gamma: params.gamma,
      threshold: params.threshold,
      k: params.k,
    },
  });

  if (res.status === 'queued' && res.run_id) {
    const final = await pollComputeRun(examId, res.run_id);
    return final;
  }

  const now = new Date().toISOString();
  return {
    status: res.status === 'success' ? 'completed' : 'failed',
    startedAt: now,
    completedAt: now,
    studentCount: res.students_processed ?? 0,
    conceptCount: res.concepts_processed ?? 0,
    clusterCount: params.k,
  };
}

async function pollComputeRun(
  examId: string,
  runId: string,
  maxAttempts = COMPUTE_POLL_MAX_ATTEMPTS,
): Promise<ComputeResult> {
  for (let i = 0; i < maxAttempts; i++) {
    const run = await request<{
      status: string;
      students_processed?: number;
      concepts_processed?: number;
      completed_at?: string | null;
      created_at?: string;
    }>(`/api/v1/exams/${examId}/compute/runs/${runId}`);
    if (run.status === 'success') {
      return {
        status: 'completed',
        startedAt: run.created_at ?? new Date().toISOString(),
        completedAt: run.completed_at ?? new Date().toISOString(),
        studentCount: run.students_processed ?? 0,
        conceptCount: run.concepts_processed ?? 0,
        clusterCount: 0,
      };
    }
    if (run.status === 'failed') {
      return {
        status: 'failed',
        startedAt: run.created_at ?? new Date().toISOString(),
        studentCount: 0,
        conceptCount: 0,
        clusterCount: 0,
      };
    }
    await new Promise((r) => setTimeout(r, COMPUTE_POLL_INTERVAL_MS));
  }
  throw { status: 504, message: 'Compute run timed out while polling' } as ApiError;
}

// ── Dashboard ──

const BUCKET_ORDER = ['0-20', '20-40', '40-60', '60-80', '80-100'];

function heatmapCellsToRows(
  cells: Array<{ concept_id: string; concept_label: string; bucket: string; count: number }>,
): { name: string; conceptId: string; readiness: number[] }[] {
  const byConcept = new Map<string, { label: string; counts: number[] }>();
  for (const c of cells) {
    if (!byConcept.has(c.concept_id)) {
      byConcept.set(c.concept_id, { label: c.concept_label, counts: [0, 0, 0, 0, 0] });
    }
    const idx = BUCKET_ORDER.indexOf(c.bucket);
    if (idx >= 0) {
      byConcept.get(c.concept_id)!.counts[idx] += c.count;
    }
  }
  return Array.from(byConcept.entries()).map(([conceptId, v]) => ({
    name: v.label,
    conceptId,
    readiness: v.counts,
  }));
}

export async function getHeatmapData(examId: string) {
  const dash = await request<{
    heatmap: Array<{ concept_id: string; concept_label: string; bucket: string; count: number }>;
  }>(`/api/v1/exams/${examId}/dashboard`);
  return heatmapCellsToRows(dash.heatmap ?? []);
}

export async function getAlerts(examId: string): Promise<Alert[]> {
  const res = await request<{ alerts: Array<Record<string, unknown>> }>(`/api/v1/exams/${examId}/dashboard/alerts`);
  return (res.alerts ?? []).map((a, i) => ({
    id: String(a.concept_id ?? i),
    concept: String(a.concept_label ?? a.concept_id ?? ''),
    affected: Number(a.students_below_threshold ?? 0),
    downstream: Array.isArray(a.downstream_concepts) ? a.downstream_concepts.length : 0,
    severity: Number(a.impact ?? 0),
  }));
}

export async function getInterventions(examId: string): Promise<Intervention[]> {
  const res = await request<{
    interventions: Array<{
      concept_id: string;
      students_affected: number;
      downstream_concepts: number;
      current_readiness: number;
      impact: number;
      rationale: string;
    }>;
  }>(`/api/v1/exams/${examId}/interventions`);
  return (res.interventions ?? []).map((iv, idx) => ({
    id: iv.concept_id,
    rank: idx + 1,
    concept: iv.concept_id,
    description: iv.rationale,
    affected: iv.students_affected,
    downstreamBreadth: iv.downstream_concepts,
    weaknessSeverity: iv.impact,
  }));
}

/** Cluster colors — CSS variables from `styles/theme.css` (`--chart-*`). */
const CLUSTER_PALETTE = [
  'var(--chart-5)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-5)',
];

export async function getClusters(examId: string): Promise<Cluster[]> {
  const res = await request<{
    clusters: Array<{
      id: string;
      cluster_label: string;
      student_count: number;
      centroid: Record<string, number>;
      top_weak_concepts: string[];
    }>;
  }>(`/api/v1/exams/${examId}/clusters`);
  return (res.clusters ?? []).map((c, i) => ({
    id: String(c.id),
    label: c.cluster_label,
    count: c.student_count,
    color: CLUSTER_PALETTE[i % CLUSTER_PALETTE.length],
    concepts: (c.top_weak_concepts ?? []).map((name) => ({
      name,
      avgReadiness: c.centroid?.[name] ?? 0,
    })),
  }));
}

export async function getReadinessParams(examId: string): Promise<ReadinessParams> {
  const p = await request<{ alpha: number; beta: number; gamma: number; threshold: number; k: number }>(
    `/api/v1/exams/${examId}/parameters`,
  );
  return {
    alpha: p.alpha,
    beta: p.beta,
    gamma: p.gamma,
    threshold: p.threshold,
    k: p.k,
  };
}

export async function updateReadinessParams(examId: string, params: ReadinessParams): Promise<ReadinessParams> {
  const p = await request<{ alpha: number; beta: number; gamma: number; threshold: number; k: number }>(
    `/api/v1/exams/${examId}/parameters`,
    { method: 'PUT', jsonBody: params },
  );
  return {
    alpha: p.alpha,
    beta: p.beta,
    gamma: p.gamma,
    threshold: p.threshold,
    k: p.k,
  };
}

/** Class-level concept readiness (instructor); uses dashboard aggregates. */
export async function getClassReadiness(examId: string): Promise<ConceptReadiness[]> {
  const dash = await request<{
    aggregates: Array<{
      concept_id: string;
      concept_label: string;
      mean_readiness: number;
      median_readiness: number;
      std_readiness: number;
      below_threshold_count: number;
    }>;
  }>(`/api/v1/exams/${examId}/dashboard`);
  return (dash.aggregates ?? []).map((a) => ({
    concept: a.concept_label,
    readiness: a.mean_readiness,
    confidence: 'medium',
    questionCount: 0,
    directReadiness: a.mean_readiness,
    prerequisitePenalty: 0,
    downstreamBoost: 0,
  }));
}

// ── Trace ──

async function resolveConceptId(examId: string, nameOrId: string): Promise<string> {
  const decoded = decodeURIComponent(nameOrId);
  try {
    await request(`/api/v1/exams/${examId}/dashboard/trace/${encodeURIComponent(decoded)}`);
    return decoded;
  } catch {
    /* try label lookup */
  }
  const g = await request<{ status?: string; nodes?: Array<{ id: string; label: string }> }>(
    `/api/v1/exams/${examId}/graph`,
  );
  const nodes = g.nodes ?? [];
  const byId = nodes.find((n) => n.id === nameOrId || n.id === decoded);
  if (byId) return byId.id;
  const byLabel = nodes.find((n) => n.label === decoded);
  if (byLabel) return byLabel.id;
  return decoded;
}

export async function getTraceData(examId: string, conceptNameOrId: string) {
  const conceptId = await resolveConceptId(examId, conceptNameOrId);
  const t = await request<{
    concept_id: string;
    concept_label: string;
    waterfall: Array<{ label: string; value: number; cumulative: number }>;
    upstream: Array<{ concept_label: string; readiness: number }>;
    downstream: Array<{ concept_label: string; readiness: number }>;
    students_affected: number;
  }>(`/api/v1/exams/${examId}/dashboard/trace/${encodeURIComponent(conceptId)}`);

  const wfColors = ['var(--chart-5)', 'var(--destructive)', 'var(--chart-4)', 'var(--primary)'];
  const waterfall: WaterfallItem[] = (t.waterfall ?? []).map((w, i) => ({
    name: w.label,
    value: w.value,
    color: wfColors[i % wfColors.length],
  }));

  return {
    concept: t.concept_label,
    waterfall,
    prerequisites: (t.upstream ?? []).map((u) => ({
      name: u.concept_label,
      readiness: u.readiness,
      status: u.readiness >= 0.6 ? ('strong' as const) : ('weak' as const),
    })),
    dependents: (t.downstream ?? []).map((d) => ({
      name: d.concept_label,
      readiness: d.readiness,
    })),
    affectedStudents: [] as Array<{ id: string; name: string; readiness: number }>,
    totalAffected: t.students_affected,
  };
}

// ── AI Suggestions ──

function mapSuggestionType(t: string): AISuggestion['type'] {
  if (t.includes('edge') || t === 'prereq_edge') return 'Edge';
  if (t.includes('tag') || t.includes('concept')) return 'Concept Tag';
  if (t.includes('intervention')) return 'Intervention';
  if (t.includes('expand') || t.includes('graph')) return 'Graph Expansion';
  return 'Edge';
}

function payloadPreview(payload: Record<string, unknown>): string {
  try {
    return JSON.stringify(payload).slice(0, 120);
  } catch {
    return '';
  }
}

export async function getSuggestions(examId: string): Promise<AISuggestion[]> {
  const res = await request<{
    suggestions: Array<{
      id: string;
      suggestion_type: string;
      status: string;
      output_payload: Record<string, unknown>;
      model?: string | null;
      prompt_version?: string | null;
      reviewed_at?: string | null;
      reviewed_by?: string | null;
      created_at: string;
    }>;
  }>(`/api/v1/exams/${examId}/ai/suggestions`);
  return (res.suggestions ?? []).map((s) => {
    const meta: AIMetadata = {
      model: s.model ?? '',
      promptVersion: s.prompt_version ?? '',
      requestId: s.id,
      latencyMs: 0,
      tokenUsage: { input: 0, output: 0 },
      reviewedAt: s.reviewed_at ?? undefined,
      reviewedBy: s.reviewed_by ?? undefined,
    };
    return {
      id: s.id,
      type: mapSuggestionType(s.suggestion_type),
      created: s.created_at,
      status: s.status as AISuggestion['status'],
      preview: payloadPreview(s.output_payload ?? {}),
      details: JSON.stringify(s.output_payload ?? {}, null, 2),
      metadata: meta,
    };
  });
}

export async function reviewSuggestion(examId: string, id: string, action: 'accept' | 'reject'): Promise<AISuggestion> {
  await request(`/api/v1/exams/${examId}/ai/suggestions/${id}/review`, {
    method: 'POST',
    jsonBody: { action, note: '' },
  });
  const all = await getSuggestions(examId);
  const found = all.find((x) => x.id === id);
  if (!found) throw { status: 404, message: 'Suggestion not found after review' } as ApiError;
  return found;
}

// ── Reports & export ──

export async function getReportConfigs(examId: string): Promise<ReportConfig[]> {
  return getReportConfigsList(examId);
}

export async function createExportJob(examId: string): Promise<{ id: string; status: string }> {
  const job = await request<{ id: string; status: string; created_at: string }>(`/api/v1/exams/${examId}/export`, {
    method: 'POST',
    jsonBody: {},
  });
  return { id: String(job.id), status: job.status };
}

export async function getExportStatus(examId: string, exportId: string): Promise<{ status: string }> {
  const e = await request<{ id: string; status: string }>(`/api/v1/exams/${examId}/export/${exportId}`);
  return { status: e.status };
}

export function getExportDownloadUrl(examId: string, exportId: string): string {
  return `${API_BASE}/api/v1/exams/${examId}/export/${exportId}/download`;
}

/** @deprecated Use createExportJob + polling */
export async function generateReport(examId: string, _reportId: string): Promise<ReportConfig> {
  const j = await createExportJob(examId);
  return {
    id: j.id,
    title: 'Export',
    description: '',
    format: 'json',
    status: j.status === 'ready' ? 'ready' : 'generating',
  };
}

export async function listReportTokens(examId: string) {
  const res = await request<{ tokens: Array<{ student_id: string; token: string; created_at: string; expires_at: string }> }>(
    `/api/v1/exams/${examId}/reports/tokens`,
    { method: 'GET' },
  );
  return res.tokens ?? [];
}

// ── Graph Authoring ──

export async function getConceptGraph(examId: string): Promise<{ nodes: ConceptGraphNode[]; edges: ConceptGraphEdge[] }> {
  const g = await request<{
    status: string;
    nodes: Array<{ id: string; label: string; readiness?: number | null }>;
    edges: Array<{ source: string; target: string; weight: number }>;
  }>(`/api/v1/exams/${examId}/graph`);
  if (g.status === 'empty') {
    return { nodes: [], edges: [] };
  }
  const nodes: ConceptGraphNode[] = (g.nodes ?? []).map((n) => ({
    id: n.id,
    label: n.label,
    readiness: n.readiness ?? undefined,
  }));
  const edges: ConceptGraphEdge[] = (g.edges ?? []).map((e, i) => ({
    id: `e-${e.source}-${e.target}-${i}`,
    source: e.source,
    target: e.target,
  }));
  return { nodes, edges };
}

export async function patchGraph(
  examId: string,
  body: {
    add_nodes?: Array<{ id: string; label: string }>;
    remove_nodes?: string[];
    add_edges?: Array<{ source: string; target: string; weight: number }>;
    remove_edges?: Array<{ source: string; target: string; weight: number }>;
  },
): Promise<void> {
  await request(`/api/v1/exams/${examId}/graph`, { method: 'PATCH', jsonBody: body });
}

export async function addGraphNode(examId: string, label: string): Promise<ConceptGraphNode> {
  const id = `n_${Date.now().toString(36)}`;
  const g = await getConceptGraph(examId);
  if (g.nodes.length === 0) {
    await uploadGraphJson(examId, { nodes: [{ id, label }], edges: [] });
    return { id, label };
  }
  await patchGraph(examId, { add_nodes: [{ id, label }] });
  return { id, label };
}

export async function addGraphEdge(examId: string, source: string, target: string): Promise<ConceptGraphEdge> {
  await patchGraph(examId, {
    add_edges: [{ source, target, weight: 0.5 }],
  });
  return { id: `e-${source}-${target}`, source, target };
}

export async function removeGraphNode(examId: string, nodeId: string): Promise<void> {
  await patchGraph(examId, { remove_nodes: [nodeId] });
}

export async function removeGraphEdge(examId: string, _edgeId: string, source: string, target: string): Promise<void> {
  await patchGraph(examId, { remove_edges: [{ source, target, weight: 0.5 }] });
}

// ── Student Data ──

function reportToStudentReadiness(r: StudentReportResponse): StudentReadiness {
  const concepts: ConceptReadiness[] = (r.readiness ?? []).map((x) => ({
    concept: x.concept_label,
    readiness: x.final_readiness,
    confidence: (['high', 'medium', 'low'].includes(x.confidence)
      ? x.confidence
      : 'medium') as ConceptReadiness['confidence'],
    questionCount: 0,
    directReadiness: x.direct_readiness ?? x.final_readiness,
    prerequisitePenalty: 0,
    downstreamBoost: 0,
  }));
  const overall =
    concepts.length > 0 ? concepts.reduce((s, c) => s + c.readiness, 0) / concepts.length : 0;
  return {
    studentId: r.student_id,
    studentName: `Student ${r.student_id}`,
    overallReadiness: overall,
    concepts,
  };
}

export async function getStudentReadiness(_studentId: string, _examId: string): Promise<StudentReadiness> {
  const token = getStoredStudentToken();
  if (!token) throw { status: 401, message: 'Not signed in with a report link' } as ApiError;
  const raw = getCachedStudentReport();
  if (raw) return reportToStudentReadiness(raw);
  const r = await apiFetch<StudentReportResponse>(`/api/v1/reports/${encodeURIComponent(token)}`);
  return reportToStudentReadiness(r);
}

export async function getStudyPlan(_studentId: string, _examId: string): Promise<StudyPlanStep[]> {
  const raw = getCachedStudentReport();
  if (!raw) throw { status: 401, message: 'No cached report' } as ApiError;
  return (raw.study_plan ?? []).map((s, i) => ({
    step: i + 1,
    concept: s.concept_label,
    readiness: s.readiness,
    reason: s.reason,
    prerequisites: [],
    prereqReady: true,
    topics: s.explanation ? [s.explanation] : [],
  }));
}

// ── Study Content (instructor) ──

function mapContentType(ct: string): StudyContent['type'] {
  if (ct === 'presentation') return 'slides';
  if (ct === 'video_walkthrough') return 'video';
  return 'audio';
}

function mapStudyItem(x: {
  id: string;
  content_type: string;
  title: string;
  status: string;
  duration_seconds?: number | null;
  created_at: string;
  source_context?: Record<string, unknown>;
}): StudyContent {
  const dur =
    x.duration_seconds != null
      ? `${Math.floor(x.duration_seconds / 60)}:${String(x.duration_seconds % 60).padStart(2, '0')}`
      : undefined;
  return {
    id: x.id,
    type: mapContentType(x.content_type),
    title: x.title,
    description: JSON.stringify(x.source_context ?? {}),
    duration: dur,
    slideCount: undefined,
    createdAt: x.created_at,
    status: x.status === 'completed' ? 'ready' : x.status === 'failed' ? 'error' : 'generating',
  };
}

export async function getStudyContent(examId: string): Promise<StudyContent[]> {
  const res = await request<{ items: Array<Record<string, unknown>> }>(`/api/v1/exams/${examId}/study-content`);
  return (res.items ?? []).map((it) => mapStudyItem(it as Parameters<typeof mapStudyItem>[0]));
}

export async function generateStudyContent(
  examId: string,
  type: 'audio' | 'slides' | 'video',
): Promise<StudyContent> {
  const ct = type === 'slides' ? 'presentation' : type === 'video' ? 'video_walkthrough' : 'audio';
  const item = await request<Parameters<typeof mapStudyItem>[0]>(`/api/v1/exams/${examId}/study-content`, {
    method: 'POST',
    jsonBody: {
      content_type: ct,
      title: `Generated ${type}`,
      focus_concepts: [],
      include_weak_concepts: true,
    },
  });
  return mapStudyItem(item);
}

export async function getSlideContent(contentId: string): Promise<SlideData[]> {
  const item = await request<{ slides_data?: Record<string, unknown> | null }>(`/api/v1/study-content/${contentId}`);
  const slides = item.slides_data;
  if (slides && Array.isArray((slides as { slides?: unknown }).slides)) {
    return ((slides as { slides: SlideData[] }).slides ?? []).map((s) => ({
      title: s.title,
      content: s.content,
      notes: s.notes,
    }));
  }
  return [];
}

export function getStudyContentDownloadUrl(contentId: string): string {
  return `${API_BASE}/api/v1/study-content/${contentId}/download`;
}

/** Fetch binary blob from an API endpoint. */
export async function fetchAuthorizedBlob(path: string): Promise<Blob> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || res.statusText);
  }
  return res.blob();
}

// ── Chat Assistant ──

/** Browser fetch has no timeout; chat can take multiple Anthropic + tool rounds (align with backend). */
const CHAT_API_TIMEOUT_MS = 300_000;

const CHAT_SESSION_STORAGE_PREFIX = 'conceptpilot_chat_session_';

export type ChatSurface = 'instructor' | 'student';

/** sessionStorage key for persisting chat session id per exam and surface (student vs instructor). */
export function chatSessionStorageKey(examId: string | null | undefined, surface: ChatSurface): string {
  const raw = examId != null ? String(examId).trim() : '';
  const examPart = raw.length > 0 ? raw : 'none';
  return `${CHAT_SESSION_STORAGE_PREFIX}${surface}_${examPart}`;
}

export interface ChatSessionMessageApi {
  id: string;
  role: string;
  content: string | null;
  created_at: string;
}

/** Row from `GET /chat/sessions`. */
export interface ChatSessionApi {
  id: string;
  exam_id: string | null;
  surface: string;
  title: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

/** List chat sessions (instructor: optional exam filter; student: requires report_token). */
export async function fetchChatSessions(options: {
  surface: ChatSurface;
  examId?: string | null;
  reportToken?: string | null;
}): Promise<ChatSessionApi[]> {
  const params = new URLSearchParams();
  params.set('surface', options.surface);
  const exam = options.examId != null ? String(options.examId).trim() : '';
  if (exam.length > 0) {
    params.set('exam_id', exam);
  }
  if (options.surface === 'student') {
    const token = options.reportToken != null ? String(options.reportToken).trim() : '';
    if (token.length > 0) {
      params.set('report_token', token);
    }
  }
  return request<ChatSessionApi[]>(`/chat/sessions?${params.toString()}`);
}

/** Load persisted messages for a chat session (user + assistant rows only from API). */
export async function fetchChatSessionMessages(sessionId: string): Promise<ChatSessionMessageApi[]> {
  return request<ChatSessionMessageApi[]>(`/chat/sessions/${encodeURIComponent(sessionId)}/messages`);
}

/**
 * Sends the latest user message. Reuses `sessionId` when set so the backend keeps
 * conversation history; otherwise starts via `/chat/quick`.
 */
export async function sendChatMessage(
  lastUserText: string,
  options?: {
    sessionId?: string | null;
    examId?: string | null;
    surface?: ChatSurface;
    reportToken?: string | null;
  },
): Promise<{ message: ChatMessage; sessionId: string }> {
  const trimmed = lastUserText.trim();
  if (!trimmed) {
    throw { status: 400, message: 'No user message' } as ApiError;
  }
  const rawExam = options?.examId != null ? String(options.examId).trim() : '';
  const examPayload = rawExam.length > 0 ? rawExam : null;
  const sid = options?.sessionId != null ? String(options.sessionId).trim() : '';
  const surface: ChatSurface = options?.surface ?? 'instructor';
  const tokenRaw = options?.reportToken != null ? String(options.reportToken).trim() : '';
  const reportPayload = tokenRaw.length > 0 ? tokenRaw : null;

  const quickJsonBody: Record<string, unknown> = {
    message: trimmed,
    exam_id: examPayload,
    surface,
  };
  if (surface === 'student' && reportPayload) {
    quickJsonBody.report_token = reportPayload;
  }

  const res = sid
    ? await request<{ assistant_message: string; session_id: string }>(`/chat/sessions/${sid}/messages`, {
        method: 'POST',
        jsonBody: {
          message: trimmed,
          exam_id: examPayload,
          surface,
        },
        timeoutMs: CHAT_API_TIMEOUT_MS,
      })
    : await request<{ assistant_message: string; session_id: string }>('/chat/quick', {
        method: 'POST',
        jsonBody: quickJsonBody,
        timeoutMs: CHAT_API_TIMEOUT_MS,
      });

  return {
    sessionId: String(res.session_id),
    message: {
      id: `msg_${Date.now()}`,
      role: 'assistant',
      content: res.assistant_message,
      timestamp: new Date().toISOString(),
    },
  };
}

// ── Students list ──

export async function getStudentsList(examId: string) {
  const res = await request<{ students: Array<{ student_id: string }> }>(`/api/v1/exams/${examId}/students`);
  return (res.students ?? []).map((s) => ({
    id: s.student_id,
    name: `Student ${s.student_id}`,
    readiness: 0,
  }));
}
