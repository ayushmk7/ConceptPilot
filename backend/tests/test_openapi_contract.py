"""OpenAPI contract export checks."""

import json
import subprocess
import sys


def test_openapi_export_script_writes_schema(tmp_path):
    output = tmp_path / "openapi.json"
    cmd = [sys.executable, "scripts/export_openapi.py", str(output)]
    result = subprocess.run(cmd, cwd=".", capture_output=True, text=True, check=True)
    assert output.exists(), result.stderr

    schema = json.loads(output.read_text(encoding="utf-8"))
    assert "paths" in schema
    assert "/api/v1/projects" in schema["paths"]
    assert "/api/v1/projects/{project_id}" in schema["paths"]
    assert "/api/v1/projects/{project_id}/study-content" in schema["paths"]
    assert "/api/v1/exams/{exam_id}/study-content" in schema["paths"]
    assert "/api/v1/study-content/{content_id}" in schema["paths"]
    assert "/api/v1/canvas-workspaces" in schema["paths"]
    assert "/api/v1/canvas-workspaces/{workspace_id}" in schema["paths"]
