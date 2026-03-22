# Concept Pilot Landing Page Update Plan

## Goal Description
Update the Hero section of the main landing page (`frontend/app/page.tsx`) to implement a highly animated, centered design with a sweeping background line animation and a letter-by-letter animated title. Everything below the hero (features, "how it works", footer) remains untouched.

## Design Constraints
- **Color Scheme:** Blue (`--michigan-blue` / `--primary`) background, white text, yellow (`--maize` / `--accent`) for accents and animations.
- **Top Section Only:** Replace ONLY the current `{/* Hero */}` block. Everything from "Two experiences, one platform" and below is preserved as-is.
- **Nav Bar (preserve):** The existing `{/* Nav */}` section with the ConceptPilot logo in the top-left must be kept as-is. It already uses `bg-primary text-white`, so it visually merges with the new blue hero background seamlessly — no changes needed.
- **Background:** The hero background is solid Michigan Blue, with animated streaking lines layered behind the content. The `<WaveDivider>` bridges the hero into the warm-white features section below.

---

## Step-by-Step Implementation

### 1. Dependencies — None Required
- **Framer Motion (`motion` v12)** is already installed and will be used for all animations.
- **No new packages needed.** Do NOT install GSAP — it would duplicate animation capabilities.

### 2. Component: `SplitText`
- **File:** `frontend/components/animations/SplitText.tsx` (new client component)
- **Purpose:** Splits a text string into individual `<span>` elements per character and staggers their entrance with Framer Motion.
- **Props:** `text: string`, `className?: string`, `delay?: number`
- **Behavior:**
  - Wrap each character in a `<motion.span>` with `initial={{ opacity: 0, y: 20 }}` and `animate={{ opacity: 1, y: 0 }}`.
  - Stagger each character by ~0.04s using `transition.delay` offsets.
  - Respect `prefers-reduced-motion` — skip animation and render immediately when the user prefers reduced motion.
- **Must include `'use client'`** at the top (Next.js App Router requirement for hooks/animations).

### 3. Component: `StreakingLines`
- **File:** `frontend/components/animations/StreakingLines.tsx` (new client component)
- **Purpose:** Renders an absolutely-positioned SVG with 4–6 curved bezier paths that sweep from the left edge toward the bottom-right.
- **Colors:** Yellow (`var(--maize)`) and light-blue (`var(--blue-tint)`) strokes at low opacity (0.15–0.3) so they remain subtle against the blue background.
- **Animation:** Use Framer Motion's `motion.path` with `pathLength` to animate `stroke-dashoffset` from full to zero, creating a drawing/streaking effect. Stagger each line by ~0.3s, total duration ~2s.
- **Accessibility:** Wrap in `<svg aria-hidden="true">` since it's purely decorative. Respect `prefers-reduced-motion`.
- **Must include `'use client'`**.

### 4. Page Integration (`frontend/app/page.tsx`)
- **Modification Zone:** Replace the `{/* Hero */}` section (the `<div>` block between the `{/* Nav */}` and `{/* Features */}` sections). Do NOT use line numbers — identify the block by its comment markers.
- **New Hero Construction:**
  - **Container:** `<div className="relative bg-primary overflow-hidden">` — solid Michigan Blue background.
  - **Inner layout:** `<div className="relative min-h-[85vh] flex flex-col items-center justify-center px-6 pt-20 pb-24">`.
  - **Background layer:** Render `<StreakingLines />` with `className="absolute inset-0 z-0"`.
  - **Title (z-10, centered):**
    - `<SplitText text="ConceptPilot" className="text-6xl md:text-8xl lg:text-9xl font-extrabold text-white tracking-tight" />`
    - Below the title, a yellow accent bar or underline (`<div className="h-1.5 w-32 bg-accent rounded-full mx-auto mt-4 mb-6" />`).
  - **Tagline:** `<p className="text-lg md:text-xl text-white/70 max-w-2xl text-center mb-10">` with the existing copy: "Upload exam data, map concepts, and get explainable readiness analytics — for instructors and students alike."
  - **Buttons (flex row, centered):**
    - **Instructor button:** Filled yellow background, dark blue text. `bg-accent text-primary font-semibold px-7 py-3 rounded-full hover:shadow-lg hover:scale-[1.02] transition-all`
    - **Student button:** Outlined white on blue. `border-2 border-white text-white font-semibold px-7 py-3 rounded-full hover:bg-white/10 transition-all`
    - Both use existing `<Link>` destinations (`/dashboard` and `/student`) and icons (`ShieldCheck`, `GraduationCap`).
  - **Wave divider:** Keep `<WaveDivider fill="var(--background)" />` at the bottom of the hero to transition into the warm-white features section.
- **`'use client'` note:** Since the page itself imports animated client components, the page can remain a server component — the `SplitText` and `StreakingLines` components handle their own `'use client'` directives.

### 5. Accessibility
- All animations respect `prefers-reduced-motion` (already handled in `theme.css` for CSS animations; Framer Motion components should check `useReducedMotion()`).
- Decorative SVG elements use `aria-hidden="true"`.
- Button contrast ratios: yellow (`#FFCB05`) on blue (`#00274C`) passes WCAG AA for large text; white on blue passes AAA.
