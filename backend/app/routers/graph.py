"""Graph endpoints: GET, PATCH, and AI-expand."""

from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_instructor
from app.database import get_db
from app.models.models import AISuggestion, ConceptGraph, ComputeRun, Exam, ReadinessResult
from app.schemas.schemas import (
    GraphExpandRequest,
    GraphExpandResponse,
    GraphPatchRequest,
    GraphPatchResponse,
    GraphRetrieveEdge,
    GraphRetrieveNode,
    GraphRetrieveResponse,
)
from app.services.ai_service import suggest_subtopic_expansion
from app.services.graph_service import apply_patch, build_graph

router = APIRouter(prefix="/api/v1/exams", tags=["Graph"])


@router.get("/{exam_id}/graph", response_model=GraphRetrieveResponse)
async def get_graph(
    exam_id: UUID,
    db: AsyncSession = Depends(get_db),
    _user: str = Depends(get_current_instructor),
):
    """Return the latest concept graph with readiness overlays."""
    result = await db.execute(select(Exam).where(Exam.id == exam_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Exam not found")

    g_result = await db.execute(
        select(ConceptGraph)
        .where(ConceptGraph.exam_id == exam_id)
        .order_by(ConceptGraph.version.desc())
        .limit(1)
    )
    graph_row = g_result.scalar_one_or_none()
    if not graph_row:
        return GraphRetrieveResponse(status="empty", version=0)

    graph_json = graph_row.graph_json
    G = build_graph(graph_json)

    # Get latest compute run readiness data
    run_result = await db.execute(
        select(ComputeRun)
        .where(ComputeRun.exam_id == exam_id, ComputeRun.status == "success")
        .order_by(ComputeRun.created_at.desc())
        .limit(1)
    )
    compute_run = run_result.scalar_one_or_none()

    readiness_map: dict[str, float] = {}
    csv_concept_ids: set[str] = set()
    if compute_run:
        sr_result = await db.execute(
            select(ReadinessResult).where(ReadinessResult.run_id == compute_run.run_id)
        )
        for sr in sr_result.scalars().all():
            csv_concept_ids.add(sr.concept_id)
            readiness_map.setdefault(sr.concept_id, 0.0)
            readiness_map[sr.concept_id] = max(readiness_map[sr.concept_id], sr.final_readiness or 0.0)

    # Compute depths via topological sort
    import networkx as nx
    depths: dict[str, int] = {}
    if nx.is_directed_acyclic_graph(G):
        for node in nx.topological_sort(G):
            preds = list(G.predecessors(node))
            depths[node] = max((depths.get(p, 0) for p in preds), default=-1) + 1
    else:
        for node in G.nodes:
            depths[node] = 0

    nodes = [
        GraphRetrieveNode(
            id=n,
            label=G.nodes[n].get("label", n),
            readiness=readiness_map.get(n),
            is_csv_observed=n in csv_concept_ids,
            depth=depths.get(n, 0),
        )
        for n in G.nodes
    ]

    edges = [
        GraphRetrieveEdge(source=u, target=v, weight=d.get("weight", 0.5))
        for u, v, d in G.edges(data=True)
    ]

    return GraphRetrieveResponse(
        status="ok",
        version=graph_row.version,
        nodes=nodes,
        edges=edges,
    )


@router.post("/{exam_id}/graph/expand", response_model=GraphExpandResponse)
async def expand_graph(
    exam_id: UUID,
    body: GraphExpandRequest,
    db: AsyncSession = Depends(get_db),
    _user: str = Depends(get_current_instructor),
):
    """Use AI to suggest subtopics and edges extending from a given concept."""
    result = await db.execute(select(Exam).where(Exam.id == exam_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Exam not found")

    g_result = await db.execute(
        select(ConceptGraph)
        .where(ConceptGraph.exam_id == exam_id)
        .order_by(ConceptGraph.version.desc())
        .limit(1)
    )
    graph_row = g_result.scalar_one_or_none()
    existing_ids: set[str] = set()
    if graph_row:
        existing_ids = {n["id"] for n in graph_row.graph_json.get("nodes", [])}

    ai_result = await suggest_subtopic_expansion(
        concept_id=body.concept_id,
        max_depth=body.max_depth,
        existing_concepts=list(existing_ids),
        context=body.context,
    )

    if ai_result.get("error"):
        raise HTTPException(status_code=502, detail=f"AI service error: {ai_result['error']}")

    raw_nodes = ai_result.get("nodes", [])
    raw_edges = ai_result.get("edges", [])

    new_nodes = [
        GraphRetrieveNode(id=n["id"], label=n.get("label", n["id"]), is_csv_observed=False, depth=n.get("depth", 1))
        for n in raw_nodes
        if n["id"] not in existing_ids
    ]
    new_edges = [
        GraphRetrieveEdge(source=e["source"], target=e["target"], weight=e.get("weight", 0.5))
        for e in raw_edges
    ]

    suggestion = AISuggestion(
        exam_id=exam_id,
        suggestion_type="graph_expansion",
        status="pending",
        input_payload={"concept_id": body.concept_id, "max_depth": body.max_depth},
        output_payload={"nodes": [n.model_dump() for n in new_nodes], "edges": [e.model_dump() for e in new_edges]},
        model=ai_result.get("model"),
        prompt_version=ai_result.get("prompt_version"),
        token_usage=ai_result.get("token_usage"),
        latency_ms=ai_result.get("latency_ms"),
    )
    db.add(suggestion)
    await db.flush()
    await db.refresh(suggestion)

    return GraphExpandResponse(
        status="ok",
        new_nodes=new_nodes,
        new_edges=new_edges,
        suggestion_id=suggestion.id,
    )


@router.patch("/{exam_id}/graph", response_model=GraphPatchResponse)
async def patch_graph(
    exam_id: UUID,
    body: GraphPatchRequest,
    db: AsyncSession = Depends(get_db),
    _user: str = Depends(get_current_instructor),
):
    """Edit the concept dependency graph: add/remove nodes and edges."""
    result = await db.execute(select(Exam).where(Exam.id == exam_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Exam not found")

    g_result = await db.execute(
        select(ConceptGraph)
        .where(ConceptGraph.exam_id == exam_id)
        .order_by(ConceptGraph.version.desc())
        .limit(1)
    )
    graph_row = g_result.scalar_one_or_none()

    if not graph_row:
        raise HTTPException(
            status_code=404,
            detail="No graph found. Upload a graph first (POST /graph).",
        )

    updated_json, is_dag, cycle_path, errors = apply_patch(
        graph_row.graph_json, body
    )

    if errors:
        return GraphPatchResponse(
            status="error",
            is_dag=is_dag,
            cycle_path=cycle_path,
        )

    new_graph = ConceptGraph(
        exam_id=exam_id,
        version=graph_row.version + 1,
        graph_json=updated_json,
    )
    db.add(new_graph)
    await db.flush()

    return GraphPatchResponse(status="success", is_dag=True)
