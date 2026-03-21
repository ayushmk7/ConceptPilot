/**
 * API Client — adapter layer for backend integration.
 *
 * All functions return mock data now but are structured so that replacing
 * the implementation with real fetch() calls requires no UI changes.
 */

import type {
  Course, Exam, ReadinessParams, AISuggestion, AIMetadata,
  ConceptReadiness, StudentReadiness, Alert, Intervention, Cluster,
  WaterfallItem, StudyPlanStep, StudyContent, SlideData, ChatMessage,
  UploadResult, ComputeResult, ReportConfig, ConceptGraphNode, ConceptGraphEdge,
  ApiError,
} from './types';

// ── Configuration ──

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('prereq_token') : null;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options?.headers as Record<string, string> ?? {}),
  };

  try {
    const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const err: ApiError = { status: res.status, message: body.message ?? res.statusText, details: body.details };
      throw err;
    }
    return res.json();
  } catch (err) {
    if ((err as ApiError).status) throw err;
    // Network error — fall through to mock
    throw { status: 0, message: 'Network error — backend unreachable' } as ApiError;
  }
}

// ── Delay helper for mock realism ──
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ══════════════════════════════════════════════
//  MOCK DATA
// ══════════════════════════════════════════════

const MOCK_COURSES: Course[] = [
  { id: 'c1', name: 'EECS 280', code: 'EECS280', term: 'Winter 2026' },
  { id: 'c2', name: 'EECS 281', code: 'EECS281', term: 'Winter 2026' },
];

const MOCK_EXAMS: Exam[] = [
  { id: 'e1', courseId: 'c1', name: 'Midterm 1', createdAt: '2026-02-15' },
  { id: 'e2', courseId: 'c1', name: 'Midterm 2', createdAt: '2026-03-10' },
  { id: 'e3', courseId: 'c1', name: 'Final', createdAt: '2026-04-20' },
];

const MOCK_CONCEPTS: ConceptReadiness[] = [
  { concept: 'C++ Basics', readiness: 0.82, confidence: 'high', questionCount: 8, directReadiness: 0.85, prerequisitePenalty: 0, downstreamBoost: 0.03 },
  { concept: 'Pointers', readiness: 0.45, confidence: 'high', questionCount: 6, directReadiness: 0.65, prerequisitePenalty: -0.15, downstreamBoost: 0.08 },
  { concept: 'Arrays', readiness: 0.78, confidence: 'high', questionCount: 5, directReadiness: 0.80, prerequisitePenalty: -0.02, downstreamBoost: 0.0 },
  { concept: 'Structs', readiness: 0.71, confidence: 'medium', questionCount: 3, directReadiness: 0.75, prerequisitePenalty: -0.05, downstreamBoost: 0.01 },
  { concept: 'Classes', readiness: 0.52, confidence: 'high', questionCount: 5, directReadiness: 0.62, prerequisitePenalty: -0.12, downstreamBoost: 0.02 },
  { concept: 'Dynamic Memory', readiness: 0.42, confidence: 'high', questionCount: 4, directReadiness: 0.55, prerequisitePenalty: -0.18, downstreamBoost: 0.05 },
  { concept: 'Inheritance', readiness: 0.38, confidence: 'medium', questionCount: 4, directReadiness: 0.48, prerequisitePenalty: -0.14, downstreamBoost: 0.04 },
  { concept: 'Polymorphism', readiness: 0.35, confidence: 'low', questionCount: 2, directReadiness: 0.42, prerequisitePenalty: -0.10, downstreamBoost: 0.03 },
];

const MOCK_GRAPH_NODES: ConceptGraphNode[] = [
  { id: 'n1', label: 'C++ Basics', readiness: 0.82 },
  { id: 'n2', label: 'Arrays', readiness: 0.78 },
  { id: 'n3', label: 'Pointers', readiness: 0.45 },
  { id: 'n4', label: 'Structs', readiness: 0.71 },
  { id: 'n5', label: 'Classes', readiness: 0.52 },
  { id: 'n6', label: 'Dynamic Memory', readiness: 0.42 },
  { id: 'n7', label: 'Inheritance', readiness: 0.38 },
  { id: 'n8', label: 'Polymorphism', readiness: 0.35 },
];

