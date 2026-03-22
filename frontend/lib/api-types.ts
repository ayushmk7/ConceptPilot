/** Raw backend JSON shapes (snake_case) used by the API layer. */

export interface StudentReportResponse {
  student_id: string;
  exam_id: string;
  concept_graph: Record<string, unknown>;
  readiness: Array<{
    concept_id: string;
    concept_label: string;
    direct_readiness: number | null;
    final_readiness: number;
    confidence: string;
  }>;
  top_weak_concepts: Array<{
    concept_id: string;
    concept_label: string;
    readiness: number;
    confidence: string;
  }>;
  study_plan: Array<{
    concept_id: string;
    concept_label: string;
    readiness: number;
    confidence: string;
    reason: string;
    explanation: string;
  }>;
}
