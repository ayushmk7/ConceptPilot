# PreReq — Product Overview PRD

**Version:** 2.0  
**Date:** March 2026  
**Status:** Active Development

---

## 1. What PreReq Is

PreReq is an AI-assisted concept readiness and study platform that combines two core ideas:

1. **Concept Readiness Engine** — A deterministic analytics system that takes exam scores, question-to-concept mappings, and a concept prerequisite graph, then computes per-student and per-class readiness estimates with explainable outputs. Instructors use this to identify foundational gaps, plan interventions, and generate student reports.

2. **Infinite Canvas** — An interactive spatial interface where conversations with Claude live as nodes on a zoomable, pannable canvas. Students and instructors can branch conversations, link context across nodes, upload documents and images, and visually explore how concepts connect. Multiple users can work on the same canvas simultaneously.

These two systems are unified under a single platform. The readiness engine powers the analytical backbone. The Infinite Canvas powers the learning and exploration interface. Students can upload their own materials for test preparation, and the platform can generate NotebookLM-style audio/video study content and presentations using ElevenLabs for voice synthesis.

---

## 2. The Problem

**For instructors:**
- Raw exam scores do not reveal *why* a student is struggling. A student may fail an advanced concept because they are missing a prerequisite, not because they lack understanding of the concept itself.
- Setting up concept graphs, tagging questions to concepts, and identifying intervention targets is tedious manual work.
- There is no good way to give students actionable, non-punitive feedback that says "here is what to study next and in what order."

**For students:**
- Traditional AI chat interfaces force a single thread. When studying photosynthesis and wanting to explore "light reactions" separately from "dark reactions," you have to start over, copy-paste, or scroll endlessly.
- Long conversations degrade AI response quality because irrelevant context fills the window.
- Students have no structured way to turn their study materials into organized, connected explorations.
- Supplemental study material (audio summaries, video walkthroughs, presentations) must be created manually or found externally.

**For both:**
- Existing tools treat AI as either a computation layer or a chat layer. PreReq treats it as both, with a clear boundary: the deterministic engine owns numeric correctness, and the AI layer assists with interpretation, authoring, and exploration.

---

## 3. Product Goals

### Primary Goals

- Give instructors a reliable, explainable view of class readiness by concept.
- Help instructors identify foundational gaps and high-impact interventions.
- Give students a non-punitive, actionable report explaining what to study next.
- Provide students with a spatial, branchable interface for AI-assisted studying.
- Allow students to upload their own study materials (notes, past exams, textbooks) and have the platform help them prepare for upcoming assessments.
- Generate supplemental study content: audio summaries via ElevenLabs, slide presentations, and structured study guides.
- Reduce instructor setup work with AI-assisted concept tagging, graph suggestion, graph expansion, and intervention drafting.
- Keep the core readiness pipeline deterministic, auditable, and testable.

### Non-Goals

- Replace instructor grading systems or generate final grades.
- Rank students against each other in student-facing views.
- Use demographic or protected-class data.
- Allow the AI to silently mutate instructional data without human review.
- Build a mobile-first interface (desktop-first for initial release).
- Implement user authentication beyond lightweight sessions for students and basic auth for instructors.

---

## 4. Users

### Instructor

Creates courses and exams. Uploads score files, mappings, and concept graphs. Tunes readiness parameters. Runs computation. Reviews dashboard analytics, alerts, interventions, clusters, and traces. Reviews AI suggestions before they are applied. Generates student reports and export bundles. Uses the AI chat assistant for operational questions.

### Student

Accesses individualized readiness reports via tokenized links or instructor-shared views. Uses the Infinite Canvas to study: uploading notes, past exams, and reference documents; branching conversations to explore subtopics; generating audio/video study material; and following AI-generated study plans ordered by prerequisites.

### Builder / Future LLM

Treats this document and the Technical PRD as the source of truth for terminology, workflows, domain rules, extension patterns, and system constraints.

---

## 5. Core Product Concepts

### Course
A top-level container. A course has many exams.

### Exam
An assessment instance within a course. Most data (scores, mappings, graphs, parameters, compute runs, suggestions, exports, reports) is scoped to an exam.

### Concept Graph
A directed acyclic graph (DAG) where nodes are concepts and directed edges represent prerequisite dependencies. An edge from A to B means "A should be understood before B."

### Readiness
A normalized value in [0, 1] representing estimated concept mastery after combining direct evidence, prerequisite weakness propagation, and downstream validation.

### Confidence
A categorical label (high, medium, low) indicating how much evidence supports a readiness estimate.

### Intervention
A ranked recommendation for instructor action based on weak concepts, student impact, and downstream dependency effects.

### Canvas
A spatial workspace. Each project (or exam context) corresponds to one canvas. Conversations, documents, images, and artifacts live as nodes on the canvas.

### Node
A discrete element on the canvas. Types: chat, image, document, artifact. Chat nodes are independent Claude conversations. Image and document nodes are uploaded files. Artifact nodes are Claude-generated structured outputs (code, diagrams, LaTeX, presentations, study guides).

### Edge (Canvas)
A directional link between two canvas nodes. An edge from Node A to Node B means "Node A's content is available as context when chatting in Node B."

