"""Pydantic request/response schemas for all API endpoints."""

from datetime import datetime
from typing import Any, Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator, model_validator


# ---------------------------------------------------------------------------
# Standardized Error Envelope
# ---------------------------------------------------------------------------

class ValidationError(BaseModel):
    row: Optional[int] = None
    field: Optional[str] = None
    message: str


class ErrorResponse(BaseModel):
    status: str = "error"
    code: str = "VALIDATION_ERROR"
    message: str = ""
    errors: list[ValidationError] = []


# ---------------------------------------------------------------------------
# Course
# ---------------------------------------------------------------------------

class CourseCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)


class CourseResponse(BaseModel):
    id: UUID
    name: str
    created_at: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Exam
# ---------------------------------------------------------------------------

class ExamCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)


class ExamResponse(BaseModel):
    id: UUID
    course_id: UUID
    name: str
    created_at: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Projects
# ---------------------------------------------------------------------------

class ProjectCreate(BaseModel):
    exam_id: UUID
    title: str = Field(..., min_length=1, max_length=255)


class ProjectResponse(BaseModel):
    id: UUID
    exam_id: UUID
    title: str
    created_at: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Canvas workspaces (instructor UI)
# ---------------------------------------------------------------------------


class CanvasWorkspaceCreate(BaseModel):
    title: str = Field(default="Untitled Workspace", min_length=1, max_length=255)
    state: dict[str, Any] = Field(default_factory=dict)


class CanvasWorkspaceUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=255)
    state: Optional[dict[str, Any]] = None


class CanvasWorkspaceResponse(BaseModel):
    id: UUID
    title: str
    state: dict[str, Any]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Upload Responses
# ---------------------------------------------------------------------------

class StudentDetectionSummary(BaseModel):
    student_count: int = 0
    sample_ids: list[str] = []
    warnings: list[str] = []


class ScoresUploadResponse(BaseModel):
    status: str
    row_count: int = 0
    errors: list[ValidationError] = []
    student_detection: Optional[StudentDetectionSummary] = None


class MappingUploadResponse(BaseModel):
    status: str
    concept_count: int = 0
    errors: list[ValidationError] = []


# ---------------------------------------------------------------------------
# Scores Summary (GET .../scores/summary)
# ---------------------------------------------------------------------------

class ScoresSummaryResponse(BaseModel):
    total_rows: int = 0
    student_count: int = 0
    question_count: int = 0


# ---------------------------------------------------------------------------
# Mapping Retrieval (GET .../mapping)
# ---------------------------------------------------------------------------

class MappingItem(BaseModel):
    question_id: str
    concept_id: str
    weight: float


class MappingRetrieveResponse(BaseModel):
    status: str = "ok"
    concept_count: int = 0
    mappings: list[MappingItem] = []


# ---------------------------------------------------------------------------
# Graph Versions (GET .../graph/versions)
# ---------------------------------------------------------------------------

class GraphVersionItem(BaseModel):
    version: int
    node_count: int = 0
    edge_count: int = 0
    annotation: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class GraphVersionListResponse(BaseModel):
    versions: list[GraphVersionItem] = []


# ---------------------------------------------------------------------------
# Dashboard Alerts (GET .../dashboard/alerts)
# ---------------------------------------------------------------------------

class AlertsResponse(BaseModel):
    alerts: list["AlertItem"] = []


# ---------------------------------------------------------------------------
# Graph
# ---------------------------------------------------------------------------

class GraphNode(BaseModel):
    id: str
    label: str


class GraphEdge(BaseModel):
    source: str
    target: str
    weight: float = 0.5


class GraphUploadRequest(BaseModel):
    nodes: list[GraphNode]
    edges: list[GraphEdge]


class GraphUploadResponse(BaseModel):
    status: str
    node_count: int = 0
    edge_count: int = 0
    is_dag: bool = True
    errors: list[ValidationError] = []


class GraphRetrieveNode(BaseModel):
    id: str
    label: str
    readiness: Optional[float] = None
    is_csv_observed: bool = True
    depth: int = 0


