# PreReq -- Figma Design Prompt

## Design Brief

Design a complete frontend for **PreReq**, an AI-assisted concept readiness and study platform for universities. The product has two major surfaces: (1) an instructor-facing analytics dashboard for exam readiness data, and (2) a student-facing Infinite Canvas where AI conversations, documents, and study materials live as spatial nodes on a zoomable workspace.

The design should be **softly UMich-themed**. This does not mean slapping the Michigan logo everywhere. It means the color palette, typography weight, and overall feel should evoke the University of Michigan's identity without being an official branded product.

---

## Color System

### Primary Palette (derived from UMich)

- **Maize (primary accent):** #FFCB05 -- used sparingly for primary CTAs, active states, selected items, progress indicators, and key highlights. Not for large background fills.
- **Michigan Blue (primary brand):** #00274C -- used for the top nav bar, sidebar backgrounds, headings, and primary text on light backgrounds.
- **Blue tint (softer blue):** #1B365D -- used for secondary containers, card headers, hover states on nav items, and graph edges.
- **Light blue wash:** #E8EEF4 -- used for page backgrounds, card backgrounds on white surfaces, and subtle section dividers.
- **Warm white:** #FAFBFC -- main content area background.
- **Pure white:** #FFFFFF -- card surfaces, input fields, chat message bubbles (assistant).

### Neutral Palette

- **Dark text:** #1A1A2E -- primary body text.
- **Secondary text:** #4A5568 -- labels, descriptions, secondary information.
- **Muted text:** #94A3B8 -- timestamps, placeholder text, disabled states.
- **Border light:** #E2E8F0 -- card borders, dividers, input borders.
- **Border medium:** #CBD5E1 -- active input borders, table borders.

### Semantic Colors

- **Success/strong readiness:** #16A34A (green)
- **Warning/medium readiness:** #F59E0B (amber, close to maize but distinct)
- **Danger/weak readiness:** #DC2626 (red)
- **Info:** #3B82F6 (blue, distinct from Michigan Blue)

### Readiness Heatmap Scale

Use a 5-step scale for readiness values [0, 1]:
- 0.0 - 0.2: #DC2626 (red)
- 0.2 - 0.4: #F97316 (orange)
- 0.4 - 0.6: #F59E0B (amber)
- 0.6 - 0.8: #22C55E (green)
- 0.8 - 1.0: #16A34A (dark green)

### Dark Mode Consideration

Not required for initial design. If included, invert the background to #0F172A, use Michigan Blue (#00274C) as card backgrounds, maize (#FFCB05) stays as accent, and lighten text to #E2E8F0.

---

## Typography

- **Headings:** Inter or IBM Plex Sans, semibold (600). Sizes: H1 28px, H2 22px, H3 18px, H4 16px.
- **Body:** Inter or IBM Plex Sans, regular (400), 14-15px. Line height 1.5.
- **Small/labels:** 12-13px, medium (500), secondary text color.
- **Code/monospace:** JetBrains Mono or Fira Code, 13px.
- **Math/LaTeX:** rendered inline, same size as surrounding body text.

Do not use decorative or serif fonts. The feel should be clean, technical, and readable. Slightly more engineering-tool than consumer-app.

---

## Spacing and Layout

- **Base unit:** 4px grid.
- **Component padding:** 12-16px internal padding on cards. 8px between stacked elements.
- **Page margins:** 24-32px on desktop.
- **Card border radius:** 8px.
- **Button border radius:** 6px.
- **Input border radius:** 6px.
- **Shadows:** subtle. Cards use `0 1px 3px rgba(0,0,0,0.06)`. Elevated elements (modals, dropdowns) use `0 4px 12px rgba(0,0,0,0.1)`.
- **Max content width:** 1280px for dashboard pages. Canvas pages are full-viewport.

---

## Global Components

### Top Navigation Bar

