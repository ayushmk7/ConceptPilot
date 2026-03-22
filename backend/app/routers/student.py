"""Anonymous student workspace API — scoped by X-Student-Exam-Id."""

from __future__ import annotations

import json
import uuid as uuid_mod
from datetime import datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, File, Header, HTTPException, UploadFile
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models.canvas import CanvasProject
from app.models.models import (
    CanvasWorkspace,
    ComputeRun,
    ConceptGraph,
    Course,
    Exam,
    Parameter,
    Project,
    Question,
    QuestionConceptMap,
    ReadinessResult,
    Score,
    StudentWorkspace,
    StudyContent,
)
from app.rate_limit import enforce_student_write_limit
from app.schemas.schemas import (
    CanvasWorkspaceResponse,
    CanvasWorkspaceUpdate,
    ComputeRequest,
    ComputeResponse,
    GraphUploadRequest,
    GraphUploadResponse,
    MappingUploadResponse,
    ScoresUploadResponse,
    StudentContextResponse,
    StudentReportResponse,
    StudyContentCreateRequest,
    StudyContentListResponse,
    StudyContentResponse,
)
from app.services.csv_service import validate_mapping_csv, validate_scores_csv
from app.services.graph_service import validate_graph
from app.services.object_storage_service import upload_raw_upload_artifact
from app.services.report_service import build_student_report
from app.services.student_workspace_service import (
    bootstrap_student_workspace,
    default_study_project_id,
    ensure_student_infinite_canvas_workspace,
    get_workspace_by_exam_id,
)
from app.services.study_content_service import kickoff_study_content_generation
from app.services.study_material_service import extract_text_from_upload, generate_concept_graph_from_text
from app.services.compute_queue_service import enqueue_compute_job
from app.services.compute_runner_service import run_compute_pipeline_for_run

router = APIRouter(prefix="/api/v1/student", tags=["Student"])


def _canvas_workspace_to_response(row: CanvasWorkspace) -> CanvasWorkspaceResponse:
    return CanvasWorkspaceResponse(
        id=row.id,
        title=row.title,
        state=row.state if isinstance(row.state, dict) else {},
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


def _to_study_response(item: StudyContent) -> StudyContentResponse:
    return StudyContentResponse(
        id=item.id,
        exam_id=item.exam_id,
        project_id=item.project_id,
        content_type=item.content_type,
        title=item.title,
        source_context=item.source_context,
        storage_key=item.storage_key,
        transcript=item.transcript,
        slides_data=item.slides_data,
        duration_seconds=item.duration_seconds,
        status=item.status,
        error_detail=item.error_detail,
        prompt_version=item.prompt_version,
        created_at=item.created_at,
        completed_at=item.completed_at,
    )


async def require_student_workspace(
    db: AsyncSession = Depends(get_db),
    x_student_exam_id: Annotated[str | None, Header(alias="X-Student-Exam-Id")] = None,
) -> tuple[Exam, StudentWorkspace]:
    raw = (x_student_exam_id or "").strip()
    if not raw:
        raise HTTPException(status_code=400, detail="X-Student-Exam-Id header is required")
    try:
        eid = UUID(raw)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid X-Student-Exam-Id") from exc
    ws = await get_workspace_by_exam_id(db, eid)
    if not ws:
        raise HTTPException(status_code=404, detail="Student workspace not found for this exam")
    exam = await db.get(Exam, eid)
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    return exam, ws


@router.get("/context", response_model=StudentContextResponse)
async def get_student_context(
    db: AsyncSession = Depends(get_db),
    x_student_exam_id: Annotated[str | None, Header(alias="X-Student-Exam-Id")] = None,
):
    """Bootstrap or resume workspace. Omit header to create a new exam + workspace."""
    raw = (x_student_exam_id or "").strip()
    if raw:
        try:
            eid = UUID(raw)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail="Invalid X-Student-Exam-Id") from exc
        ws = await get_workspace_by_exam_id(db, eid)
        if not ws:
            raise HTTPException(status_code=404, detail="Student workspace not found")
        exam = await db.get(Exam, eid)
        if not exam:
            raise HTTPException(status_code=404, detail="Exam not found")
    else:
        ws = await bootstrap_student_workspace(db)
        exam = await db.get(Exam, ws.exam_id)
        if not exam:
            raise HTTPException(status_code=500, detail="Workspace bootstrap failed")

    course = await db.get(Course, exam.course_id)
    study_pid = await default_study_project_id(db, exam.id)
    if study_pid is None:
        raise HTTPException(status_code=500, detail="Workspace has no study project")

    return StudentContextResponse(
        exam_id=exam.id,
        course_id=exam.course_id,
        course_name=course.name if course else "",
        exam_name=exam.name,
        shared_student_id=ws.student_external_id,
        canvas_project_id=ws.canvas_project_id,
        study_project_id=study_pid,
    )


