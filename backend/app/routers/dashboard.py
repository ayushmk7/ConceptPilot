"""Dashboard endpoints: API-06 (dashboard) and API-07 (trace)."""

from typing import Optional
from uuid import UUID

import numpy as np
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_instructor
from app.database import get_db
from app.models.models import (
    ClassAggregate,
    ConceptGraph,
    Exam,
    Parameter,
    ReadinessResult,
)
from app.schemas.schemas import (
    AggregateItem,
    AlertItem,
    DashboardResponse,
    DownstreamContribution,
    HeatmapCell,
    TraceResponse,
    UpstreamContribution,
    WaterfallStep,
)
from app.services.graph_service import build_graph

router = APIRouter(prefix="/api/v1/exams", tags=["Dashboard"])

READINESS_BUCKETS = [
    ("0-20", 0.0, 0.2),
    ("20-40", 0.2, 0.4),
    ("40-60", 0.4, 0.6),
    ("60-80", 0.6, 0.8),
    ("80-100", 0.8, 1.01),  # 1.01 to include 1.0
]


# ---------------------------------------------------------------------------
# API-06: Dashboard
# ---------------------------------------------------------------------------

@router.get("/{exam_id}/dashboard", response_model=DashboardResponse)
async def get_dashboard(
    exam_id: UUID,
    concept_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    _user: str = Depends(get_current_instructor),
):
    """Instructor dashboard: heatmap, foundational gap alerts, aggregates.

    Optionally filter by concept_id.
    """
    # Verify exam
    result = await db.execute(select(Exam).where(Exam.id == exam_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Exam not found")

    # --- Load aggregates ---
    agg_query = select(ClassAggregate).where(ClassAggregate.exam_id == exam_id)
    if concept_id:
        agg_query = agg_query.where(ClassAggregate.concept_id == concept_id)
    agg_result = await db.execute(agg_query)
    aggregates = agg_result.scalars().all()

    if not aggregates:
        return DashboardResponse()

    # --- Load graph for labels ---
    g_result = await db.execute(
        select(ConceptGraph)
        .where(ConceptGraph.exam_id == exam_id)
        .order_by(ConceptGraph.version.desc())
        .limit(1)
    )
    graph_row = g_result.scalar_one_or_none()
    label_map = {}
    G = None
    if graph_row:
        G = build_graph(graph_row.graph_json)
        for n in graph_row.graph_json.get("nodes", []):
            label_map[n["id"]] = n.get("label", n["id"])

    # --- Load readiness results for heatmap ---
    rr_query = select(ReadinessResult).where(ReadinessResult.exam_id == exam_id)
    if concept_id:
        rr_query = rr_query.where(ReadinessResult.concept_id == concept_id)
    rr_result = await db.execute(rr_query)
    readiness_rows = rr_result.scalars().all()

    # --- Build heatmap ---
    heatmap = _build_heatmap(readiness_rows, label_map)

    # --- Build alerts ---
    params_result = await db.execute(
        select(Parameter).where(Parameter.exam_id == exam_id)
    )
    params = params_result.scalar_one_or_none()
    alert_threshold = params.threshold if params else 0.6

    alerts = _build_alerts(aggregates, G, label_map, alert_threshold)

    # --- Build aggregate items ---
    agg_items = [
        AggregateItem(
            concept_id=a.concept_id,
            concept_label=label_map.get(a.concept_id, a.concept_id),
            mean_readiness=a.mean_readiness,
            median_readiness=a.median_readiness,
            std_readiness=a.std_readiness,
            below_threshold_count=a.below_threshold_count,
        )
        for a in aggregates
    ]

    return DashboardResponse(
        heatmap=heatmap,
        alerts=alerts,
        aggregates=agg_items,
    )


def _build_heatmap(
    readiness_rows: list,
    label_map: dict[str, str],
) -> list[HeatmapCell]:
    """Build heatmap cells: concepts × readiness buckets."""
    # Group by concept
    concept_values: dict[str, list[float]] = {}
    for r in readiness_rows:
        if r.concept_id not in concept_values:
            concept_values[r.concept_id] = []
        concept_values[r.concept_id].append(r.final_readiness)

    cells = []
    for concept_id, values in concept_values.items():
        total = len(values)
        for bucket_name, low, high in READINESS_BUCKETS:
            count = sum(1 for v in values if low <= v < high)
            cells.append(HeatmapCell(
                concept_id=concept_id,
                concept_label=label_map.get(concept_id, concept_id),
                bucket=bucket_name,
                count=count,
                percentage=round(count / total * 100, 1) if total > 0 else 0,
            ))

    return cells


def _build_alerts(
    aggregates: list,
    G,
    label_map: dict[str, str],
    threshold: float,
) -> list[AlertItem]:
    """Build foundational gap alerts for concepts below threshold."""
    alerts = []

    for a in aggregates:
        if a.mean_readiness >= threshold:
            continue

        # Count downstream concepts
        downstream = []
        if G and a.concept_id in G.nodes:
            downstream = list(G.successors(a.concept_id))

        # Only alert on foundational concepts (with dependents)
        if not downstream and G:
            continue

        impact = len(downstream) * a.below_threshold_count * (1 - a.mean_readiness)

        alerts.append(AlertItem(
            concept_id=a.concept_id,
            concept_label=label_map.get(a.concept_id, a.concept_id),
            class_average_readiness=a.mean_readiness,
            students_below_threshold=a.below_threshold_count,
            downstream_concepts=[label_map.get(d, d) for d in downstream],
            impact=round(impact, 2),
            recommended_action=(
                f"Review session recommended for '{label_map.get(a.concept_id, a.concept_id)}'. "
                f"{a.below_threshold_count} students are struggling, affecting "
                f"{len(downstream)} downstream concept(s)."
            ),
        ))

    # Sort by impact descending
    alerts.sort(key=lambda x: x.impact, reverse=True)
    return alerts


# ---------------------------------------------------------------------------
# API-07: Root-Cause Trace
# ---------------------------------------------------------------------------

@router.get(
    "/{exam_id}/dashboard/trace/{concept_id}",
    response_model=TraceResponse,
)
async def get_trace(
    exam_id: UUID,
    concept_id: str,
    db: AsyncSession = Depends(get_db),
    _user: str = Depends(get_current_instructor),
):
    """Root-cause trace for a specific concept.

    Shows direct performance, contributing prerequisites, downstream boosts,
    and a waterfall visualization of how readiness was computed.
    """
    # Verify exam
    result = await db.execute(select(Exam).where(Exam.id == exam_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Exam not found")

    # Load graph
    g_result = await db.execute(
        select(ConceptGraph)
        .where(ConceptGraph.exam_id == exam_id)
        .order_by(ConceptGraph.version.desc())
        .limit(1)
    )
    graph_row = g_result.scalar_one_or_none()
    label_map = {}
    G = None
    if graph_row:
        G = build_graph(graph_row.graph_json)
        for n in graph_row.graph_json.get("nodes", []):
            label_map[n["id"]] = n.get("label", n["id"])

    # Load readiness results for this concept
    rr_result = await db.execute(
        select(ReadinessResult).where(
            ReadinessResult.exam_id == exam_id,
            ReadinessResult.concept_id == concept_id,
        )
    )
    results = rr_result.scalars().all()

    if not results:
        raise HTTPException(status_code=404, detail=f"No results for concept '{concept_id}'")

    # Load parameters
    params_result = await db.execute(
        select(Parameter).where(Parameter.exam_id == exam_id)
    )
    params = params_result.scalar_one_or_none()
    alpha = params.alpha if params else 1.0
    beta = params.beta if params else 0.3
    gamma = params.gamma if params else 0.2
    threshold = params.threshold if params else 0.6

    # Aggregate across students
    direct_values = [r.direct_readiness for r in results if r.direct_readiness is not None]
    avg_direct = float(np.mean(direct_values)) if direct_values else None
    avg_penalty = float(np.mean([r.prerequisite_penalty for r in results]))
    avg_boost = float(np.mean([r.downstream_boost for r in results]))
    avg_final = float(np.mean([r.final_readiness for r in results]))
    students_below = sum(1 for r in results if r.final_readiness < threshold)

    # Build upstream contributions
    upstream = []
    if G and concept_id in G.nodes:
        for parent in G.predecessors(concept_id):
            edge_data = G.edges[parent, concept_id]
            edge_weight = edge_data.get("weight", 0.5)

            # Load parent readiness
            p_result = await db.execute(
                select(ReadinessResult).where(
                    ReadinessResult.exam_id == exam_id,
                    ReadinessResult.concept_id == parent,
                )
            )
            p_rows = p_result.scalars().all()
            if p_rows:
                p_direct = [r.direct_readiness for r in p_rows if r.direct_readiness is not None]
                p_avg = float(np.mean(p_direct)) if p_direct else 0.0
                gap = max(0.0, threshold - p_avg)
                upstream.append(UpstreamContribution(
                    concept_id=parent,
                    concept_label=label_map.get(parent, parent),
                    readiness=p_avg,
                    contribution_weight=edge_weight,
                    penalty_contribution=edge_weight * gap,
                ))

    # Build downstream contributions
    downstream = []
    if G and concept_id in G.nodes:
        for child in G.successors(concept_id):
            edge_data = G.edges[concept_id, child]
            edge_weight = edge_data.get("weight", 0.5)
            validation_weight = edge_weight * 0.4

            d_result = await db.execute(
                select(ReadinessResult).where(
                    ReadinessResult.exam_id == exam_id,
                    ReadinessResult.concept_id == child,
                )
            )
            d_rows = d_result.scalars().all()
            if d_rows:
                d_direct = [r.direct_readiness for r in d_rows if r.direct_readiness is not None]
                d_avg = float(np.mean(d_direct)) if d_direct else 0.0
                downstream.append(DownstreamContribution(
                    concept_id=child,
                    concept_label=label_map.get(child, child),
                    readiness=d_avg,
                    boost_contribution=validation_weight * d_avg,
                ))

    # Build waterfall
    direct_component = alpha * (avg_direct if avg_direct is not None else 0.0)
    penalty_component = beta * avg_penalty
    boost_component = gamma * avg_boost

    waterfall = [
        WaterfallStep(
            label="Direct Readiness",
            value=direct_component,
            cumulative=direct_component,
        ),
        WaterfallStep(
            label="Prerequisite Penalty",
            value=-penalty_component,
            cumulative=direct_component - penalty_component,
        ),
        WaterfallStep(
            label="Downstream Boost",
            value=boost_component,
            cumulative=direct_component - penalty_component + boost_component,
        ),
        WaterfallStep(
            label="Final Readiness",
            value=avg_final,
            cumulative=avg_final,
        ),
    ]

    return TraceResponse(
        concept_id=concept_id,
        concept_label=label_map.get(concept_id, concept_id),
        direct_readiness=avg_direct,
        upstream=upstream,
        downstream=downstream,
        waterfall=waterfall,
        students_affected=students_below,
    )
