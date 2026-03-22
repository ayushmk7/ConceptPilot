#!/usr/bin/env python3
"""Export the OpenAPI schema to a JSON file for contract review.

Usage (from backend/):
    PYTHONPATH=. python scripts/export_openapi.py              # writes to openapi.json
    PYTHONPATH=. python scripts/export_openapi.py schema.json  # writes to schema.json

CI integration:
    PYTHONPATH=. python scripts/export_openapi.py openapi.json && git diff --exit-code openapi.json
"""

import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app


def main() -> None:
    dest = sys.argv[1] if len(sys.argv) > 1 else "openapi.json"
    schema = app.openapi()
    with open(dest, "w") as f:
        json.dump(schema, f, indent=2, default=str)
    route_count = sum(
        len(methods)
        for path_item in schema.get("paths", {}).values()
        for methods in [path_item.keys()]
    )
    print(f"Wrote {dest}  ({route_count} operations, {len(schema.get('paths', {}))} paths)")


if __name__ == "__main__":
    main()