@router.get("/report", response_model=StudentReportResponse)
async def get_student_workspace_report(
    ctx: tuple[Exam, StudentWorkspace] = Depends(require_student_workspace),
    db: AsyncSession = Depends(get_db),
):
    exam, ws = ctx
    exam_id = exam.id
    student_id = ws.student_external_id

    g_result = await db.execute(
        select(ConceptGraph)
        .where(ConceptGraph.exam_id == exam_id)
        .order_by(ConceptGraph.version.desc())
        .limit(1),
    )
    graph_row = g_result.scalar_one_or_none()
    graph_json = graph_row.graph_json if graph_row else {"nodes": [], "edges": []}

    rr_result = await db.execute(
        select(ReadinessResult).where(
            ReadinessResult.exam_id == exam_id,
            ReadinessResult.student_id_external == student_id,
        ),
    )
    all_results = rr_result.scalars().all()

    results_dicts = [
        {
            "student_id": r.student_id_external,
            "concept_id": r.concept_id,
            "direct_readiness": r.direct_readiness,
            "prerequisite_penalty": r.prerequisite_penalty,
            "downstream_boost": r.downstream_boost,
            "final_readiness": r.final_readiness,
            "confidence": r.confidence,
        }
        for r in all_results
    ]

    concepts = list({r["concept_id"] for r in results_dicts})

    report = build_student_report(
        student_id=student_id,
        exam_id=str(exam_id),
        graph_json=graph_json,
        readiness_results=results_dicts,
        concepts=concepts,
    )

    return StudentReportResponse(**report)


@router.post("/scores", response_model=ScoresUploadResponse)
async def student_upload_scores(
    file: UploadFile = File(...),
    ctx: tuple[Exam, StudentWorkspace] = Depends(require_student_workspace),
    db: AsyncSession = Depends(get_db),
    _rl: None = Depends(enforce_student_write_limit),
):
    exam, ws = ctx
    exam_id = exam.id

    content = await file.read()
    await upload_raw_upload_artifact(str(exam_id), "scores.csv", content, "text/csv")
    df, errors, student_detection = await validate_scores_csv(content, include_student_detection=True)

    if errors:
        return ScoresUploadResponse(status="error", errors=errors)

    sid = ws.student_external_id
    df = df.copy()
    df["StudentID"] = sid

    await db.execute(delete(Score).where(Score.exam_id == exam_id))
    await db.execute(delete(Question).where(Question.exam_id == exam_id))
    await db.flush()

    question_map = {}
    unique_questions = df[["QuestionID", "MaxScore"]].drop_duplicates(subset=["QuestionID"])
    for _, row in unique_questions.iterrows():
        q = Question(
            exam_id=exam_id,
            question_id_external=row["QuestionID"],
            max_score=float(row["MaxScore"]),
        )
        db.add(q)
        await db.flush()
        question_map[row["QuestionID"]] = q

    for _, row in df.iterrows():
        q = question_map[row["QuestionID"]]
        score = Score(
            exam_id=exam_id,
            student_id_external=sid,
            question_id=q.id,
            score=float(row["Score"]),
        )
        db.add(score)

    await db.flush()

    return ScoresUploadResponse(
        status="success",
        row_count=len(df),
        student_detection=student_detection,
    )


@router.post("/mapping", response_model=MappingUploadResponse)
async def student_upload_mapping(
    file: UploadFile = File(...),
    ctx: tuple[Exam, StudentWorkspace] = Depends(require_student_workspace),
    db: AsyncSession = Depends(get_db),
    _rl: None = Depends(enforce_student_write_limit),
):
    exam, _ws = ctx
    exam_id = exam.id

    q_result = await db.execute(
        select(Question.question_id_external).where(Question.exam_id == exam_id),
    )
    existing_qids = {row[0] for row in q_result.fetchall()}

    content = await file.read()
    await upload_raw_upload_artifact(str(exam_id), "mapping.csv", content, "text/csv")
    df, errors = await validate_mapping_csv(content, existing_qids)

    if errors:
        return MappingUploadResponse(status="error", errors=errors)

    q_result = await db.execute(
        select(Question).where(Question.exam_id == exam_id),
    )
    questions = {q.question_id_external: q for q in q_result.scalars().all()}

    for q in questions.values():
        await db.execute(
            delete(QuestionConceptMap).where(QuestionConceptMap.question_id == q.id),
        )
    await db.flush()

    concept_ids = set()
    for _, row in df.iterrows():
        q = questions.get(row["QuestionID"])
        if q:
            mapping = QuestionConceptMap(
                question_id=q.id,
                concept_id=row["ConceptID"],
                weight=float(row["Weight"]),
            )
            db.add(mapping)
            concept_ids.add(row["ConceptID"])

    await db.flush()

    return MappingUploadResponse(
        status="success",
        concept_count=len(concept_ids),
    )