const MOCK_GRAPH_EDGES: ConceptGraphEdge[] = [
  { id: 'ge1', source: 'n1', target: 'n2' },
  { id: 'ge2', source: 'n1', target: 'n3' },
  { id: 'ge3', source: 'n1', target: 'n4' },
  { id: 'ge4', source: 'n2', target: 'n5' },
  { id: 'ge5', source: 'n3', target: 'n5' },
  { id: 'ge6', source: 'n3', target: 'n6' },
  { id: 'ge7', source: 'n5', target: 'n7' },
  { id: 'ge8', source: 'n7', target: 'n8' },
];

// ══════════════════════════════════════════════
//  PUBLIC API FUNCTIONS
// ══════════════════════════════════════════════

// ── Auth ──

export async function login(email: string, password: string) {
  await delay(600);
  // Mock: accept any credentials
  const role = email.includes('student') ? 'student' : 'instructor';
  const user = {
    id: role === 'instructor' ? 'u1' : 'u2',
    name: role === 'instructor' ? 'Prof. Smith' : 'Alex Johnson',
    email,
    role: role as 'instructor' | 'student',
  };
  const token = `mock_${role}_token_${Date.now()}`;
  return { user, token };
}

export async function validateToken(token: string) {
  await delay(300);
  if (token.startsWith('mock_')) {
    const role = token.includes('instructor') ? 'instructor' : 'student';
    return {
      id: role === 'instructor' ? 'u1' : 'u2',
      name: role === 'instructor' ? 'Prof. Smith' : 'Alex Johnson',
      email: role === 'instructor' ? 'smith@umich.edu' : 'ajohnson@umich.edu',
      role: role as 'instructor' | 'student',
    };
  }
  return null;
}

export async function validateStudentToken(token: string) {
  await delay(400);
  return {
    id: 'u2',
    name: 'Alex Johnson',
    email: 'ajohnson@umich.edu',
    role: 'student' as const,
    courseId: 'c1',
    examId: 'e1',
  };
}

// ── Courses & Exams ──

export async function getCourses(): Promise<Course[]> {
  await delay(300);
  return MOCK_COURSES;
}

export async function getExams(courseId: string): Promise<Exam[]> {
  await delay(200);
  return MOCK_EXAMS.filter((e) => e.courseId === courseId);
}

// ── Upload ──

export async function uploadScores(_file: File): Promise<UploadResult> {
  await delay(1200);
  return {
    filename: _file.name,
    rowCount: 247,
    columnCount: 26,
    warnings: [],
    errors: [],
    preview: [
      { student_id: 'S001', Q1: 8, Q2: 7, Q3: 10 },
      { student_id: 'S002', Q1: 6, Q2: 9, Q3: 8 },
    ],
  };
}

export async function uploadMapping(_file: File): Promise<UploadResult> {
  await delay(1000);
  return {
    filename: _file.name,
    rowCount: 25,
    columnCount: 3,
    warnings: ['2 questions are unmapped and will be excluded from analysis.'],
    errors: [],
    preview: [
      { question_id: 'Q1', concept: 'Pointers', weight: 1.0 },
      { question_id: 'Q2', concept: 'Arrays', weight: 1.0 },
    ],
  };
}

export async function uploadGraph(_file: File): Promise<{ nodeCount: number; edgeCount: number }> {
  await delay(800);
  return { nodeCount: 12, edgeCount: 18 };
}

export async function generateGraphWithAI(concepts: string[]): Promise<{ nodeCount: number; edgeCount: number }> {
  await delay(2000);
  return { nodeCount: concepts.length || 12, edgeCount: 18 };
}

// ── Compute ──

export async function runCompute(_examId: string, _params: ReadinessParams): Promise<ComputeResult> {
  await delay(2500);
  return {
    status: 'completed',
    startedAt: new Date(Date.now() - 2500).toISOString(),
    completedAt: new Date().toISOString(),
    studentCount: 247,
    conceptCount: 12,
    clusterCount: _params.k,
  };
}

