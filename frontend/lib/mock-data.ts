/**
 * Hardcoded mock data for UI development.
 *
 * To revert: remove imports of this file from page components and
 * restore the original API calls. Search for "mock-data" across the
 * frontend folder to find all usages.
 */

import type {
  Alert,
  Intervention,
  Cluster,
  ReadinessParams,
  ConceptReadiness,
  ConceptGraphNode,
  ConceptGraphEdge,
  AISuggestion,
  StudyPlanStep,
} from './types';

// ── Instructor Dashboard ──

export const MOCK_HEATMAP_DATA = [
  { name: 'Pointers & References', conceptId: 'pointers', readiness: [2, 5, 8, 12, 18] },
  { name: 'Memory Management', conceptId: 'memory', readiness: [6, 9, 7, 10, 13] },
  { name: 'Recursion', conceptId: 'recursion', readiness: [3, 4, 6, 14, 18] },
  { name: 'Linked Lists', conceptId: 'linked-lists', readiness: [8, 10, 9, 11, 7] },
  { name: 'Big-O Analysis', conceptId: 'big-o', readiness: [1, 3, 5, 15, 21] },
  { name: 'Inheritance & Polymorphism', conceptId: 'inheritance', readiness: [4, 7, 11, 13, 10] },
  { name: 'Abstract Data Types', conceptId: 'adts', readiness: [2, 6, 8, 16, 13] },
  { name: 'Operator Overloading', conceptId: 'op-overload', readiness: [5, 8, 10, 12, 10] },
];

export const MOCK_ALERTS: Alert[] = [
  { id: 'a1', concept: 'Pointers & References', affected: 15, downstream: 4, severity: 0.82 },
  { id: 'a2', concept: 'Memory Management', affected: 12, downstream: 3, severity: 0.71 },
  { id: 'a3', concept: 'Linked Lists', affected: 18, downstream: 2, severity: 0.65 },
];

export const MOCK_INTERVENTIONS: Intervention[] = [
  { id: 'i1', rank: 1, concept: 'Pointers & References', description: 'Review pointer arithmetic and pass-by-reference with in-class exercises.', affected: 15, downstreamBreadth: 4, weaknessSeverity: 0.82 },
  { id: 'i2', rank: 2, concept: 'Memory Management', description: 'Supplement lecture with heap vs. stack diagrams and valgrind walkthrough.', affected: 12, downstreamBreadth: 3, weaknessSeverity: 0.71 },
  { id: 'i3', rank: 3, concept: 'Linked Lists', description: 'Assign targeted problem set focusing on list traversal and node manipulation.', affected: 18, downstreamBreadth: 2, weaknessSeverity: 0.65 },
];

export const MOCK_CLUSTERS: Cluster[] = [
  {
    id: 'c1',
    label: 'Strong Performers',
    count: 18,
    color: '#22c55e',
    concepts: [
      { name: 'Big-O Analysis', avgReadiness: 0.91 },
      { name: 'Recursion', avgReadiness: 0.87 },
      { name: 'ADTs', avgReadiness: 0.84 },
      { name: 'Inheritance', avgReadiness: 0.82 },
    ],
  },
  {
    id: 'c2',
    label: 'Mid-Range',
    count: 15,
    color: '#f59e0b',
    concepts: [
      { name: 'Big-O Analysis', avgReadiness: 0.72 },
      { name: 'Recursion', avgReadiness: 0.61 },
      { name: 'Pointers', avgReadiness: 0.55 },
      { name: 'Linked Lists', avgReadiness: 0.48 },
    ],
  },
  {
    id: 'c3',
    label: 'At Risk',
    count: 12,
    color: '#ef4444',
    concepts: [
      { name: 'Pointers', avgReadiness: 0.28 },
      { name: 'Memory Mgmt', avgReadiness: 0.32 },
      { name: 'Linked Lists', avgReadiness: 0.35 },
      { name: 'Recursion', avgReadiness: 0.41 },
    ],
  },
];

export const MOCK_PARAMS: ReadinessParams = {
  alpha: 0.5,
  beta: 0.3,
  gamma: 0.2,
  threshold: 0.6,
  k: 3,
};

export const MOCK_TOTAL_STUDENTS = 45;

// ── Student Pages ──

