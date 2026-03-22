import json
from typing import AsyncGenerator
from uuid import UUID

import anthropic
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.canvas import CanvasMessage
from app.services.canvas.context import assemble_context

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


async def stream_canvas_response(
    node_id: UUID,
    content: str,
    session_id: str,
    db: AsyncSession,
) -> AsyncGenerator[str, None]:
    try:
        # 1. Save user message before calling Anthropic
        user_msg = CanvasMessage(node_id=node_id, role="user", content=content)
        db.add(user_msg)
        await db.flush()

        # 2. Assemble context from linked nodes
        system_prompt, messages, context_truncated = await assemble_context(node_id, db)

        # 3. Append the new user message to the conversation
        messages.append({"role": "user", "content": content})

        # 4. Stream from Anthropic
        client = get_client()
        full_text = ""

        async with client.messages.stream(
            model=settings.ANTHROPIC_MODEL,
            max_tokens=settings.ANTHROPIC_MAX_TOKENS,
            system=system_prompt,
            messages=messages,
        ) as stream:
            # 5. Yield tokens as they arrive
            async for event in stream:
                if (
                    event.type == "content_block_delta"
                    and event.delta.type == "text_delta"
                ):
                    full_text += event.delta.text
                    yield f"data: {json.dumps({'type': 'token', 'text': event.delta.text})}\n\n"

            # 6. Stream closed — get usage, save assistant message, yield done
            final = await stream.get_final_message()

        assistant_msg = CanvasMessage(
            node_id=node_id, role="assistant", content=full_text
        )
        db.add(assistant_msg)
        await db.flush()

        yield f"data: {json.dumps({
            'type': 'done',
            'message_id': str(assistant_msg.id),
            'usage': {
                'input_tokens': final.usage.input_tokens,
                'output_tokens': final.usage.output_tokens,
            },
            'context_truncated': context_truncated,
        })}\n\n"

    except Exception as e:
        yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"