class GraphRetrieveEdge(BaseModel):
    source: str
    target: str
    weight: float = 0.5


class GraphRetrieveResponse(BaseModel):
    status: str
    version: int = 0
    nodes: list[GraphRetrieveNode] = []
    edges: list[GraphRetrieveEdge] = []


class GraphExpandRequest(BaseModel):
    concept_id: str
    max_depth: int = Field(3, ge=1, le=5)
    context: str = ""


class GraphExpandResponse(BaseModel):
    status: str
    new_nodes: list[GraphRetrieveNode] = []
    new_edges: list[GraphRetrieveEdge] = []
    suggestion_id: Optional[UUID] = None


class GraphPatchRequest(BaseModel):
    add_nodes: list[GraphNode] = []
    remove_nodes: list[str] = []
    add_edges: list[GraphEdge] = []
    remove_edges: list[GraphEdge] = []


class GraphPatchResponse(BaseModel):
    status: str
    is_dag: bool = True
    cycle_path: Optional[list[str]] = None


# ---------------------------------------------------------------------------
# Compute
# ---------------------------------------------------------------------------

class ComputeRequest(BaseModel):
    alpha: float = 1.0
    beta: float = 0.3
    gamma: float = 0.2
    threshold: float = 0.6
    k: int = 4


class ComputeResponse(BaseModel):
    status: str
    run_id: Optional[UUID] = None
    students_processed: int = 0
    concepts_processed: int = 0
    time_ms: float = 0.0


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------

class HeatmapCell(BaseModel):
    concept_id: str
    concept_label: str
    bucket: str
    count: int
    percentage: float


class AlertItem(BaseModel):
    concept_id: str
    concept_label: str
    class_average_readiness: float
    students_below_threshold: int
    downstream_concepts: list[str]
    impact: float
    recommended_action: str


class AggregateItem(BaseModel):
    concept_id: str
    concept_label: str
    mean_readiness: float
    median_readiness: float
    std_readiness: float
    below_threshold_count: int


class DashboardResponse(BaseModel):
    heatmap: list[HeatmapCell] = []
    alerts: list[AlertItem] = []
    aggregates: list[AggregateItem] = []


# ---------------------------------------------------------------------------
# Trace
# ---------------------------------------------------------------------------

class UpstreamContribution(BaseModel):
    concept_id: str
    concept_label: str
    readiness: float
    contribution_weight: float
    penalty_contribution: float


class DownstreamContribution(BaseModel):
    concept_id: str
    concept_label: str
    readiness: float
    boost_contribution: float


class WaterfallStep(BaseModel):
    label: str
    value: float
    cumulative: float


class TraceResponse(BaseModel):
    concept_id: str
    concept_label: str
    direct_readiness: Optional[float]
    upstream: list[UpstreamContribution] = []
    downstream: list[DownstreamContribution] = []
    waterfall: list[WaterfallStep] = []
    students_affected: int = 0


# ---------------------------------------------------------------------------
# Clusters
# ---------------------------------------------------------------------------

class ClusterItem(BaseModel):
    id: UUID
    cluster_label: str
    student_count: int
    centroid: dict[str, float] = {}
    top_weak_concepts: list[str] = []
    suggested_interventions: list[str] = []


class ClusterAssignmentSummary(BaseModel):
    student_id: str
    cluster_label: str


class ClustersResponse(BaseModel):
    clusters: list[ClusterItem] = []
    assignments_summary: list[ClusterAssignmentSummary] = []


# ---------------------------------------------------------------------------
# Student Report
# ---------------------------------------------------------------------------

class StudentConceptReadiness(BaseModel):
    concept_id: str
    concept_label: str
    direct_readiness: Optional[float]
    final_readiness: float
    confidence: str


class WeakConceptItem(BaseModel):
    concept_id: str
    concept_label: str
    readiness: float
    confidence: str


class StudyPlanItem(BaseModel):
    concept_id: str
    concept_label: str
    readiness: float
    confidence: str
    reason: str
    explanation: str