// ── Dashboard Data ──

export async function getClassReadiness(_examId: string): Promise<ConceptReadiness[]> {
  await delay(400);
  return MOCK_CONCEPTS;
}

export async function getAlerts(_examId: string): Promise<Alert[]> {
  await delay(300);
  return [
    { id: 'a1', concept: 'Pointers', affected: 147, downstream: 8, severity: 0.85 },
    { id: 'a2', concept: 'Dynamic Memory', affected: 123, downstream: 6, severity: 0.72 },
    { id: 'a3', concept: 'Classes', affected: 98, downstream: 5, severity: 0.65 },
  ];
}

export async function getInterventions(_examId: string): Promise<Intervention[]> {
  await delay(300);
  return [
    { id: 'i1', rank: 1, concept: 'Pointers', description: 'Review pointer fundamentals and dereferencing', affected: 147, downstreamBreadth: 8, weaknessSeverity: 0.85 },
    { id: 'i2', rank: 2, concept: 'Dynamic Memory', description: 'Focus on malloc/free patterns and memory safety', affected: 123, downstreamBreadth: 6, weaknessSeverity: 0.72 },
    { id: 'i3', rank: 3, concept: 'Classes', description: 'Reinforce constructor/destructor concepts', affected: 98, downstreamBreadth: 5, weaknessSeverity: 0.65 },
  ];
}

export async function getClusters(_examId: string): Promise<Cluster[]> {
  await delay(300);
  return [
    { id: 'cl1', label: 'Cluster 1', count: 89, color: '#3B82F6', concepts: [
      { name: 'Pointers', avgReadiness: 0.75 }, { name: 'Arrays', avgReadiness: 0.60 },
      { name: 'Classes', avgReadiness: 0.45 }, { name: 'Basics', avgReadiness: 0.85 },
      { name: 'Structs', avgReadiness: 0.50 },
    ]},
    { id: 'cl2', label: 'Cluster 2', count: 82, color: '#F59E0B', concepts: [
      { name: 'Inheritance', avgReadiness: 0.65 }, { name: 'Polymorphism', avgReadiness: 0.55 },
      { name: 'Classes', avgReadiness: 0.42 }, { name: 'Dynamic Memory', avgReadiness: 0.38 },
      { name: 'Pointers', avgReadiness: 0.48 },
    ]},
    { id: 'cl3', label: 'Cluster 3', count: 76, color: '#16A34A', concepts: [
      { name: 'Arrays', avgReadiness: 0.88 }, { name: 'Basics', avgReadiness: 0.92 },
      { name: 'Structs', avgReadiness: 0.78 }, { name: 'Pointers', avgReadiness: 0.72 },
      { name: 'Classes', avgReadiness: 0.65 },
    ]},
  ];
}

export async function getReadinessParams(_examId: string): Promise<ReadinessParams> {
  await delay(200);
  return { alpha: 0.5, beta: 0.3, gamma: 0.2, threshold: 0.6, k: 3 };
}

export async function updateReadinessParams(_examId: string, params: ReadinessParams): Promise<ReadinessParams> {
  await delay(500);
  return params;
}

// ── Root-Cause Trace ──

export async function getTraceData(_examId: string, concept: string) {
  await delay(500);
  return {
    concept,
    waterfall: [
      { name: 'Direct Readiness', value: 0.65, color: '#3B82F6' },
      { name: 'Prerequisite Penalty', value: -0.15, color: '#DC2626' },
      { name: 'Downstream Boost', value: 0.08, color: '#16A34A' },
      { name: 'Final Readiness', value: 0.58, color: '#00274C' },
    ] as WaterfallItem[],
    prerequisites: [
      { name: 'C++ Basics', readiness: 0.82, status: 'strong' as const },
      { name: 'Arrays', readiness: 0.75, status: 'strong' as const },
      { name: 'Memory Management', readiness: 0.42, status: 'weak' as const },
    ],
    dependents: [
      { name: 'Classes', readiness: 0.58 },
      { name: 'Inheritance', readiness: 0.45 },
      { name: 'Polymorphism', readiness: 0.38 },
    ],
    affectedStudents: Array.from({ length: 20 }, (_, i) => ({
      id: String(i + 1).padStart(3, '0'),
      name: `Student ${String(i + 1).padStart(3, '0')}`,
      readiness: Math.round((0.25 + Math.random() * 0.35) * 100) / 100,
    })),
    totalAffected: 147,
  };
}

