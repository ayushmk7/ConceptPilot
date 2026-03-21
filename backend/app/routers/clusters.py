"""Clusters endpoint: API-08."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_instructor
from app.database import get_db
from app.models.models import Cluster, ClusterAssignment, Exam
from app.schemas.schemas import (
    ClusterAssignmentSummary,
    ClusterItem,
    ClustersResponse,
)

router = APIRouter(prefix="/api/v1/exams", tags=["Clusters"])


@router.get("/{exam_id}/clusters", response_model=ClustersResponse)
async def get_clusters(
    exam_id: UUID,
    db: AsyncSession = Depends(get_db),
    _user: str = Depends(get_current_instructor),
):
    """Get misconception clusters and student assignments."""
    # Verify exam
    result = await db.execute(select(Exam).where(Exam.id == exam_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Exam not found")

    # Load clusters
    cl_result = await db.execute(
        select(Cluster).where(Cluster.exam_id == exam_id)
    )
    clusters = cl_result.scalars().all()

    if not clusters:
        return ClustersResponse()

    cluster_items = []
    for cl in clusters:
        centroid = cl.centroid_json or {}
        # Determine weak concepts from centroid
        if centroid:
            sorted_concepts = sorted(centroid.items(), key=lambda x: x[1])
            top_weak = [c[0] for c in sorted_concepts[:3]]
        else:
            top_weak = []

        cluster_items.append(ClusterItem(
            id=cl.id,
            cluster_label=cl.cluster_label,
            student_count=cl.student_count,
            centroid=centroid,
            top_weak_concepts=top_weak,
            suggested_interventions=[
                f"Review session for '{c}' — targeted practice and office hours."
                for c in top_weak
            ],
        ))

    # Load assignments
    assign_result = await db.execute(
        select(ClusterAssignment, Cluster)
        .join(Cluster, ClusterAssignment.cluster_id == Cluster.id)
        .where(ClusterAssignment.exam_id == exam_id)
    )
    assignments = [
        ClusterAssignmentSummary(
            student_id=a.student_id_external,
            cluster_label=c.cluster_label,
        )
        for a, c in assign_result.all()
    ]

    return ClustersResponse(
        clusters=cluster_items,
        assignments_summary=assignments,
    )