@router.post("/graph", response_model=GraphUploadResponse)
async def student_upload_graph(
    body: GraphUploadRequest,
    ctx: tuple[Exam, StudentWorkspace] = Depends(require_student_workspace),
    db: AsyncSession = Depends(get_db),
    _rl: None = Depends(enforce_student_write_limit),
):
    exam, _ws = ctx
    exam_id = exam.id

    graph_json = {
        "nodes": [n.model_dump() for n in body.nodes],
        "edges": [e.model_dump() for e in body.edges],
    }
    await upload_raw_upload_artifact(
        str(exam_id),
        "graph.json",
        json.dumps(graph_json).encode("utf-8"),
        "application/json",
    )

    is_valid, errors, _cycle = validate_graph(graph_json)

    if not is_valid:
        return GraphUploadResponse(
            status="error",
            node_count=len(body.nodes),
            edge_count=len(body.edges),
            is_dag=False,
            errors=errors,
        )

    v_result = await db.execute(
        select(ConceptGraph.version)
        .where(ConceptGraph.exam_id == exam_id)
        .order_by(ConceptGraph.version.desc())
        .limit(1),
    )
    current_version = v_result.scalar_one_or_none() or 0

    cg = ConceptGraph(
        exam_id=exam_id,
        version=current_version + 1,
        graph_json=graph_json,
    )
    db.add(cg)
    await db.flush()

    return GraphUploadResponse(
        status="success",
        node_count=len(body.nodes),
        edge_count=len(body.edges),
        is_dag=True,
    )


@router.post("/study-material", response_model=GraphUploadResponse)
async def student_upload_study_material(
    file: UploadFile = File(...),
    ctx: tuple[Exam, StudentWorkspace] = Depends(require_student_workspace),
    db: AsyncSession = Depends(get_db),
    _rl: None = Depends(enforce_student_write_limit),
):
    """Upload PDF/text; extract text and replace concept graph with an AI-generated DAG."""
    exam, _ws = ctx
    exam_id = exam.id

    content = await file.read()
    fname = file.filename or "material.bin"
    text = extract_text_from_upload(fname, content)
    if not text.strip():
        raise HTTPException(status_code=400, detail="Could not extract text from file")

    try:
        graph_json = await generate_concept_graph_from_text(exam_name=exam.name, text=text)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    await upload_raw_upload_artifact(
        str(exam_id),
        f"study_material_{fname}",
        content,
        file.content_type or "application/octet-stream",
    )

    is_valid, errors, _cycle = validate_graph(graph_json)
    if not is_valid:
        return GraphUploadResponse(
            status="error",
            node_count=len(graph_json.get("nodes", [])),
            edge_count=len(graph_json.get("edges", [])),
            is_dag=False,
            errors=errors,
        )

    v_result = await db.execute(
        select(ConceptGraph.version)
        .where(ConceptGraph.exam_id == exam_id)
        .order_by(ConceptGraph.version.desc())
        .limit(1),
    )
    current_version = v_result.scalar_one_or_none() or 0

    cg = ConceptGraph(
        exam_id=exam_id,
        version=current_version + 1,
        graph_json=graph_json,
    )
    db.add(cg)
    await db.flush()

    return GraphUploadResponse(
        status="success",
        node_count=len(graph_json.get("nodes", [])),
        edge_count=len(graph_json.get("edges", [])),
        is_dag=True,
    )