### Branch
A new chat node spawned from selected messages in an existing chat node. The child carries only the selected context, not the full parent conversation.

### Skill
A system prompt template that modifies Claude's behavior for a specific chat node. Skills include Tutor, Socratic, Devil's Advocate, Code Coach, Study Buddy, and Research Assistant.

### Study Content Generation
The platform can produce supplemental study materials from canvas content and readiness data. This includes:
- **Audio summaries** — ElevenLabs-powered voice narration of concept explanations, study plans, and key takeaways.
- **Slide presentations** — Auto-generated presentation decks covering weak concepts, prerequisite chains, and study recommendations.
- **Video-style walkthroughs** — Audio narration synchronized with slide content, delivered as a playable experience similar to NotebookLM podcasts.

---

## 6. Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | Next.js 15, TypeScript, Bun | App framework and runtime |
| Canvas Engine | React Flow | Node graph with pan, zoom, minimap, custom nodes, edge connections |
| UI Components | shadcn/ui, Tailwind CSS | Chat interface, modals, controls, theming |
| Backend | FastAPI, Python 3.12, uv | API server, WebSocket handler, Claude proxy |
| AI | Anthropic API (Claude SDK) | Chat completions, tool use, vision, document processing, streaming |
| Voice | ElevenLabs API | Text-to-speech for audio study content |
| Database | PostgreSQL (Vultr managed or Neon serverless) | Conversation state, canvas state, readiness data, all persistence |
| Realtime | FastAPI WebSockets | Multiplayer event broadcasting, branch locking |
| Frontend Deploy | Vercel | Zero-config deployment from git |
| Backend Deploy | Railway | Auto-detect Python from pyproject.toml |
| Object Storage | Vultr Object Storage | File uploads, export artifacts, generated media |

---

## 7. End-to-End Workflows

### 7.1 Instructor Workflow

1. Create or select a course.
2. Create or select an exam.
3. Upload scores CSV.
4. Upload question-to-concept mapping CSV.
5. Upload or AI-generate a concept graph.
6. Configure analysis parameters (alpha, beta, gamma, threshold, k).
7. Run compute.
8. Review dashboard: readiness matrix, alerts, interventions, clusters, root-cause traces.
9. Generate student reports or export bundles.
10. Use AI chat assistant to investigate data, draft interventions, or refine mappings and graph structure.

### 7.2 Student Study Workflow (Infinite Canvas)

1. Access a canvas (either a shared project canvas or a personal study canvas linked to an exam).
2. View readiness report: concept graph, weak concepts, study plan.
3. Upload study materials: notes, past exams, textbook excerpts, images.
4. Open a chat node and select a skill (Tutor, Socratic, etc.).
5. Explore topics. Branch conversations to dive into subtopics without losing context.
6. Link uploaded documents and images to chat nodes for context-aware AI responses.
7. Request supplemental study content: audio summaries, slide presentations, video walkthroughs.
8. Use AI auto-branching when Claude detects multiple valid approaches to a problem.
9. Collaborate in real time with other students on a shared canvas.

### 7.3 Student Upload for Test Prep

1. Student opens their study canvas.
2. Drags and drops files onto the canvas: PDFs of past exams, lecture notes, textbook chapters, images of handwritten notes.
3. Files appear as document or image nodes on the canvas.
4. Student links these nodes to a chat node.
5. Claude can now read and reference the uploaded content.
6. Student asks Claude to generate practice questions, identify weak areas, create flashcards, or build a study plan based on the uploaded material.
7. If the student has a readiness report from the instructor, the AI cross-references uploaded materials with weak concepts to focus the study session.

### 7.4 Study Content Generation Workflow

1. Student or instructor requests study content generation from a canvas or exam context.
2. Backend assembles relevant content: chat histories, uploaded documents, readiness data, concept graph.
3. Claude generates structured study material: a text outline, key points, and explanations.
4. For audio content: the text is sent to ElevenLabs for voice synthesis. The result is stored and made playable in the canvas.
5. For presentations: Claude generates slide content as structured data. The backend produces a slide deck (or renders it in the canvas as an artifact node).
6. For video-style walkthroughs: slide content and audio narration are combined into a synchronized playback experience rendered in the frontend.

### 7.5 AI Suggestion Review Workflow

1. Instructor or system triggers an AI suggestion (concept tags, prerequisite edges, intervention drafts, graph expansion).
2. Claude generates suggestions via structured prompts with defined output schemas.
3. Suggestions are stored with metadata: model name, prompt version, request ID, review status.
4. Instructor reviews suggestions. Accepts, rejects, or modifies each one.
5. Accepted suggestions are applied. Graph edits still pass DAG validation. All changes are auditable.

---

## 8. Product Surfaces

### Landing Page
Entry point for instructors. Orients the user to the product and provides the path into course/exam setup.

### Upload Wizard
Course/exam selection, file upload (scores CSV, mapping CSV), parameter configuration, compute trigger. Surfaces upload validation errors clearly.

### Instructor Dashboard
Readiness matrix, aggregate metrics, alerts for weak foundational concepts, intervention rankings, cluster summaries. Provides access to root-cause trace views.

