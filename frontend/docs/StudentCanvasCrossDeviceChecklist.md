# Student canvas and cross-device checklist

Manual verification after changes to anonymous student workspace, infinite canvas persistence, and LAN access.

## Database

1. Run `alembic upgrade head` on the API environment.
2. Load the student UI once (`/student` or `GET /api/v1/student/context` without header).
3. In Postgres, confirm a row in `student_workspaces`, a row in `canvas_projects`, and a row in `canvas_workspaces` whose `id` equals `student_workspaces.canvas_project_id`.
4. Move a node on `/canvas/{id}?role=student` and confirm `canvas_workspaces.state` JSONB updates (or inspect via `GET /api/v1/student/canvas-workspace` with `X-Student-Exam-Id`).

## Cross-device (LAN)

1. Set `NEXT_PUBLIC_API_URL` in `frontend/.env.local` to `http://<your-LAN-IP>:8000` and rebuild if needed.
2. Set backend `CORS_ALLOWED_ORIGINS` to include `http://<your-LAN-IP>:3000` (and your production URL when deployed).
3. Start the API bound to all interfaces (e.g. `uvicorn ... --host 0.0.0.0`).
4. Open the app from a second device using `http://<LAN-IP>:3000`; confirm browser network calls target the LAN API URL, not `127.0.0.1`.

## D3 graph pages

1. Open `/student/graph` and `/student/report` (or any page using the dynamic D3 graphs).
2. Confirm no console errors; run `npm run build` in `frontend` successfully.

## Navigation

1. From `/canvas/{projectId}?role=student`, use the back control: URL should stay in student mode (`?role=student` on `/canvas`).
2. Use “Student overview” on the canvas project page to reach `/student`.
3. On a narrow viewport, open the hamburger menu in the student top bar and navigate to Upload, Report, etc.

## Automated backend tests

```bash
cd backend && python -m pytest tests/test_student_canvas_workspace.py -v
```