class StudentReportResponse(BaseModel):
    student_id: str
    exam_id: UUID
    concept_graph: dict[str, Any] = {}
    readiness: list[StudentConceptReadiness] = []
    top_weak_concepts: list[WeakConceptItem] = []
    study_plan: list[StudyPlanItem] = []


# ---------------------------------------------------------------------------
# Report Tokens (instructor-facing token list)
# ---------------------------------------------------------------------------

class StudentTokenItem(BaseModel):
    student_id: str
    token: str
    created_at: datetime

    model_config = {"from_attributes": True}


class StudentTokenListResponse(BaseModel):
    tokens: list[StudentTokenItem] = []


# ---------------------------------------------------------------------------
# Direct student listing (instructor-facing, no tokens needed)
# ---------------------------------------------------------------------------

class StudentListItem(BaseModel):
    student_id: str


class StudentListResponse(BaseModel):
    students: list[StudentListItem] = []


# ---------------------------------------------------------------------------
# Parameters
# ---------------------------------------------------------------------------

class ParametersSchema(BaseModel):
    alpha: float = Field(1.0, ge=0.0, le=5.0)
    beta: float = Field(0.3, ge=0.0, le=5.0)
    gamma: float = Field(0.2, ge=0.0, le=5.0)
    threshold: float = Field(0.6, ge=0.0, le=1.0)
    k: int = Field(4, ge=2, le=20)


class ParametersResponse(BaseModel):
    status: str = "ok"
    alpha: float
    beta: float
    gamma: float
    threshold: float
    k: int = 4

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Intervention Results
# ---------------------------------------------------------------------------

class InterventionItem(BaseModel):
    concept_id: str
    students_affected: int
    downstream_concepts: int
    current_readiness: float
    impact: float
    rationale: str
    suggested_format: str


class InterventionsResponse(BaseModel):
    interventions: list[InterventionItem] = []


# ---------------------------------------------------------------------------
# AI Suggestions
# ---------------------------------------------------------------------------

class ConceptTagSuggestion(BaseModel):
    concept_id: str
    confidence: float = Field(..., ge=0.0, le=1.0)
    rationale: str


class ConceptTagRequest(BaseModel):
    question_text: str
    concept_catalog: list[str] = []


class ConceptTagResponse(BaseModel):
    request_id: UUID
    suggestion_id: UUID
    suggestions: list[ConceptTagSuggestion] = []
    model: str = ""
    prompt_version: str = ""


class PrereqEdgeSuggestion(BaseModel):
    source: str
    target: str
    weight: float = Field(0.5, ge=0.0, le=1.0)
    rationale: str


class PrereqEdgeRequest(BaseModel):
    concepts: list[str]
    context: str = ""


class PrereqEdgeResponse(BaseModel):
    request_id: UUID
    suggestion_id: UUID
    suggestions: list[PrereqEdgeSuggestion] = []
    model: str = ""
    prompt_version: str = ""


class InterventionDraftRequest(BaseModel):
    cluster_centroid: dict[str, float]
    weak_concepts: list[str]
    student_count: int = 0


class InterventionDraftItem(BaseModel):
    concept_id: str
    intervention_type: str
    description: str
    rationale: str


class InterventionDraftResponse(BaseModel):
    request_id: UUID
    suggestion_id: UUID
    drafts: list[InterventionDraftItem] = []
    model: str = ""
    prompt_version: str = ""


# ---------------------------------------------------------------------------
# AI Suggestion Review
# ---------------------------------------------------------------------------

class SuggestionReviewAction(BaseModel):
    action: str = Field(..., pattern="^(accept|reject)$")
    note: str = ""


class BulkReviewRequest(BaseModel):
    suggestion_ids: list[UUID]
    action: str = Field(..., pattern="^(accept|reject)$")
    note: str = ""


class SuggestionListItem(BaseModel):
    id: UUID
    suggestion_type: str
    status: str
    output_payload: dict[str, Any]
    validation_errors: Optional[list[dict[str, Any]]] = None
    model: Optional[str] = None
    prompt_version: Optional[str] = None
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    review_note: Optional[str] = None
    created_at: datetime


class SuggestionListResponse(BaseModel):
    suggestions: list[SuggestionListItem] = []
    total: int = 0
    pending: int = 0
    accepted: int = 0
    rejected: int = 0
    applied: int = 0


