Sample CSVs for ConceptPilot uploads (same column rules as the live API).

Instructor: use material/instructor/ with POST /api/v1/exams/{exam_id}/scores and /mapping (or the app upload UI).
Student workspace: use material/student/ with POST /api/v1/student/scores and /mapping. The student API normalizes all rows to your workspace learner id.

Typical order: scores CSV first, then mapping CSV, then upload or draw a concept graph, then run compute.

Columns:
- scores: StudentID, QuestionID, Score, MaxScore (MaxScore optional in some flows; include it for clarity)
- mapping: QuestionID, ConceptID, Weight (question ids must match scores)

Included samples:
- Instructor scores: multiple learners (s001–s008) and eight questions (q1–q8).
- Mapping: several concepts per question with weights that sum to 1.0 per question (algorithms / DS example).
- Student scores: one learner column (any id; the API replaces with the workspace id) and the same q1–q8 rows.
- Student mapping: same structure as instructor mapping; QuestionIDs must match the scores file.