### Root-Cause Trace
Drill-down on a single concept: direct evidence, prerequisite penalty, downstream boost, final readiness composition, affected student count, waterfall visualization.

### Student Report
Per-student concept readiness. Concept graph visualization, readiness per concept, top weak concepts, confidence indicators, sequenced study plan, contact information for instructional support. No peer comparisons, no percentiles, no ranking.

### Infinite Canvas
The spatial workspace. Zoomable, pannable surface with chat nodes, image nodes, document nodes, and artifact nodes. Supports branching, edge linking, skill selection, multiplayer, and content generation.

### Chat Assistant
Persistent AI assistant for instructors. Tool-backed actions: list courses, list exams, retrieve students, read readiness data, check/update parameters, trigger compute, generate exports, surface intervention insights.

### Study Content Player
Embedded player for generated audio summaries and video-style walkthroughs. Slide viewer for generated presentations. Accessible from the canvas or from a student's report.

---

## 9. Readiness Computation Summary

The readiness engine takes normalized exam scores, question-to-concept mappings, and a concept prerequisite graph, then computes:

1. **Direct readiness** — weighted normalized performance on questions mapped to each concept.
2. **Prerequisite penalty** — penalty from prerequisite concepts whose direct readiness falls below the threshold.
3. **Downstream boost** — bounded positive support from downstream concept performance.
4. **Final readiness** — combination of direct readiness, prerequisite penalty, and downstream boost using alpha, beta, and gamma weights, clamped to [0, 1].
5. **Confidence** — derived from question count, point coverage, and variance. Conservative labeling to prevent overinterpretation.
6. **Class aggregates** — per-concept statistics across all students.
7. **Clusters** — groups of students with similar readiness profiles (for instructional planning, not labeling).
8. **Interventions** — ranked recommendations based on affected student count, downstream breadth, and weakness severity.

The computation is fully deterministic: same inputs and parameters always produce the same outputs. NaN/infinite values are sanitized. Sorted traversal is used where order matters. Clustering uses stable seeds.

---

## 10. Student Experience Principles

- Supportive, specific, and non-comparative.
- Readiness reports emphasize actionability: "here is what to study next and in what order."
- No class rank, percentiles, peer comparisons, or predictive risk labels framed as identity judgments.
- No demographic inference.
- Study content (audio, presentations) is framed as "here is a resource to help you" not "here is what you got wrong."

---

## 11. AI Principles

- AI is assistive, not authoritative. The deterministic engine owns numeric correctness.
- All AI suggestions require human review before application.
- AI outputs are structured JSON whenever feasible.
- Prompts are versioned. Returned metadata includes model, request ID, latency, and token usage.
- AI failures degrade gracefully. They never corrupt core data.
- Chat actions that mutate state map to explicit tools with real side effects, not free-form text claims.
- All Claude API calls use the Anthropic Python SDK. There is no OpenAI dependency anywhere in the system.

---

## 12. Multiplayer Summary

Each canvas project is a WebSocket room. Multiple students connect simultaneously. Events broadcast to all clients: node creation, node movement, node collapse/expand, edge creation/deletion, branch locking/unlocking, message completion. Branch locking ensures only one user can prompt in a given chat node at a time. Other users see the chat history in read-only mode with a lock indicator.

---

## 13. Deployment Overview

| Component | Platform | Notes |
|-----------|----------|-------|
| Frontend (Next.js) | Vercel | Zero-config, git-push deploy |
| Backend (FastAPI) | Railway | Auto-detect Python from pyproject.toml |
| Database (PostgreSQL) | Vultr Managed DB or Neon Serverless | Primary persistence |
| Object Storage | Vultr Object Storage | File uploads, exports, generated media |
| Voice Synthesis | ElevenLabs API | External service, API key managed via env |
| AI | Anthropic API | Claude, API key managed via env |

Local development uses Docker Compose or direct process management with environment variables for all service connections.

---

## 14. Roadmap Themes

- Harden student report reliability and student listing workflows.
- Build out Infinite Canvas with full branching, linking, and multiplayer.
- Implement student upload flow for test preparation materials.
- Build NotebookLM-style study content generation (audio, presentations, video walkthroughs).
- Improve graph authoring and AI-assisted graph evolution.
- Deepen export integrations.
- Mature async compute and worker deployment.
- Improve AI suggestion review UX.
- Make the chat assistant a reliable operational tool for instructors.
- Add canvas templates (Essay Planner, Lab Report, Study Map, Debate Prep).
- Implement canvas-wide summary generation.
- Add context size indicators to chat nodes.

---

## 15. Success Criteria

This product is successful if:

- An instructor can go from raw exam data to actionable readiness insights in under 15 minutes.
- A student can receive a report, understand what to study next, and begin an AI-assisted study session on the canvas without external tools.
- Generated study content (audio, slides) is accurate, focused on weak areas, and usable without instructor intervention.
- The readiness computation is deterministic and explainable at every step.
- A new engineer can understand the entire product from these two PRDs without reading the full codebase.
- A future LLM can extend the product by reading these PRDs without inventing assumptions.