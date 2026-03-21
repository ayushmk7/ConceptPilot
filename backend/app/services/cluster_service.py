"""K-means clustering on student readiness vectors and intervention ranking.

Implements PRD §2.3:
  - K-means clustering using scikit-learn
  - Top weak concepts per cluster
  - Intervention ranking by impact
"""

from typing import Any

import numpy as np
from sklearn.cluster import KMeans


def run_clustering(
    final_readiness_matrix: np.ndarray,
    concepts: list[str],
    students: list[str],
    k: int = 4,
) -> dict[str, Any]:
    """Run k-means clustering on student readiness vectors.

    Args:
        final_readiness_matrix: shape (n_students, n_concepts)
        concepts: ordered list of concept IDs
        students: ordered list of student IDs
        k: number of clusters

    Returns:
        Dict with cluster info and assignments.
    """
    n_students = len(students)

    # Handle edge case: fewer students than clusters
    actual_k = min(k, n_students)
    if actual_k < 2:
        # Not enough students to cluster; put everyone in one cluster
        return {
            "clusters": [{
                "cluster_label": "Cluster 0",
                "centroid": {c: float(final_readiness_matrix[:, i].mean())
                             for i, c in enumerate(concepts)},
                "student_count": n_students,
                "top_weak_concepts": _top_weak_concepts(
                    final_readiness_matrix.mean(axis=0), concepts, top_n=3,
                ),
                "suggested_interventions": [],
            }],
            "assignments": {s: "Cluster 0" for s in students},
        }

    kmeans = KMeans(n_clusters=actual_k, random_state=42, n_init=10)
    labels = kmeans.fit_predict(final_readiness_matrix)

    clusters = []
    assignments = {}

    for cluster_idx in range(actual_k):
        mask = labels == cluster_idx
        cluster_students = [s for s, m in zip(students, mask) if m]
        centroid = kmeans.cluster_centers_[cluster_idx]
        centroid_dict = {c: float(centroid[i]) for i, c in enumerate(concepts)}

        weak_concepts = _top_weak_concepts(centroid, concepts, top_n=3)
        interventions = _suggest_interventions(weak_concepts)

        clusters.append({
            "cluster_label": f"Cluster {cluster_idx}",
            "centroid": centroid_dict,
            "student_count": int(mask.sum()),
            "top_weak_concepts": weak_concepts,
            "suggested_interventions": interventions,
        })

        for student in cluster_students:
            assignments[student] = f"Cluster {cluster_idx}"

    return {
        "clusters": clusters,
        "assignments": assignments,
    }


def _top_weak_concepts(centroid: np.ndarray, concepts: list[str], top_n: int = 3) -> list[str]:
    """Return the top N weakest concepts by centroid readiness."""
    indices = np.argsort(centroid)[:top_n]
    return [concepts[i] for i in indices]


def _suggest_interventions(weak_concepts: list[str]) -> list[str]:
    """Generate suggested interventions for a cluster's weak concepts."""
    interventions = []
    for concept in weak_concepts:
        interventions.append(
            f"Review session recommended for '{concept}' — "
            f"consider targeted practice problems and office hours focus."
        )
    return interventions


def rank_interventions(
    final_readiness_matrix: np.ndarray,
    concepts: list[str],
    adjacency: np.ndarray,
    threshold: float,
) -> list[dict[str, Any]]:
    """Rank interventions by estimated impact.

    Impact = num_students_affected * num_downstream_concepts * (1 - current_readiness)

    Returns sorted list of intervention recommendations.
    """
    n_concepts = len(concepts)
    interventions = []

    for i, concept in enumerate(concepts):
        readiness_vals = final_readiness_matrix[:, i]
        students_below = int(np.sum(readiness_vals < threshold))
        current_readiness = float(np.mean(readiness_vals))

        # Count downstream concepts
        downstream_count = int(np.sum(adjacency[i, :] > 0))

        if students_below == 0:
            continue

        impact = students_below * max(downstream_count, 1) * (1 - current_readiness)

        interventions.append({
            "concept_id": concept,
            "students_affected": students_below,
            "downstream_concepts": downstream_count,
            "current_readiness": current_readiness,
            "impact": float(impact),
            "rationale": (
                f"{students_below} students below threshold; "
                f"{downstream_count} downstream concepts may be affected"
            ),
            "suggested_format": "Review session, practice problems, office hours focus",
        })

    # Sort by impact descending
    interventions.sort(key=lambda x: x["impact"], reverse=True)
    return interventions
