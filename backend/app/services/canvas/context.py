from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.canvas import (
    CanvasBranch,
    CanvasEdge,
    CanvasFile,
    CanvasMessage,
    CanvasNode,
)
from app.services.canvas.skills import get_skill_prompt


async def assemble_context(
    node_id: UUID,
    db: AsyncSession,
) -> tuple[str, list[dict], bool]:

    node = await db.get(CanvasNode, node_id)
    skill_prompt = get_skill_prompt(node.skill or "Tutor")

    own_msgs = await db.execute(
        select(CanvasMessage)
        .where(CanvasMessage.node_id == node_id)
        .order_by(CanvasMessage.created_at)
    )
    own_history = [
        {"role": m.role, "content": m.content or ""}
        for m in own_msgs.scalars().all()
        if m.role in ("user", "assistant")
    ]
    # Step 2 — find all nodes connected TO this node (one hop only)
    edges = await db.execute(
        select(CanvasEdge).where(CanvasEdge.target_node_id == node_id)
    )

    # Step 3 — gather content from each connected source node by type
    linked_messages = []
    artifact_references = []

    for edge in edges.scalars().all():
        source = await db.get(CanvasNode, edge.source_node_id)
        if not source:
            continue

        if source.type == "chat":
            branch = (
                await db.execute(
                    select(CanvasBranch)
                    .where(CanvasBranch.child_node_id == node_id)
                    .where(CanvasBranch.parent_node_id == source.id)
                )
            ).scalar_one_or_none()

            if branch:
                msgs = (
                    (
                        await db.execute(
                            select(CanvasMessage)
                            .where(CanvasMessage.id.in_(branch.source_message_ids_json))
                            .order_by(CanvasMessage.created_at)
                        )
                    )
                    .scalars()
                    .all()
                )
            else:
                msgs = (
                    (
                        await db.execute(
                            select(CanvasMessage)
                            .where(CanvasMessage.node_id == source.id)
                            .order_by(CanvasMessage.created_at)
                        )
                    )
                    .scalars()
                    .all()
                )

            for m in msgs:
                if m.role in ("user", "assistant"):
                    linked_messages.append({"role": m.role, "content": m.content or ""})

        elif source.type == "image":
            f = (
                await db.execute(
                    select(CanvasFile).where(CanvasFile.node_id == source.id).limit(1)
                )
            ).scalar_one_or_none()
            if f and f.file_data:
                linked_messages.append(
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "image",
                                "source": {
                                    "type": "base64",
                                    "media_type": f.content_type or "image/jpeg",
                                    "data": f.file_data,
                                },
                            }
                        ],
                    }
                )

        elif source.type == "document":
            f = (
                await db.execute(
                    select(CanvasFile).where(CanvasFile.node_id == source.id).limit(1)
                )
            ).scalar_one_or_none()
            if f and f.file_data:
                linked_messages.append(
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "document",
                                "source": {
                                    "type": "base64",
                                    "media_type": "application/pdf",
                                    "data": f.file_data,
                                },
                            }
                        ],
                    }
                )
        # Simplified truncation: keep the tail of each half.
        # A per-node cap would be more precise but this is sufficient for hackathon.
        elif source.type == "artifact":
            artifact_msg = (
                await db.execute(
                    select(CanvasMessage)
                    .where(CanvasMessage.node_id == source.id)
                    .order_by(CanvasMessage.created_at.desc())
                    .limit(1)
                )
            ).scalar_one_or_none()
            if artifact_msg and artifact_msg.content:
                artifact_references.append(
                    f"[Reference: {source.title}]\n{artifact_msg.content}"
                )

    # Step 4 — compose system prompt and final messages array
    system_parts = [skill_prompt]
    if artifact_references:
        system_parts.append(
            "\n\nThe following reference materials are available from connected nodes:\n\n"
            + "\n\n".join(artifact_references)
        )
    system_prompt = "\n".join(system_parts)

    messages = linked_messages + own_history

    # Step 5 — truncation
    context_truncated = False
    if len(messages) > 150:
        own_history = own_history[-50:]
        linked_messages = linked_messages[-100:]
        messages = linked_messages + own_history
        context_truncated = True

    return system_prompt, messages, context_truncated
