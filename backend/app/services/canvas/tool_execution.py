"""Tool execution functions for canvas Claude tool use.

Each function receives the parsed tool input and a DB session, performs the
necessary DB writes, fires WebSocket broadcasts, and returns a result dict
that is sent to the frontend as a tool_result SSE event.

These functions are called from claude.py after the stream finishes
accumulating the tool input — never inside the stream loop itself.
"""

from __future__ import annotations

import asyncio

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.canvas import CanvasEdge, CanvasMessage, CanvasNode
from app.services.canvas.multiplayer import broadcast


def _node_dict(node: CanvasNode) -> dict:
    return {
        "id": str(node.id),
        "project_id": str(node.project_id),
        "type": node.type,
        "title": node.title,
        "position_x": node.position_x,
        "position_y": node.position_y,
        "is_collapsed": node.is_collapsed,
        "skill": node.skill,
        "active_user": node.active_user,
        "created_at": node.created_at.isoformat(),
    }


def _edge_dict(edge: CanvasEdge) -> dict:
    return {
        "id": str(edge.id),
        "project_id": str(edge.project_id),
        "source_node_id": str(edge.source_node_id),
        "target_node_id": str(edge.target_node_id),
        "created_at": edge.created_at.isoformat(),
    }


def _quiz_to_markdown(title: str, questions: list[dict]) -> str:
    """Format a quiz tool input as a downloadable markdown document."""
    lines = [f"# {title}\n"]
    answers = []

    for i, q in enumerate(questions, start=1):
        lines.append(f"**Q{i}.** {q['question']}\n")
        options = q.get("options", [])
        correct = q.get("correct_index", 0)
        for j, opt in enumerate(options):
            letter = chr(ord("A") + j)
            lines.append(f"- {letter}) {opt}")
        lines.append("")
        answers.append(
            f"**Q{i}.** {chr(ord('A') + correct)} — {q.get('explanation', '')}"
        )

    lines.append("---\n## Answers\n")
    lines.extend(answers)
    return "\n".join(lines)


def _flashcard_to_markdown(term: str, definition: str, example: str | None) -> str:
    """Format a flashcard tool input as a markdown document."""
    lines = [
        f"# {term}\n",
        f"**Definition:** {definition}\n",
    ]
    if example:
        lines.append(f"**Example:** {example}\n")
    return "\n".join(lines)


async def execute_generate_quiz(
    tool_input: dict,
    parent_node: CanvasNode,
    db: AsyncSession,
) -> dict:
    """Create an artifact node containing a quiz formatted as markdown."""
    title = tool_input.get("title", "Quiz")
    questions = tool_input.get("questions", [])
    markdown = _quiz_to_markdown(title, questions)

    artifact = CanvasNode(
        project_id=parent_node.project_id,
        type="artifact",
        title=title,
        position_x=parent_node.position_x + 350,
        position_y=parent_node.position_y - 100,
    )
    db.add(artifact)
    await db.flush()

    msg = CanvasMessage(node_id=artifact.id, role="assistant", content=markdown)
    db.add(msg)
    await db.flush()
    await db.commit()

    edge = CanvasEdge(
        project_id=parent_node.project_id,
        source_node_id=parent_node.id,
        target_node_id=artifact.id,
    )
    db.add(edge)
    await db.flush()
    await db.commit()

    node_data = {**_node_dict(artifact), "content": markdown}
    edge_data = _edge_dict(edge)

    asyncio.create_task(
        broadcast(
            str(parent_node.project_id), {"type": "node_created", "node": node_data}
        )
    )
    asyncio.create_task(
        broadcast(
            str(parent_node.project_id), {"type": "edge_created", "edge": edge_data}
        )
    )

    return {"nodes": [node_data], "edges": [edge_data]}


async def execute_create_artifact(
    tool_input: dict,
    parent_node: CanvasNode,
    db: AsyncSession,
) -> dict:
    """Create a generic artifact node with markdown or code content."""
    title = tool_input.get("title", "Artifact")
    content = tool_input.get("content", "")

    artifact = CanvasNode(
        project_id=parent_node.project_id,
        type="artifact",
        title=title,
        position_x=parent_node.position_x + 350,
        position_y=parent_node.position_y - 100,
    )
    db.add(artifact)
    await db.flush()

    msg = CanvasMessage(node_id=artifact.id, role="assistant", content=content)
    db.add(msg)
    await db.flush()

    edge = CanvasEdge(
        project_id=parent_node.project_id,
        source_node_id=parent_node.id,
        target_node_id=artifact.id,
    )
    db.add(edge)
    await db.flush()
    await db.commit()

    node_data = {**_node_dict(artifact), "content": content}
    edge_data = _edge_dict(edge)

    asyncio.create_task(
        broadcast(str(parent_node.project_id), {"type": "node_created", "node": node_data})
    )
    asyncio.create_task(
        broadcast(str(parent_node.project_id), {"type": "edge_created", "edge": edge_data})
    )

    return {"nodes": [node_data], "edges": [edge_data]}


async def execute_create_flashcard(
    tool_input: dict,
    parent_node: CanvasNode,
    db: AsyncSession,
) -> dict:
    """Create an artifact node containing a flashcard formatted as markdown."""
    term = tool_input.get("term", "Term")
    definition = tool_input.get("definition", "")
    example = tool_input.get("example")
    markdown = _flashcard_to_markdown(term, definition, example)

    artifact = CanvasNode(
        project_id=parent_node.project_id,
        type="artifact",
        title=term,
        position_x=parent_node.position_x + 350,
        position_y=parent_node.position_y + 100,
    )
    db.add(artifact)
    await db.flush()

    msg = CanvasMessage(node_id=artifact.id, role="assistant", content=markdown)
    db.add(msg)
    await db.flush()
    await db.commit()

    node_data = _node_dict(artifact)
    asyncio.create_task(
        broadcast(
            str(parent_node.project_id), {"type": "node_created", "node": node_data}
        )
    )

    return {"node": node_data}


async def execute_create_branches(
    tool_input: dict,
    parent_node: CanvasNode,
    db: AsyncSession,
) -> dict:
    """Create N child chat nodes + edges from the parent node, one per branch."""
    branches = tool_input.get("branches", [])
    created_nodes = []
    created_edges = []

    for i, branch in enumerate(branches):
        child = CanvasNode(
            project_id=parent_node.project_id,
            type="chat",
            title=branch.get("title", f"Branch {i + 1}"),
            position_x=parent_node.position_x + 350,
            position_y=parent_node.position_y + (i * 250) - (len(branches) * 125),
            skill=parent_node.skill,
        )
        db.add(child)
        await db.flush()

        # Store the opening message as the first assistant message on the child node
        opening = branch.get("opening_message", "")
        if opening:
            opening_msg = CanvasMessage(
                node_id=child.id, role="assistant", content=opening
            )
            db.add(opening_msg)
            await db.flush()

        edge = CanvasEdge(
            project_id=parent_node.project_id,
            source_node_id=parent_node.id,
            target_node_id=child.id,
        )
        db.add(edge)
        await db.flush()

        await db.commit()

        node_data = _node_dict(child)
        edge_data = _edge_dict(edge)
        created_nodes.append(node_data)
        created_edges.append(edge_data)

        asyncio.create_task(
            broadcast(
                str(parent_node.project_id),
                {"type": "node_created", "node": node_data},
            )
        )
        asyncio.create_task(
            broadcast(
                str(parent_node.project_id),
                {"type": "edge_created", "edge": edge_data},
            )
        )

    return {"nodes": created_nodes, "edges": created_edges}