// ── AI Suggestions ──

const makeMeta = (id: number): AIMetadata => ({
  model: 'claude-sonnet-4-6',
  promptVersion: 'v2.1.0',
  requestId: `req_${id}_${Date.now().toString(36)}`,
  latencyMs: 800 + Math.floor(Math.random() * 1200),
  tokenUsage: { input: 1200 + id * 100, output: 400 + id * 50 },
});

export async function getSuggestions(_examId: string): Promise<AISuggestion[]> {
  await delay(400);
  return [
    { id: 1, type: 'Edge', created: '2026-03-15', status: 'pending', preview: 'Memory Management → Pointers', details: 'AI suggests adding prerequisite edge from Memory Management to Pointers based on concept dependencies.', metadata: makeMeta(1) },
    { id: 2, type: 'Concept Tag', created: '2026-03-15', status: 'pending', preview: 'Q12: Add "Dynamic Memory" tag', details: 'Question 12 discusses malloc/free patterns. AI suggests adding "Dynamic Memory" concept tag.', metadata: makeMeta(2) },
    { id: 3, type: 'Intervention', created: '2026-03-14', status: 'accepted', preview: 'Focus on Pointers fundamentals', details: 'Review pointer dereferencing and address-of operators before advancing to dynamic memory.', metadata: makeMeta(3) },
    { id: 4, type: 'Edge', created: '2026-03-14', status: 'rejected', preview: 'Arrays → Classes', details: "AI suggested edge, but instructor determined it's not a direct prerequisite relationship.", metadata: makeMeta(4) },
    { id: 5, type: 'Graph Expansion', created: '2026-03-13', status: 'pending', preview: 'Add "Templates" concept', details: 'Based on exam content, AI suggests adding Templates as a new concept dependent on Classes.', metadata: makeMeta(5) },
  ];
}

export async function reviewSuggestion(id: number, action: 'accept' | 'reject'): Promise<AISuggestion> {
  await delay(500);
  const suggestions = await getSuggestions('e1');
  const s = suggestions.find((s) => s.id === id)!;
  return { ...s, status: action === 'accept' ? 'accepted' : 'rejected', metadata: { ...s.metadata, reviewedAt: new Date().toISOString(), reviewedBy: 'Prof. Smith' } };
}

// ── Reports ──

export async function getReportConfigs(_examId: string): Promise<ReportConfig[]> {
  await delay(300);
  return [
    { id: 'r1', title: 'Class Readiness Report', description: 'Comprehensive analytics on class-wide concept readiness with heatmaps and interventions.', format: 'pdf', status: 'idle' },
    { id: 'r2', title: 'Individual Student Reports', description: 'Generate personalized readiness reports with study plans for each student.', format: 'pdf', status: 'idle' },
    { id: 'r3', title: 'Intervention Plan', description: 'Detailed plan for addressing weak concepts with prioritized recommendations.', format: 'pdf', status: 'idle' },
    { id: 'r4', title: 'Data Export', description: 'Export raw readiness data, clusters, and analytics for further analysis.', format: 'csv', status: 'idle' },
  ];
}

export async function generateReport(reportId: string): Promise<ReportConfig> {
  await delay(2000);
  return {
    id: reportId,
    title: 'Generated Report',
    description: '',
    format: 'pdf',
    status: 'ready',
    downloadUrl: '#',
    generatedAt: new Date().toISOString(),
  };
}

// ── Graph Authoring ──

export async function getConceptGraph(_examId: string): Promise<{ nodes: ConceptGraphNode[]; edges: ConceptGraphEdge[] }> {
  await delay(400);
  return { nodes: MOCK_GRAPH_NODES, edges: MOCK_GRAPH_EDGES };
}