export const MOCK_STUDENT_CONCEPTS: ConceptReadiness[] = [
  { concept: 'Pointers & References', readiness: 0.38, confidence: 'high', questionCount: 6, directReadiness: 0.42, prerequisitePenalty: 0.15, downstreamBoost: 0.11 },
  { concept: 'Memory Management', readiness: 0.45, confidence: 'medium', questionCount: 4, directReadiness: 0.5, prerequisitePenalty: 0.18, downstreamBoost: 0.13 },
  { concept: 'Recursion', readiness: 0.72, confidence: 'high', questionCount: 5, directReadiness: 0.78, prerequisitePenalty: 0.08, downstreamBoost: 0.02 },
  { concept: 'Linked Lists', readiness: 0.41, confidence: 'medium', questionCount: 4, directReadiness: 0.48, prerequisitePenalty: 0.22, downstreamBoost: 0.15 },
  { concept: 'Big-O Analysis', readiness: 0.85, confidence: 'high', questionCount: 3, directReadiness: 0.88, prerequisitePenalty: 0.03, downstreamBoost: 0.0 },
  { concept: 'Inheritance & Polymorphism', readiness: 0.62, confidence: 'high', questionCount: 5, directReadiness: 0.68, prerequisitePenalty: 0.1, downstreamBoost: 0.04 },
  { concept: 'Abstract Data Types', readiness: 0.78, confidence: 'medium', questionCount: 3, directReadiness: 0.82, prerequisitePenalty: 0.06, downstreamBoost: 0.02 },
  { concept: 'Operator Overloading', readiness: 0.55, confidence: 'low', questionCount: 2, directReadiness: 0.6, prerequisitePenalty: 0.12, downstreamBoost: 0.07 },
];

export const MOCK_GRAPH_NODES: ConceptGraphNode[] = [
  { id: 'pointers', label: 'Pointers & References', readiness: 0.38 },
  { id: 'memory', label: 'Memory Management', readiness: 0.45 },
  { id: 'recursion', label: 'Recursion', readiness: 0.72 },
  { id: 'linked-lists', label: 'Linked Lists', readiness: 0.41 },
  { id: 'big-o', label: 'Big-O Analysis', readiness: 0.85 },
  { id: 'inheritance', label: 'Inheritance', readiness: 0.62 },
  { id: 'adts', label: 'ADTs', readiness: 0.78 },
  { id: 'op-overload', label: 'Operator Overloading', readiness: 0.55 },
];

export const MOCK_GRAPH_EDGES: ConceptGraphEdge[] = [
  { id: 'e1', source: 'pointers', target: 'memory' },
  { id: 'e2', source: 'pointers', target: 'linked-lists' },
  { id: 'e3', source: 'recursion', target: 'linked-lists' },
  { id: 'e4', source: 'big-o', target: 'linked-lists' },
  { id: 'e5', source: 'inheritance', target: 'adts' },
  { id: 'e6', source: 'inheritance', target: 'op-overload' },
  { id: 'e7', source: 'memory', target: 'adts' },
];

// ── Student Study Plan ──

export const MOCK_STUDY_PLAN: StudyPlanStep[] = [
  {
    step: 1,
    concept: 'Pointers & References',
    readiness: 0.38,
    reason: 'Foundational concept — many other topics depend on pointer understanding.',
    prerequisites: [],
    prereqReady: true,
    topics: ['Pointer declaration and dereferencing', 'Pass-by-reference vs pass-by-value', 'Pointer arithmetic basics', 'Common pointer pitfalls (dangling, null)'],
  },
  {
    step: 2,
    concept: 'Memory Management',
    readiness: 0.45,
    reason: 'Builds on pointers — required for understanding dynamic data structures.',
    prerequisites: ['Pointers & References'],
    prereqReady: false,
    topics: ['Stack vs heap allocation', 'new/delete and memory leaks', 'RAII and smart pointers overview', 'Valgrind basics'],
  },
  {
    step: 3,
    concept: 'Linked Lists',
    readiness: 0.41,
    reason: 'Depends on pointers and memory management — a key data structure.',
    prerequisites: ['Pointers & References', 'Recursion'],
    prereqReady: false,
    topics: ['Node structure and traversal', 'Insertion and deletion operations', 'Singly vs doubly linked lists', 'Recursive list operations'],
  },
  {
    step: 4,
    concept: 'Operator Overloading',
    readiness: 0.55,
    reason: 'Builds on inheritance concepts — useful for ADT design.',
    prerequisites: ['Inheritance & Polymorphism'],
    prereqReady: true,
    topics: ['Overloading arithmetic operators', 'Stream insertion/extraction operators', 'Comparison operators', 'Assignment operator and Rule of Three'],
  },
];

