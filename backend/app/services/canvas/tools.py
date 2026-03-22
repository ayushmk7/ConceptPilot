"""Canvas tool definitions for Claude tool use.

These schemas are passed to every canvas chat request so Claude can decide
when to invoke a tool. Tool execution happens in claude.py after the stream
completes accumulating the tool input.
"""

CANVAS_TOOLS = [
    {
        "name": "create_branches",
        "description": (
            "ONLY call this when the student EXPLICITLY asks to explore multiple angles, "
            "approaches, or perspectives at the same time — e.g. 'show me two ways to think "
            "about this', 'explore this from different angles', 'create branches'. "
            "Do NOT call for simple factual questions, definitions, or explanations. "
            "Do NOT call unless the student directly requests branching. "
            "Creates parallel chat nodes on the canvas, one per branch."
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
            "ONLY call this when the student EXPLICITLY asks for a quiz, test, or practice "
            "questions — e.g. 'quiz me', 'test my understanding', 'give me some questions', "
            "'generate a quiz'. "
            "Do NOT call proactively or for general conversation. "
            "Creates an artifact node on the canvas with the quiz as markdown."
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
        "name": "create_artifact",
        "description": (
            "ONLY call this when the student EXPLICITLY asks to create, save, or export "
            "content as a canvas node — e.g. 'save this as a note', 'create a code artifact', "
            "'put this in a node', 'make a markdown artifact', 'export this code'. "
            "Do NOT call for normal explanations or conversation. "
            "Creates an artifact node on the canvas with the content as markdown or code."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "title": {"type": "string", "description": "Short title for the artifact node"},
                "content": {"type": "string", "description": "Full markdown or code content"},
                "language": {
                    "type": "string",
                    "description": "Programming language if this is a code artifact (e.g. 'python', 'javascript'). Omit for plain markdown.",
                },
            },
            "required": ["title", "content"],
        },
    },
    {
        "name": "create_flashcard",
        "description": (
            "ONLY call this when the student EXPLICITLY asks for a flashcard — e.g. "
            "'make a flashcard', 'create a flashcard for this term', 'add this to my deck'. "
            "Do NOT call proactively during normal explanation or conversation. "
            "Creates an artifact node on the canvas with the flashcard as markdown."
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
            "ONLY call this when the student EXPLICITLY asks for a branch suggestion — "
            "e.g. 'what else could we explore', 'suggest a direction', 'what other angle'. "
            "Do NOT call proactively. Does NOT auto-create — student must confirm in the UI."
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