export async function addGraphNode(_examId: string, label: string): Promise<ConceptGraphNode> {
  await delay(300);
  return { id: `n${Date.now()}`, label };
}

export async function addGraphEdge(_examId: string, source: string, target: string): Promise<ConceptGraphEdge> {
  await delay(300);
  return { id: `ge${Date.now()}`, source, target };
}

export async function removeGraphNode(_examId: string, nodeId: string): Promise<void> {
  await delay(200);
}

export async function removeGraphEdge(_examId: string, edgeId: string): Promise<void> {
  await delay(200);
}

// ── Student Data ──

export async function getStudentReadiness(_studentId: string, _examId: string): Promise<StudentReadiness> {
  await delay(400);
  return {
    studentId: _studentId,
    studentName: 'Alex Johnson',
    overallReadiness: 0.57,
    concepts: MOCK_CONCEPTS.map((c) => ({ ...c, readiness: c.readiness + (Math.random() * 0.1 - 0.05) })),
  };
}

export async function getStudyPlan(_studentId: string, _examId: string): Promise<StudyPlanStep[]> {
  await delay(400);
  return [
    { step: 1, concept: 'Memory Management', readiness: 0.42, reason: 'Foundational gap — directly affects Pointers understanding', prerequisites: ['C++ Basics'], prereqReady: true, topics: ['Stack vs heap allocation', 'malloc/free patterns', 'Memory leaks and dangling pointers'] },
    { step: 2, concept: 'Pointers', readiness: 0.45, reason: 'Core concept needed for Classes and dynamic data structures', prerequisites: ['C++ Basics', 'Memory Management'], prereqReady: false, topics: ['Pointer dereferencing', 'Address-of operator', 'Pointer arithmetic', 'Pass by pointer vs reference'] },
    { step: 3, concept: 'Classes', readiness: 0.52, reason: 'Builds on Pointers — prerequisite for Inheritance', prerequisites: ['Pointers', 'Arrays'], prereqReady: false, topics: ['Class declaration and definition', 'Constructors and destructors', 'Member access', 'this pointer'] },
    { step: 4, concept: 'Inheritance', readiness: 0.38, reason: 'Depends on strong understanding of Classes', prerequisites: ['Classes'], prereqReady: false, topics: ['Base and derived classes', 'Virtual functions', 'Polymorphism basics', 'Abstract classes'] },
  ];
}

// ── Study Content ──

export async function getStudyContent(_examId: string): Promise<StudyContent[]> {
  await delay(400);
  return [
    { id: 'sc1', type: 'audio', title: 'Concept Review: Memory & Pointers', description: 'A 10-minute audio overview of memory management fundamentals and pointer operations.', duration: '10:24', createdAt: '2026-03-18', status: 'ready' },
    { id: 'sc2', type: 'slides', title: 'Weak Concepts: Study Deck', description: 'Auto-generated presentation covering your weakest concepts with explanations and examples.', slideCount: 18, createdAt: '2026-03-18', status: 'ready' },
    { id: 'sc3', type: 'video', title: 'Prerequisite Chain Walkthrough', description: 'A narrated walkthrough of your prerequisite weaknesses with visual concept maps.', duration: '15:30', createdAt: '2026-03-19', status: 'ready' },
  ];
}

export async function generateStudyContent(_examId: string, type: 'audio' | 'slides' | 'video'): Promise<StudyContent> {
  await delay(3000);
  return {
    id: `sc_${Date.now()}`,
    type,
    title: `Generated ${type} content`,
    description: 'Auto-generated study material.',
    duration: type !== 'slides' ? '12:00' : undefined,
    slideCount: type === 'slides' ? 15 : undefined,
    createdAt: new Date().toISOString(),
    status: 'ready',
  };
}

