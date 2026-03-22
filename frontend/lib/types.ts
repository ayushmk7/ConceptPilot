// ── Domain Types ──

export interface Course {
  id: string;
  name: string;
  code: string;
  term: string;
}

export interface Exam {
  id: string;
  courseId: string;
  name: string;
  createdAt: string;
}

export interface ConceptReadiness {
  concept: string;
  readiness: number;
  confidence: 'high' | 'medium' | 'low';
  questionCount: number;
  directReadiness: number;
  prerequisitePenalty: number;
  downstreamBoost: number;
}

export interface StudentReadiness {
  studentId: string;
  studentName: string;
  concepts: ConceptReadiness[];
  overallReadiness: number;
}

export interface ConceptGraphNode {
  id: string;
  label: string;
  readiness?: number;
}

export interface ConceptGraphEdge {
  id: string;
  source: string;
  target: string;
}

export interface Alert {
  id: string;
  concept: string;
  affected: number;
  downstream: number;
  severity: number;
}

export interface Intervention {
  id: string;
  rank: number;
  concept: string;
  description: string;
  affected: number;
  downstreamBreadth: number;
  weaknessSeverity: number;
}

export interface Cluster {
  id: string;
  label: string;
  count: number;
  color: string;
  concepts: { name: string; avgReadiness: number }[];
}

export interface ReadinessParams {
  alpha: number;
  beta: number;
  gamma: number;
  threshold: number;
  k: number;
}

export interface AISuggestion {
  id: string;
  type: 'Edge' | 'Concept Tag' | 'Intervention' | 'Graph Expansion';
  created: string;
  status: 'pending' | 'accepted' | 'rejected';
  preview: string;
  details: string;
  metadata: AIMetadata;
}

export interface AIMetadata {
  model: string;
  promptVersion: string;
  requestId: string;
  latencyMs: number;
  tokenUsage: { input: number; output: number };
  reviewedAt?: string;
  reviewedBy?: string;
}

export interface WaterfallItem {
  name: string;
  value: number;
  color: string;
}

export interface StudyPlanStep {
  step: number;
  concept: string;
  readiness: number;
  reason: string;
  prerequisites: string[];
  prereqReady: boolean;
  topics: string[];
}

export interface StudyContent {
  id: string;
  type: 'audio' | 'slides' | 'video';
  title: string;
  description: string;
  duration?: string;
  slideCount?: number;
  url?: string;
  createdAt: string;
  status: 'ready' | 'generating' | 'error';
}

export interface SlideData {
  title: string;
  content: string[];
  notes?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  toolUse?: { name: string; result: string };
}

export interface MultiplayerUser {
  id: string;
  name: string;
  initials: string;
  color: string;
  cursor?: { x: number; y: number };
}

export interface MultiplayerEvent {
  type: 'user_joined' | 'user_left' | 'cursor_move' | 'node_update' | 'lock_acquired' | 'lock_released' | 'message_complete';
  userId: string;
  payload: Record<string, unknown>;
  timestamp: string;
}

// ── API Types ──

export interface ApiResponse<T> {
  data: T;
  status: number;
  message?: string;
}

export interface ApiError {
  status: number;
  message: string;
  details?: Record<string, string[]>;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface UploadResult {
  filename: string;
  rowCount: number;
  columnCount: number;
  warnings: string[];
  errors: string[];
  preview: Record<string, string | number>[];
}

export interface ComputeResult {
  status: 'completed' | 'running' | 'failed';
  startedAt: string;
  completedAt?: string;
  studentCount: number;
  conceptCount: number;
  clusterCount: number;
}

// ── Report types ──

export interface ReportConfig {
  id: string;
  title: string;
  description: string;
  format: 'pdf' | 'csv' | 'json';
  status: 'ready' | 'generating' | 'error' | 'idle';
  downloadUrl?: string;
  generatedAt?: string;
}
