"""Student report and token management service.

Generates student reports with:
  - Personal concept graph with readiness coloring
  - Top 5 weakest concepts
  - Study plan ordered by topological sort
  - NO peer comparisons, rankings, or percentile data (PRD exclusions)
"""

import uuid
from datetime import datetime, timedelta
from typing import Any, Optional

import numpy as np

from app.config import settings
from app.services.graph_service import build_graph, get_topological_order


def generate_student_token() -> str:
    """Generate a 128-bit random UUID token for student report access."""
    return str(uuid.uuid4())


def build_student_report(
    student_id: str,
    exam_id: str,
    graph_json: dict[str, Any],
    readiness_results: list[dict[str, Any]],
    concepts: list[str],
) -> dict[str, Any]:
    """Build a student report JSON.

    Includes:
      - Personal concept graph with node colors based on readiness
      - Top 5 weakest concepts with confidence
      - Topologically sorted study plan

    Excludes (per PRD):
      - Peer comparisons, rankings, percentiles
      - Predictive risk labels
      - Demographic-correlated analysis
    """
    # Filter readiness for this student
    student_results = [
        r for r in readiness_results if r["student_id"] == student_id
    ]

    if not student_results:
        return {
            "student_id": student_id,
            "exam_id": exam_id,
            "concept_graph": graph_json,
            "readiness": [],
            "top_weak_concepts": [],
            "study_plan": [],
        }

    # Build readiness lookup
    readiness_map = {r["concept_id"]: r for r in student_results}

    # Personal concept graph with colored nodes
    personal_graph = _build_personal_graph(graph_json, readiness_map)

    # Readiness list
    readiness_list = []
    for r in student_results:
        readiness_list.append({
            "concept_id": r["concept_id"],
            "concept_label": _get_concept_label(graph_json, r["concept_id"]),
            "direct_readiness": r["direct_readiness"],
            "final_readiness": r["final_readiness"],
            "confidence": r["confidence"],
        })

    # Top 5 weakest concepts
    sorted_by_readiness = sorted(student_results, key=lambda x: x["final_readiness"])
    top_weak = []
    for r in sorted_by_readiness[:5]:
        top_weak.append({
            "concept_id": r["concept_id"],
            "concept_label": _get_concept_label(graph_json, r["concept_id"]),
            "readiness": r["final_readiness"],
            "confidence": r["confidence"],
        })

    # Study plan: ordered by topological sort so prerequisites come first
    study_plan = _build_study_plan(graph_json, readiness_map)

    return {
        "student_id": student_id,
        "exam_id": exam_id,
        "concept_graph": personal_graph,
        "readiness": readiness_list,
        "top_weak_concepts": top_weak,
        "study_plan": study_plan,
    }


def _build_personal_graph(
    graph_json: dict[str, Any],
    readiness_map: dict[str, dict[str, Any]],
) -> dict[str, Any]:
    """Build a personal concept graph with nodes colored by readiness.

    Colors: green (> 0.7), yellow (0.4–0.7), red (< 0.4).
    """
    nodes = []
    for node in graph_json.get("nodes", []):
        r = readiness_map.get(node["id"])
        if r:
            final = r["final_readiness"]
            if final > 0.7:
                color = "green"
            elif final >= 0.4:
                color = "yellow"
            else:
                color = "red"
        else:
            color = "gray"
            final = None

        nodes.append({
            "id": node["id"],
            "label": node.get("label", node["id"]),
            "readiness": final,
            "color": color,
        })

    return {
        "nodes": nodes,
        "edges": graph_json.get("edges", []),
    }


def _build_study_plan(
    graph_json: dict[str, Any],
    readiness_map: dict[str, dict[str, Any]],
) -> list[dict[str, Any]]:
    """Build study plan ordered by topological sort (prerequisites first).

    Only includes concepts below 0.7 readiness.
    """
    G = build_graph(graph_json)
    topo_order = get_topological_order(G)

    study_plan = []
    for concept_id in topo_order:
        r = readiness_map.get(concept_id)
        if not r:
            continue

        final = r["final_readiness"]
        if final >= 0.7:
            continue

        # Build reason
        if r["direct_readiness"] is not None and r["direct_readiness"] < 0.6:
            reason = "Low direct performance on exam questions"
        elif r["prerequisite_penalty"] > 0.1:
            reason = "Weakness in prerequisite concepts"
        else:
            reason = "Below mastery threshold"

        # Build explanation
        explanation = (
            f"Your readiness for this concept is {final:.2f}. "
        )
        if r["direct_readiness"] is not None:
            explanation += f"Direct performance: {r['direct_readiness']:.2f}. "
        if r["prerequisite_penalty"] > 0:
            explanation += (
                f"Prerequisite penalty: -{r['prerequisite_penalty']:.2f}. "
            )
        if r["downstream_boost"] > 0:
            explanation += (
                f"Downstream boost: +{r['downstream_boost']:.2f}. "
            )

        study_plan.append({
            "concept_id": concept_id,
            "concept_label": _get_concept_label(graph_json, concept_id),
            "readiness": final,
            "confidence": r["confidence"],
            "reason": reason,
            "explanation": explanation.strip(),
        })

    return study_plan


def _get_concept_label(graph_json: dict[str, Any], concept_id: str) -> str:
    """Look up a concept's human-readable label from the graph JSON."""
    for node in graph_json.get("nodes", []):
        if node["id"] == concept_id:
            return node.get("label", concept_id)
    return concept_id


def is_token_expired(created_at: datetime) -> bool:
    """Check if a student token has expired."""
    expiry = created_at + timedelta(days=settings.STUDENT_TOKEN_EXPIRY_DAYS)
    return datetime.utcnow() > expiry