@router.post("/compute", response_model=ComputeResponse)
async def student_compute(
    body: ComputeRequest = ComputeRequest(),
    ctx: tuple[Exam, StudentWorkspace] = Depends(require_student_workspace),
    db: AsyncSession = Depends(get_db),
    _rl: None = Depends(enforce_student_write_limit),
):
    exam, _ws = ctx
    exam_id = exam.id

    run_id = uuid_mod.uuid4()

    p_result = await db.execute(
        select(Parameter).where(Parameter.exam_id == exam_id),
    )
    params = p_result.scalar_one_or_none()
    alpha = body.alpha if body.alpha != 1.0 else (params.alpha if params else 1.0)
    beta = body.beta if body.beta != 0.3 else (params.beta if params else 0.3)
    gamma = body.gamma if body.gamma != 0.2 else (params.gamma if params else 0.2)
    threshold = body.threshold if body.threshold != 0.6 else (params.threshold if params else 0.6)
    k = body.k if body.k != 4 else (params.k if params else 4)

    async_enabled = settings.COMPUTE_ASYNC_ENABLED
    compute_run = ComputeRun(
        exam_id=exam_id,
        run_id=run_id,
        status="queued" if async_enabled else "running",
        parameters_json={
            "alpha": alpha,
            "beta": beta,
            "gamma": gamma,
            "threshold": threshold,
            "k": k,
        },
    )
    db.add(compute_run)
    await db.flush()

    if async_enabled:
        queued = await enqueue_compute_job(
            exam_id=exam_id,
            run_id=run_id,
            alpha=alpha,
            beta=beta,
            gamma=gamma,
            threshold=threshold,
            k=k,
        )
        if not queued:
            compute_run.status = "failed"
            compute_run.error_message = (
                f"Unsupported queue backend: {settings.COMPUTE_QUEUE_BACKEND}",
            )
            await db.flush()
            raise HTTPException(status_code=500, detail="Failed to enqueue compute job")

        return ComputeResponse(status="queued", run_id=run_id)

    result_stats = await run_compute_pipeline_for_run(
        db=db,
        exam_id=exam_id,
        run_id=run_id,
        alpha=alpha,
        beta=beta,
        gamma=gamma,
        threshold=threshold,
        k=k,
    )
    return ComputeResponse(
        status="success",
        run_id=run_id,
        students_processed=int(result_stats["students_processed"]),
        concepts_processed=int(result_stats["concepts_processed"]),
        time_ms=float(result_stats["time_ms"]),
    )


@router.post("/study-content", response_model=StudyContentResponse)
async def student_create_study_content(
    body: StudyContentCreateRequest,
    ctx: tuple[Exam, StudentWorkspace] = Depends(require_student_workspace),
    db: AsyncSession = Depends(get_db),
    _rl: None = Depends(enforce_student_write_limit),
):
    exam, _ws = ctx
    exam_id = exam.id

    ctx_body = {
        "focus_concepts": body.focus_concepts,
        "include_weak_concepts": body.include_weak_concepts,
        "locale": (body.locale or "").strip(),
        "voice_id": (body.voice_id or "").strip(),
        "elevenlabs_model_id": (body.elevenlabs_model_id or "").strip(),
    }

    pid = await default_study_project_id(db, exam_id)

    item = StudyContent(
        exam_id=exam_id,
        project_id=pid,
        content_type=body.content_type,
        title=body.title,
        source_context=ctx_body,
        status="pending",
    )
    db.add(item)
    await db.flush()
    await db.refresh(item)
    kickoff_study_content_generation(item.id)
    return _to_study_response(item)


@router.get("/study-content", response_model=StudyContentListResponse)
async def student_list_study_content(
    ctx: tuple[Exam, StudentWorkspace] = Depends(require_student_workspace),
    db: AsyncSession = Depends(get_db),
):
    exam, _ws = ctx
    exam_id = exam.id
    result = await db.execute(
        select(StudyContent)
        .where(StudyContent.exam_id == exam_id)
        .order_by(StudyContent.created_at.desc()),
    )
    rows = result.scalars().all()
    return StudyContentListResponse(items=[_to_study_response(row) for row in rows])


@router.get("/canvas-workspace", response_model=CanvasWorkspaceResponse)
async def get_student_canvas_workspace(
    ctx: tuple[Exam, StudentWorkspace] = Depends(require_student_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Infinite canvas (React Flow) document for this student; same id as `canvas_projects.id`."""
    _exam, ws = ctx
    cp = await db.get(CanvasProject, ws.canvas_project_id)
    title = cp.title if cp else "Canvas"
    row = await ensure_student_infinite_canvas_workspace(db, ws.canvas_project_id, title)
    return _canvas_workspace_to_response(row)


@router.put("/canvas-workspace", response_model=CanvasWorkspaceResponse)
async def put_student_canvas_workspace(
    body: CanvasWorkspaceUpdate,
    ctx: tuple[Exam, StudentWorkspace] = Depends(require_student_workspace),
    db: AsyncSession = Depends(get_db),
    _rl: None = Depends(enforce_student_write_limit),
):
    """Persist infinite canvas nodes/edges (JSONB) for the anonymous student workspace."""
    _exam, ws = ctx
    cp = await db.get(CanvasProject, ws.canvas_project_id)
    title = cp.title if cp else "Canvas"
    row = await ensure_student_infinite_canvas_workspace(db, ws.canvas_project_id, title)
    if body.title is not None:
        row.title = body.title.strip()
    if body.state is not None:
        row.state = body.state
    row.updated_at = datetime.utcnow()
    await db.flush()
    await db.refresh(row)
    return _canvas_workspace_to_response(row)