- Background: Michigan Blue (#00274C).
- Height: 56px.
- Left: "PreReq" wordmark in white, no logo. Clean sans-serif.
- Center or left-aligned: navigation links (Dashboard, Canvas, Reports, Upload). White text, 14px medium. Active link has a maize (#FFCB05) underline, 2px thick.
- Right: course/exam selector dropdown (compact, white text, subtle border), and a user avatar circle or initials badge.
- The nav bar is persistent across all instructor pages.

### Sidebar (Instructor Pages)

- Width: 240px, collapsible to 56px (icon-only).
- Background: #F1F5F9 (very light gray-blue).
- Sections: Courses list, Exam list (nested under selected course), Quick links (Dashboard, Upload, Reports, AI Suggestions, Exports, Chat).
- Selected item: light maize background tint (#FFF8E1) with Michigan Blue text.
- Hover: light blue wash (#E8EEF4).
- Collapse button at the bottom.

### Buttons

- **Primary:** Michigan Blue (#00274C) background, white text. Hover darkens slightly. Active state has maize underline or ring.
- **Secondary:** white background, Michigan Blue border and text. Hover fills with light blue wash.
- **Accent/CTA:** Maize (#FFCB05) background, Michigan Blue text. Use for the single most important action on a page (e.g., "Run Compute", "Generate Report", "Create Branch"). Only one per view.
- **Destructive:** red border and text on white. Hover fills red with white text.
- **Ghost:** no border, Michigan Blue text. Used in toolbars and inline actions.
- Height: 36px standard, 32px compact, 40px large.
- Padding: 12px horizontal minimum.

### Cards

- Background: white.
- Border: 1px solid #E2E8F0.
- Border radius: 8px.
- Padding: 16px.
- Shadow: `0 1px 3px rgba(0,0,0,0.06)`.
- Header area: optional, Michigan Blue text, 16px semibold.

### Form Inputs

- Height: 36px.
- Border: 1px solid #CBD5E1. Focus: 2px solid Michigan Blue.
- Background: white.
- Placeholder text: #94A3B8.
- Label: 13px medium, #4A5568, above the input with 4px gap.
- Error state: red border, red helper text below.

### Tooltips

- Background: #1A1A2E.
- Text: white, 12px.
- Border radius: 4px.
- Arrow pointing to trigger.
- Max width: 240px.

### Modals

- Centered, max width 520px for standard, 720px for large.
- Background: white, border radius 12px.
- Overlay: black at 40% opacity.
- Header: 18px semibold, Michigan Blue.
- Footer: right-aligned buttons (secondary left, primary right).

### Toast/Notifications

- Bottom-right position, stacked.
- Background: white, left border 3px in semantic color (green for success, red for error, amber for warning, blue for info).
- Auto-dismiss after 5 seconds. Dismissible via X.

---

## Page Designs

### 1. Landing Page

**Purpose:** Entry point for instructors. Orients them to the product.

**Layout:**
- Full-width hero section. Light blue wash background (#E8EEF4). Centered text.
- Headline: "Understand what your students are ready for." 32px semibold, Michigan Blue.
- Subhead: "Upload exam data, map concepts, and get explainable readiness analytics powered by AI." 16px regular, secondary text.
- Primary CTA button: "Get Started" in maize.
- Below the hero: 3 feature cards in a row. Icons (simple line icons, not filled). Card titles: "Concept Readiness", "AI-Assisted Setup", "Student Reports". Brief descriptions below each.
- Footer: minimal, links to docs and contact.

---

### 2. Upload Wizard

**Purpose:** Step-by-step setup for an exam.

**Layout:**
- Stepper/progress bar at the top. 5 steps: Course & Exam, Scores, Mapping, Graph, Parameters & Compute.
- Each step is a centered card (max width 640px) with the step content.
- Completed steps show a green checkmark. Current step is maize-highlighted. Future steps are gray.

**Step 1: Course & Exam**
- Two dropdowns: "Select Course" and "Select Exam". Each has a "+ Create New" option at the bottom of the dropdown.
- Creating new opens an inline text input that replaces the dropdown temporarily.

**Step 2: Scores Upload**
- Drag-and-drop zone: dashed border (#CBD5E1), 160px tall, centered icon (upload arrow) and text "Drop scores CSV here or click to browse."
- On upload: replace the drop zone with a summary card showing row count, student count, question count.
- If validation errors: a collapsible error list below the summary. Each error shows row number, column, and reason. Red left border on the error section.

**Step 3: Mapping Upload**
- Same drag-and-drop pattern.
- Summary shows concept count, mapped question count.
- Warning banner (amber left border) if unmapped questions exist.

**Step 4: Graph**
- Two options presented as radio cards (side by side): "Upload Graph File" and "Generate with AI."
- Upload: same drop zone.
- Generate: a button that triggers AI edge suggestions. Shows a loading spinner, then a preview of suggested edges that the instructor can accept/reject individually (checkbox list). "Apply Selected" button at the bottom.
- Below either option: a small interactive graph preview (concept nodes connected by edges). Nodes are circles with concept names, edges are directional arrows. Read-only at this stage.

**Step 5: Parameters & Compute**
- Parameter controls in a card. Each parameter is a labeled slider:
  - Alpha (weight on direct readiness): 0 to 1, default 0.5.
  - Beta (prerequisite penalty weight): 0 to 1, default 0.3.
  - Gamma (downstream boost weight): 0 to 1, default 0.2.
  - Threshold (weakness cutoff): 0 to 1, default 0.6.
  - K (cluster count): integer input, 2 to 10, default 3.
- Each slider has a short tooltip explanation.
- Below the parameters: "Run Compute" maize CTA button.
- On click: loading state with a progress message. On completion: "Compute complete. View Dashboard" link/button.

---

### 3. Instructor Dashboard

**Purpose:** Primary analytics surface after compute.

**Layout:**
- Top bar: course and exam selector dropdowns (compact, inline with the page header).
- Below: a grid layout, 2 or 3 columns depending on content.

**Section A: Readiness Heatmap (full width)**
- A table/grid where rows are concepts (sorted by topological order or alphabetical) and columns are readiness distribution buckets (0-0.2, 0.2-0.4, etc.).
- Each cell shows the count of students in that bucket for that concept. Cell background color matches the readiness heatmap scale.
- Clicking a concept name navigates to the root-cause trace for that concept.
- A small legend bar above the heatmap showing the color scale.

**Section B: Alerts Panel (left column, ~60% width)**
- Card titled "Foundational Alerts."
- List of weak foundational concepts. Each row shows: concept name, affected student count (bold), downstream reach count, severity bar (horizontal, colored by severity).
- Sorted by priority. Top 5-10 shown by default, "Show all" expands.

**Section C: Interventions (right column, ~40% width)**
- Card titled "Recommended Interventions."
- Ranked list. Each item: rank number, concept name, brief description (AI-drafted if available), and a tag showing affected count.
- Each item is clickable to expand and show the full recommendation.

**Section D: Clusters (full width, below)**
- Card titled "Student Clusters."
- K cards in a row (one per cluster). Each card shows: cluster label (or "Cluster 1", "Cluster 2"), student count, a small radar chart or bar chart showing the centroid's readiness per concept (top 5 concepts only for readability).

**Section E: Parameter Summary (compact, bottom or sidebar)**
- Small card showing current alpha, beta, gamma, threshold, k values with labels. "Edit" link that opens parameter editor modal.

---

### 4. Root-Cause Trace

**Purpose:** Drill-down on a single concept.

**Layout:**
- Page header: concept name (H2), breadcrumb back to dashboard.
- Left column (60%): waterfall chart.
  - Vertical bar chart showing the composition of final readiness for this concept.
  - Bars: Direct Readiness (blue), Prerequisite Penalty (red, negative direction), Downstream Boost (green), Final Readiness (Michigan Blue, full bar).
  - These are class-average values. A student selector dropdown above the chart can switch to an individual student's values.
- Right column (40%): context cards.
  - **Upstream Prerequisites card:** list of prerequisite concepts with their class-average readiness and color indicator. Weak ones highlighted with red text.
  - **Downstream Dependents card:** list of downstream concepts with readiness.
  - **Affected Students card:** count and list (scrollable) of students whose final readiness on this concept is below threshold.

---

### 5. Student Report (Tokenized Public View and Instructor-Selected View)

**Purpose:** Per-student readiness report. Non-punitive, actionable.

**Layout:**
- No sidebar. Clean single-column centered layout, max width 800px.
- Header: "Your Readiness Report" in Michigan Blue. Exam name and student identifier below.
- **Concept Graph:** interactive visualization. Nodes are circles sized by readiness (or all same size, colored by readiness heatmap scale). Edges are prerequisite arrows. Layout: top-to-bottom or left-to-right DAG layout. Powered by React Flow or similar.
- **Readiness Breakdown:** a table or list of all concepts. Columns: Concept Name, Readiness (bar + number), Confidence (badge: green/amber/gray for high/medium/low). Sorted by readiness ascending (weakest first).
- **Top Weak Concepts:** highlighted card listing the top 3-5 weakest concepts with brief explanations. Each concept shows its readiness value and confidence.
- **Study Plan:** ordered list. Each item is a concept to study, ordered by prerequisites (foundations first). Each item shows: step number, concept name, readiness value, and a one-line explanation of why it matters. The ordering ensures the student works on prerequisite concepts before downstream ones.
- **Study Resources:** if generated study content exists, show links/buttons: "Listen to Audio Summary", "View Presentation", "Watch Walkthrough". Each opens the study content player.
- **Contact:** card at the bottom with instructor/TA name and contact method.
- **Tone note:** no rankings, no percentiles, no comparisons. Language is supportive. Example: "Focusing on Linear Algebra Basics first will help strengthen your understanding of the concepts that depend on it."

---

### 6. Infinite Canvas

**Purpose:** Spatial workspace for AI-assisted studying.

**Layout:**
- Full viewport. No sidebar. Minimal chrome.
- **Top toolbar:** floating bar at the top center. Contains: project title (editable), "+" dropdown (Add Chat, Add from File), "Generate Study Content" button, "Summary" button, "Export" button, settings gear icon. Background: white with subtle shadow. Pill-shaped, border radius 24px.
- **Canvas background:** light dot grid on warm white (#FAFBFC). Dots are #E2E8F0, spaced 20px apart.
- **Minimap:** bottom-right corner, 160x100px thumbnail of the full canvas. Semi-transparent background.
- **Zoom controls:** bottom-right, above minimap. +/- buttons and a fit-to-view button.
- **Active users:** top-right corner, row of avatar circles for connected users. Each shows initials and display name on hover.

**Chat Node (Expanded):**
- Card: white background, 400x500px default, resizable. Border radius 8px. Shadow: `0 2px 8px rgba(0,0,0,0.08)`.
- **Header bar:** 40px tall. Michigan Blue background, white text. Shows: node title (editable), skill badge (small pill, e.g., "Tutor" in maize on dark), collapse button (chevron), more-actions menu (three dots).
- **Skill selector:** clicking the skill badge opens a dropdown overlay listing available skills. Each skill shows name and one-line description. Selected skill has a checkmark.
- **Message area:** scrollable, takes up most of the card. Messages alternate sides:
  - User messages: right-aligned, light maize background (#FFF8E1), rounded corners (12px, sharp bottom-right).
  - Assistant messages: left-aligned, white background with light border, rounded corners (12px, sharp bottom-left).
  - System messages: centered, small text, gray background pill.
  - Code blocks: dark background (#1E293B), syntax-highlighted, with a copy button.
  - LaTeX: rendered inline.
  - Tool use indicators: small gray pill showing "Generating quiz..." or "Creating branches..." with a spinner.
- **Input area:** bottom of the card. Text input (full width, 36px height), send button (Michigan Blue circle with white arrow icon). Above the input: a thin context usage bar (green/yellow/red gradient based on estimated context window fill).
- **Branch button:** in the header or as a floating action. When active, each message gets a checkbox on the left. A floating action bar appears at the bottom: "Create Branch" button (maize) and "Cancel" text button.

**Chat Node (Collapsed):**
- Pill shape, approximately 140x52px.
- Shows: skill icon (left), node title (truncated), message count badge (right, small circle with number).
- If locked by another user: lock icon and their display name in small text below.
- Border: 1px solid #E2E8F0. On hover: blue tint border.

**Image Node (Expanded):**
- Card: white background, image fills the card with 8px padding. Default 300x300px, resizable.
- Below image: filename and dimensions in small text.
- Header: thin bar with title and collapse button.

**Image Node (Collapsed):**
- 64x64px square with rounded corners. Shows thumbnail of the image. Filename below in 11px text.

**Document Node (Expanded):**
- Card: white background, 350x450px default.
- Header: file icon, filename, page count.
- Body: scrollable preview. For PDFs: rendered pages. For text files: monospace text.
- Collapse button in header.

**Document Node (Collapsed):**
- 100x52px rectangle. File icon, filename (truncated), page count badge.

**Artifact Node (Expanded):**
- Card: white background, 360x400px default.
- Header: artifact type icon (code, diagram, math, flashcard), title, collapse button.
- Body: rendered content. Code gets syntax highlighting. Diagrams render. LaTeX renders. Flashcards show a flippable card interface.

**Artifact Node (Collapsed):**
- 120x64px. Type icon, title, small preview snippet.

**Edges:**
- Curved bezier lines with a small directional arrowhead at the target.
- Default color: #CBD5E1 (light gray).
- When a chat node is actively being used (user is typing or streaming): inbound edges glow Michigan Blue.
- Edge handles: small circles (8px diameter) on node borders. Appear on hover. Drag from one handle to another to create an edge.

**Drag-and-drop file upload:**
- Dragging a file over the canvas shows a full-canvas overlay: dashed border, "Drop to add to canvas" text, semi-transparent maize background (#FFCB0520).
- On drop: file node appears at the drop position with a brief scale-up animation.

**AI Auto-Branch Animation:**
- When Claude creates branches, the new nodes expand outward from the parent in a fan animation (200ms ease-out). Edges draw in with a path-tracing animation.

**Multiplayer indicators:**
- Each connected user has a small colored dot (assigned randomly from a set of 8 distinct colors, not from the main palette).
- When a user selects/hovers a node, a colored ring appears around that node matching their dot color.
- Lock state: locked chat nodes show a lock icon and the holder's name in a small badge below the node.

---

### 7. Study Content Player

**Purpose:** Playback for generated audio, presentations, and video walkthroughs.

**Layout option A: Overlay within canvas.**
- Opens as a large modal (80% viewport width and height) overlaying the canvas.
- Close button top-right.

**Layout option B: Dedicated page.**
- Full-page, centered layout, max width 960px.

**Audio Player:**
- Card at the top: waveform visualization (simple bar visualization, Michigan Blue bars). Play/pause button (large, centered, maize), scrub bar below, current time / total time, speed selector (0.75x, 1x, 1.25x, 1.5x, 2x).
- Below the player: transcript panel. Scrollable text. The currently-playing section is highlighted with a light maize background. Clicking a transcript section jumps the audio to that point.

**Slide Viewer:**
- Full-width slide display area. Current slide rendered large.
- Below: thumbnail strip showing all slides. Current slide thumbnail has a maize border.
- Left/right arrows to navigate. Slide counter "3 / 12".
- Each slide can contain: title (H3), body text, bullet points, and a concept graph fragment (small node-edge diagram).

**Video Walkthrough (Synchronized Slides + Audio):**
- Top: slide display area (same as slide viewer).
- Bottom: audio controls (same as audio player, but without the transcript panel taking full space).
- Transcript appears as a collapsible side panel or below the audio controls.
- Slides auto-advance when the audio segment for the current slide ends. A thin progress bar on the current slide thumbnail shows how far through that slide's audio the playback is.

---

### 8. Instructor Chat Assistant

**Purpose:** Persistent AI assistant for operational questions.

**Layout:**
- Slide-in panel from the right side of the screen. Width: 400px. Can be toggled open/closed via a floating button (bottom-right corner, Michigan Blue circle with a chat bubble icon).
- Or: dedicated full-page chat at /chat.

**Panel design:**
- Header: "AI Assistant" in Michigan Blue, 16px semibold. Close button (X).
- Message area: same styling as canvas chat nodes. User messages right, assistant messages left. Markdown, code, and tables rendered.
- Tool use: when Claude uses a tool (e.g., fetching readiness data), a small collapsible card appears inline: "Fetched readiness for EECS 280 Midterm" with a disclosure triangle to see the raw data.
- Input: text input at the bottom with send button.
- Context: a small badge below the input showing the currently-selected exam context. Clickable to change.

---

### 9. AI Suggestions Review Page

**Purpose:** Instructor reviews AI-generated suggestions before they are applied.

**Layout:**
- Table or card list. Columns: Type (concept tags / edges / expansion / intervention), Created date, Status (pending / accepted / rejected / applied), Preview.
- Each row is expandable. Expanding shows the full suggestion payload.
- Action buttons per suggestion: "Accept", "Reject". Optionally a notes field.
- For edge suggestions: show a mini graph preview of the proposed edges overlaid on the existing graph. Proposed edges in dashed maize lines.
- For concept tag suggestions: show question text with proposed tags as removable pills.
- Bulk actions: "Accept All", "Reject All" at the top.

---

## Component State Reference

### Loading States
- Skeleton loaders for cards and tables: light gray (#F1F5F9) pulsing rectangles matching the expected content layout.
- Spinner for action buttons: small circular spinner replacing the button text.
- Full-page loading: centered spinner with "Loading..." text below.

### Empty States
- Centered illustration or icon (line-style, Michigan Blue) with descriptive text and a CTA.
- Example: empty dashboard shows a graph icon and "No compute results yet. Upload exam data and run compute to see readiness analytics." with a "Go to Upload" button.

### Error States
- Inline errors: red border on the relevant component, red helper text below.
- Page-level errors: centered error card with a red icon, error message, and retry button.
- Toast for transient errors.

### Hover States
- Buttons: slight darken (primary) or fill (secondary).
- Cards: border color shifts to blue tint (#1B365D).
- Table rows: light blue wash background (#E8EEF4).
- Nav items: underline appears (maize for top nav, blue tint for sidebar).

### Focus States
- Inputs: 2px Michigan Blue ring.
- Buttons: 2px maize ring offset by 2px.
- Interactive nodes on canvas: 2px maize border.

---

## Responsive Notes

Desktop-first. Target 1280px+ viewport. Canvas page is full-viewport and not responsive (desktop only for initial release). Dashboard and report pages should collapse gracefully to single-column at 768px.

---

## Iconography

Use a consistent line-icon set (Lucide icons recommended). 20px default size. Michigan Blue or secondary text color. Do not use filled icons except for active/selected states.

---

## Animation Guidelines

- Page transitions: fade (150ms ease).
- Card appear: scale from 0.97 to 1 + fade (200ms ease-out).
- Canvas node creation: scale from 0 to 1 (200ms ease-out) at the target position.
- Branch fan-out: nodes translate from parent position to target position (250ms ease-out) while scaling in.
- Edge drawing: path traces from source to target (200ms).
- Tooltip: fade in (100ms).
- Modal: fade overlay (150ms), modal slides up slightly and fades in (200ms ease-out).
- Keep all animations under 300ms. Nothing should feel slow or decorative.

---

## Summary of Pages to Design

1. **Landing Page** -- hero, feature cards, CTA.
2. **Upload Wizard** -- 5-step flow with file uploads, graph preview, parameter sliders, compute trigger.
3. **Instructor Dashboard** -- heatmap, alerts, interventions, clusters, parameter summary.
4. **Root-Cause Trace** -- waterfall chart, upstream/downstream cards, affected students.
5. **Student Report** -- concept graph, readiness breakdown, weak concepts, study plan, study resources, contact.
6. **Infinite Canvas** -- full-viewport workspace with chat/image/document/artifact nodes, edges, branching, toolbar, minimap, multiplayer indicators.
7. **Study Content Player** -- audio player with transcript, slide viewer, video walkthrough (synced slides + audio).
8. **Instructor Chat Assistant** -- slide-in panel or full page, tool use indicators.
9. **AI Suggestions Review** -- table/card list with expand, accept/reject, graph previews.

Each page should include designs for: default state, loading state, empty state, and at least one error state.