class ApplySuggestionsRequest(BaseModel):
    suggestion_ids: list[UUID]


class ApplySuggestionsResponse(BaseModel):
    status: str
    applied_count: int = 0
    errors: list[str] = []


# ---------------------------------------------------------------------------
# Export
# ---------------------------------------------------------------------------

class ExportRequest(BaseModel):
    compute_run_id: Optional[UUID] = None


class ExportStatusResponse(BaseModel):
    id: UUID
    exam_id: UUID
    status: str
    file_checksum: Optional[str] = None
    manifest: Optional[dict[str, Any]] = None
    created_at: datetime
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None


class ExportListResponse(BaseModel):
    exports: list[ExportStatusResponse] = []


# ---------------------------------------------------------------------------
# Study Content
# ---------------------------------------------------------------------------

class StudyContentCreateRequest(BaseModel):
    content_type: str = Field(
        ...,
        pattern="^(audio|presentation|video_walkthrough)$",
        description=(
            "audio: ElevenLabs MP3 plus slides_data JSON. "
            "presentation: transcript and slides_data only (no TTS; export JSON via GET .../download). "
            "video_walkthrough: same MP3 pipeline as audio (no rendered video); "
            "use transcript plus slides_data on the client if you want a slide-synced experience."
        ),
    )
    title: str = Field(..., min_length=1, max_length=255)
    focus_concepts: list[str] = []
    include_weak_concepts: bool = True


class StudyContentResponse(BaseModel):
    id: UUID
    exam_id: UUID
    project_id: Optional[UUID] = None
    content_type: str
    title: str
    source_context: dict[str, Any]
    storage_key: Optional[str] = None
    transcript: Optional[str] = None
    slides_data: Optional[dict[str, Any]] = None
    duration_seconds: Optional[int] = None
    status: str
    error_detail: Optional[str] = None
    prompt_version: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class StudyContentListResponse(BaseModel):
    items: list[StudyContentResponse] = []


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

class HealthResponse(BaseModel):
    status: str
    service: str
    database: str = "unknown"
    anthropic: str = "unknown"
    elevenlabs: str = "unknown"
    object_storage: str = "unknown"


# ---------------------------------------------------------------------------
# Compute Runs
# ---------------------------------------------------------------------------

class ComputeRunResponse(BaseModel):
    id: UUID
    run_id: UUID
    exam_id: UUID
    status: str
    students_processed: Optional[int] = None
    concepts_processed: Optional[int] = None
    parameters: Optional[dict[str, Any]] = None
    graph_version: Optional[int] = None
    duration_ms: Optional[float] = None
    error_message: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Chat (agentic AI assistant)
# ---------------------------------------------------------------------------

class ChatSessionCreate(BaseModel):
    exam_id: Optional[UUID] = None
    title: str = ""
    surface: Literal["instructor", "student"] = "instructor"
    report_token: Optional[str] = None

    @model_validator(mode="after")
    def _student_requires_token(self) -> "ChatSessionCreate":
        if self.surface == "student":
            if not (self.report_token or "").strip():
                raise ValueError("report_token is required when surface is student")
        return self


class ChatSessionResponse(BaseModel):
    id: UUID
    exam_id: Optional[UUID] = None
    surface: str = "instructor"
    title: Optional[str] = None
    created_by: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ChatMessageResponse(BaseModel):
    id: UUID
    role: str
    content: Optional[str] = None
    tool_calls: Optional[list[dict[str, Any]]] = None
    tool_name: Optional[str] = None
    created_at: datetime


class ChatSendRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=10000)
    exam_id: Optional[UUID] = None
    surface: Literal["instructor", "student"] = "instructor"
    report_token: Optional[str] = None

    @field_validator("exam_id", mode="before")
    @classmethod
    def empty_exam_id_to_none(cls, v: Any) -> Any:
        if v is None or v == "":
            return None
        return v


class ChatSendResponse(BaseModel):
    session_id: UUID
    assistant_message: str
    tool_calls_made: list[str] = []