// ── AI Suggestions ──

export const MOCK_SUGGESTIONS: AISuggestion[] = [
  {
    id: 's1',
    type: 'Edge',
    created: '2 hours ago',
    status: 'pending',
    preview: 'Pointers & References → Linked Lists',
    details: 'Students who struggle with pointer concepts consistently underperform on linked-list problems. Adding this prerequisite edge would improve readiness prediction accuracy by ~12%.',
    metadata: { model: 'claude-sonnet-4-5-20250514', promptVersion: 'v2.1', requestId: 'req_abc123def456', latencyMs: 1240, tokenUsage: { input: 850, output: 320 } },
  },
  {
    id: 's2',
    type: 'Intervention',
    created: '3 hours ago',
    status: 'pending',
    preview: 'Add pointer-focused practice set',
    details: 'Analysis shows 15 students (33%) have pointer readiness below 0.4. A targeted problem set with 8-10 pointer exercises could address the most common misconceptions identified in exam responses.',
    metadata: { model: 'claude-sonnet-4-5-20250514', promptVersion: 'v2.1', requestId: 'req_ghi789jkl012', latencyMs: 980, tokenUsage: { input: 1100, output: 450 } },
  },
  {
    id: 's3',
    type: 'Concept Tag',
    created: '5 hours ago',
    status: 'accepted',
    preview: 'Tag Q14-Q16 as "Iterator Patterns"',
    details: 'Questions 14-16 test iterator invalidation and custom iterator design, which are not captured by the current "ADTs" tag. Splitting into a new concept improves granularity.',
    metadata: { model: 'claude-sonnet-4-5-20250514', promptVersion: 'v2.0', requestId: 'req_mno345pqr678', latencyMs: 870, tokenUsage: { input: 720, output: 280 }, reviewedAt: '2026-03-21T10:30:00Z', reviewedBy: 'Prof. Smith' },
  },
  {
    id: 's4',
    type: 'Edge',
    created: '1 day ago',
    status: 'rejected',
    preview: 'Big-O Analysis → Recursion',
    details: 'While Big-O concepts help reason about recursive complexity, the data does not show a strong prerequisite relationship. Students can learn recursion mechanics independently.',
    metadata: { model: 'claude-sonnet-4-5-20250514', promptVersion: 'v2.0', requestId: 'req_stu901vwx234', latencyMs: 1050, tokenUsage: { input: 900, output: 350 }, reviewedAt: '2026-03-20T15:00:00Z', reviewedBy: 'Prof. Smith' },
  },
  {
    id: 's5',
    type: 'Graph Expansion',
    created: '1 day ago',
    status: 'pending',
    preview: 'Split "Memory Management" into 2 sub-concepts',
    details: 'The current "Memory Management" concept covers both stack/heap allocation and RAII/smart pointers. Splitting would reveal that students struggle specifically with RAII while understanding basic allocation.',
    metadata: { model: 'claude-sonnet-4-5-20250514', promptVersion: 'v2.1', requestId: 'req_yza567bcd890', latencyMs: 1420, tokenUsage: { input: 1300, output: 520 } },
  },
];

// ── Reports ──

export const MOCK_REPORT_TOKENS = [
  { student_id: 'ajohnson', token: 'tok_abc123' },
  { student_id: 'bsmith', token: 'tok_def456' },
  { student_id: 'cwilliams', token: 'tok_ghi789' },
  { student_id: 'djones', token: 'tok_jkl012' },
  { student_id: 'ebrown', token: 'tok_mno345' },
  { student_id: 'fdavis', token: 'tok_pqr678' },
  { student_id: 'gmiller', token: 'tok_stu901' },
  { student_id: 'hwilson', token: 'tok_vwx234' },
];

// ── Courses & Exams (for sidebar/context) ──

export const MOCK_COURSES = [
  { id: 'course-1', name: 'EECS 280', code: 'EECS280', term: 'Winter 2026' },
  { id: 'course-2', name: 'EECS 281', code: 'EECS281', term: 'Winter 2026' },
];

export const MOCK_EXAMS = [
  { id: 'exam-1', courseId: 'course-1', name: 'Midterm 1', createdAt: '2026-02-15T00:00:00Z' },
  { id: 'exam-2', courseId: 'course-1', name: 'Midterm 2', createdAt: '2026-03-10T00:00:00Z' },
];
