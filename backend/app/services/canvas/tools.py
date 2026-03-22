"""Canvas tool definitions for Claude tool use.

These schemas are passed to every canvas chat request so Claude can decide
when to invoke a tool. Tool execution happens in claude.py after the stream
completes accumulating the tool input.
"""

CANVAS_TOOLS = [
    {
        "name": "create_branches",
        "description": (
            "Create multiple parallel conversation branches when there are genuinely "
            "distinct approaches worth exploring separately. Call this when you see "
            "2-4 meaningfully different angles on the question. Each branch becomes "
            "a new chat node on the canvas connected to this one."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "branches": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "title": {"type": "string"},
                            "opening_message": {"type": "string"},
                        },
                        "required": ["title", "opening_message"],
                    },
                }
            },
            "required": ["branches"],
        },
    },
    {
        "name": "generate_quiz",
        "description": (
            "Generate a short quiz from the current conversation to test the student's "
            "understanding. Creates an artifact node on the canvas with the quiz as "
            "markdown. The student can draw an edge from the quiz node to a new chat "
            "node to discuss specific questions."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "title": {"type": "string"},
                "questions": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "question": {"type": "string"},
                            "options": {"type": "array", "items": {"type": "string"}},
                            "correct_index": {"type": "integer"},
                            "explanation": {"type": "string"},
                        },
                        "required": [
                            "question",
                            "options",
                            "correct_index",
                            "explanation",
                        ],
                    },
                },
            },
            "required": ["title", "questions"],
        },
    },
    {
        "name": "create_flashcard",
        "description": (
            "Create a flashcard artifact node on the canvas for a key term or concept "
            "from the conversation. Useful for building a study deck as the student "
            "explores the material."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "term": {"type": "string"},
                "definition": {"type": "string"},
                "example": {"type": "string"},
            },
            "required": ["term", "definition"],
        },
    },
    {
        "name": "suggest_branch",
        "description": (
            "Propose a single branch for the student to optionally create. Use this "
            "when you see one clear alternative direction worth exploring, but want "
            "the student to decide. Does NOT auto-create — student must confirm in the UI."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "title": {"type": "string"},
                "reason": {"type": "string"},
            },
            "required": ["title", "reason"],
        },
    },
]


def get_tools() -> list[dict]:
    """Return the full canvas tool list to pass to messages.stream()."""
    return CANVAS_TOOLS