export async function getSlideContent(_contentId: string): Promise<SlideData[]> {
  await delay(300);
  return [
    { title: 'Memory Management Fundamentals', content: ['Stack allocation: automatic, scoped lifetime', 'Heap allocation: manual, programmer-controlled', 'Common pitfalls: leaks, dangling pointers, double-free'], notes: 'Focus on understanding when to use stack vs heap.' },
    { title: 'Pointer Operations', content: ['Declaration and initialization', 'Dereferencing with * operator', 'Address-of with & operator', 'Pointer arithmetic and array traversal'], notes: 'Practice with diagrams showing memory layout.' },
    { title: 'Dynamic Memory in C++', content: ['new / delete vs malloc / free', 'Array allocation with new[]', 'RAII pattern introduction', 'Smart pointers preview'], notes: 'Emphasize RAII as the modern approach.' },
    { title: 'Classes & Object Lifecycle', content: ['Constructor / destructor semantics', 'Member initialization order', 'Copy constructor and assignment', 'The Rule of Three'], notes: 'Connect back to memory management concepts.' },
    { title: 'Key Takeaways', content: ['Memory management is foundational for all pointer work', 'Always pair allocations with deallocations', 'Use RAII and smart pointers when possible', 'Prerequisite order: Basics → Memory → Pointers → Classes'], notes: 'Summary slide.' },
  ];
}

// ── Chat Assistant ──

export async function sendChatMessage(messages: ChatMessage[]): Promise<ChatMessage> {
  await delay(1500);
  const lastMsg = messages[messages.length - 1];
  let content = 'I can help you with that. ';

  if (lastMsg.content.toLowerCase().includes('student')) {
    content = 'Based on the current data, there are 247 students in this exam. 147 students have readiness below the threshold for Pointers. Would you like me to generate a detailed breakdown?';
  } else if (lastMsg.content.toLowerCase().includes('intervention')) {
    content = 'The top 3 recommended interventions are:\n1. **Pointers** — 147 affected students, 8 downstream concepts\n2. **Dynamic Memory** — 123 affected students, 6 downstream concepts\n3. **Classes** — 98 affected students, 5 downstream concepts\n\nWould you like me to draft an intervention plan?';
  } else if (lastMsg.content.toLowerCase().includes('readiness') || lastMsg.content.toLowerCase().includes('concept')) {
    content = 'The class average readiness across all concepts is **57%**. The weakest concepts are Polymorphism (35%), Inheritance (38%), and Dynamic Memory (42%). These share a common prerequisite chain starting from Pointers.';
  } else if (lastMsg.content.toLowerCase().includes('export') || lastMsg.content.toLowerCase().includes('report')) {
    content = 'I can generate reports in PDF or CSV format. Available report types:\n- Class Readiness Report\n- Individual Student Reports\n- Intervention Plan\n- Raw Data Export\n\nWhich would you like?';
  } else {
    content += 'I have access to your course data, readiness analytics, concept graph, and student records. Try asking about student readiness, interventions, concept relationships, or report generation.';
  }

  return {
    id: `msg_${Date.now()}`,
    role: 'assistant',
    content,
    timestamp: new Date().toISOString(),
  };
}

// ── Students list ──

export async function getStudentsList(_examId: string) {
  await delay(400);
  return Array.from({ length: 20 }, (_, i) => ({
    id: String(i + 1).padStart(3, '0'),
    name: `Student ${String(i + 1).padStart(3, '0')}`,
    readiness: Math.round((0.25 + Math.random() * 0.55) * 100) / 100,
  }));
}

// ── Heatmap data ──

export async function getHeatmapData(_examId: string) {
  await delay(400);
  return [
    { name: 'C++ Basics', readiness: [15, 22, 45, 88, 77] },
    { name: 'Pointers', readiness: [35, 52, 65, 55, 40] },
    { name: 'Arrays', readiness: [8, 18, 38, 92, 91] },
    { name: 'Structs', readiness: [12, 25, 55, 78, 77] },
    { name: 'Classes', readiness: [45, 58, 72, 42, 30] },
    { name: 'Dynamic Memory', readiness: [62, 68, 55, 35, 27] },
    { name: 'Inheritance', readiness: [58, 72, 65, 32, 20] },
    { name: 'Polymorphism', readiness: [68, 78, 52, 28, 21] },
  ];
}
