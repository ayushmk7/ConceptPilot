import json
from typing import AsyncGenerator
from uuid import UUID

import anthropic
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.canvas import CanvasMessage, CanvasNode
from app.services.canvas.context import assemble_context
from app.services.canvas.tool_execution import (
    execute_create_artifact,
    execute_create_branches,
    execute_create_flashcard,
    execute_generate_quiz,
)
from app.services.canvas.tools import get_tools

_client: anthropic.AsyncAnthropic | None = None


def get_client() -> anthropic.AsyncAnthropic:
    global _client
    if _client is None:
        _client = anthropic.AsyncAnthropic(
            api_key=settings.ANTHROPIC_API_KEY,
            timeout=settings.ANTHROPIC_TIMEOUT_SECONDS,
            max_retries=settings.ANTHROPIC_MAX_RETRIES,
        )
    return _client


async def _execute_tool(
    tool_name: str,
    tool_input: dict,
    tool_use_id: str,
    parent_node: CanvasNode,
    db: AsyncSession,
) -> tuple[dict, dict]:
    """Execute a canvas tool and return (sse_result, tool_result_block).

    Returns:
        sse_result   — payload for the tool_result SSE event sent to frontend
        tool_result_block — Anthropic tool_result content block for follow-up stream
    """
    if tool_name == "create_branches":
        result = await execute_create_branches(tool_input, parent_node, db)
    elif tool_name == "generate_quiz":
        result = await execute_generate_quiz(tool_input, parent_node, db)
    elif tool_name == "create_artifact":
        result = await execute_create_artifact(tool_input, parent_node, db)
    elif tool_name == "create_flashcard":
        result = await execute_create_flashcard(tool_input, parent_node, db)
    elif tool_name == "suggest_branch":
        # No DB writes — just forward suggestion to frontend
        result = {
            "title": tool_input.get("title", ""),
            "reason": tool_input.get("reason", ""),
        }
    else:
        result = {}

    tool_result_block = {
        "type": "tool_result",
        "tool_use_id": tool_use_id,
        "content": json.dumps(result),
    }
    return result, tool_result_block


async def stream_canvas_response(
    node_id: UUID,
    content: str,
    session_id: str,
    db: AsyncSession,
) -> AsyncGenerator[str, None]:
    try:
        # 1. Assemble context from linked nodes BEFORE saving the current user message.
        #    This ensures own_history does not include the current turn (which hasn't been
        #    written to DB yet), preventing a duplicate / consecutive-user-message error.
        system_prompt, messages, context_truncated = await assemble_context(node_id, db)

        # 2. Append the new user message to the conversation.
        #    If the last entry is already a user message with content blocks (e.g. a
        #    file/image injected by context assembly), merge the text into it so there
        #    are no consecutive user-role turns — the Anthropic API forbids that.
        if (
            messages
            and messages[-1]["role"] == "user"
            and isinstance(messages[-1]["content"], list)
        ):
            messages[-1]["content"].append({"type": "text", "text": content})
        else:
            messages.append({"role": "user", "content": content})

        # 3. Persist the user message to DB now that the messages array is built.
        user_msg = CanvasMessage(node_id=node_id, role="user", content=content)
        db.add(user_msg)
        await db.flush()

        client = get_client()
        parent_node = await db.get(CanvasNode, node_id)

        # Track full text and tool state across both streams
        full_text = ""
        final_usage = None

        # ---------------------------------------------------------------
        # First stream — tokens and/or tool call accumulation
        # ---------------------------------------------------------------
        tool_name: str | None = None
        tool_use_id: str | None = None
        tool_input_chunks: list[str] = []
        assistant_content_blocks: list[dict] = []

        async with client.messages.stream(
            model=settings.ANTHROPIC_MODEL,
            max_tokens=settings.ANTHROPIC_MAX_TOKENS,
            system=system_prompt,
            messages=messages,
            tools=get_tools(),
        ) as stream:
            async for event in stream:
                if event.type == "content_block_start":
                    block = event.content_block
                    if block.type == "tool_use":
                        # Claude is calling a tool — capture name and id
                        tool_name = block.name
                        tool_use_id = block.id
                        tool_input_chunks = []
                        assistant_content_blocks.append(
                            {
                                "type": "tool_use",
                                "id": block.id,
                                "name": block.name,
                                "input": {},
                            }
                        )
                        yield f"data: {json.dumps({'type': 'tool_start', 'name': block.name})}\n\n"

                    elif block.type == "text":
                        assistant_content_blocks.append({"type": "text", "text": ""})

                elif event.type == "content_block_delta":
                    delta = event.delta
                    if delta.type == "text_delta":
                        full_text += delta.text
                        # Update last text block
                        if (
                            assistant_content_blocks
                            and assistant_content_blocks[-1]["type"] == "text"
                        ):
                            assistant_content_blocks[-1]["text"] += delta.text
                        yield f"data: {json.dumps({'type': 'token', 'text': delta.text})}\n\n"

                    elif delta.type == "input_json_delta":
                        # Accumulate tool input JSON chunks
                        tool_input_chunks.append(delta.partial_json)

            final = await stream.get_final_message()
            final_usage = final.usage

        # ---------------------------------------------------------------
        # Tool execution (outside the stream loop)
        # ---------------------------------------------------------------
        follow_up_text = ""
        if tool_name and tool_use_id:
            # Parse accumulated tool input
            raw_input = "".join(tool_input_chunks)
            tool_input = json.loads(raw_input) if raw_input else {}

            # Update the input in the assistant content block for follow-up
            for block in assistant_content_blocks:
                if block.get("type") == "tool_use" and block.get("id") == tool_use_id:
                    block["input"] = tool_input

            # Execute tool
            sse_result, tool_result_block = await _execute_tool(
                tool_name, tool_input, tool_use_id, parent_node, db
            )

            yield f"data: {json.dumps({'type': 'tool_result', 'name': tool_name, **sse_result})}\n\n"

            # ---------------------------------------------------------------
            # Follow-up stream — Claude responds after seeing tool result
            # ---------------------------------------------------------------
            follow_up_messages = messages + [
                {"role": "assistant", "content": assistant_content_blocks},
                {"role": "user", "content": [tool_result_block]},
            ]

            async with client.messages.stream(
                model=settings.ANTHROPIC_MODEL,
                max_tokens=settings.ANTHROPIC_MAX_TOKENS,
                system=system_prompt,
                messages=follow_up_messages,
                tools=get_tools(),
            ) as follow_up:
                async for event in follow_up:
                    if (
                        event.type == "content_block_delta"
                        and event.delta.type == "text_delta"
                    ):
                        follow_up_text += event.delta.text
                        yield f"data: {json.dumps({'type': 'token', 'text': event.delta.text})}\n\n"

                follow_up_final = await follow_up.get_final_message()
                final_usage = follow_up_final.usage

        # ---------------------------------------------------------------
        # Save assistant message and emit done
        # ---------------------------------------------------------------
        combined_text = full_text + follow_up_text
        assistant_msg = CanvasMessage(
            node_id=node_id, role="assistant", content=combined_text
        )
        db.add(assistant_msg)
        await db.flush()
        await db.commit()

        done_event = {
            "type": "done",
            "message_id": str(assistant_msg.id),
            "usage": {
                "input_tokens": final_usage.input_tokens if final_usage else 0,
                "output_tokens": final_usage.output_tokens if final_usage else 0,
            },
            "context_truncated": context_truncated,
        }
        yield f"data: {json.dumps(done_event)}\n\n"

    except Exception as e:
        yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
