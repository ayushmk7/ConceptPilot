# Concept Pilot Landing Page Update Plan

## Goal Description
Update the Hero section of the main landing page (`frontend/app/page.tsx`) to implement a highly animated, centered design. Everything below the hero (features, "how it works", footer) remains untouched. The background will feature an advanced looping "streaking line" animation with trailing effects.

## Design Constraints
- **Color Scheme:** Blue (`--michigan-blue` / `--primary`) background, white text, yellow (`--maize` / `--accent`) for accents and animations.
- **Top Section Only:** Replace ONLY the `{/* Hero */}` block. Everything from "Two experiences, one platform" and below is preserved as-is.
- **Nav Bar (preserve):** The existing `{/* Nav */}` section with the ConceptPilot logo in the top-left is kept as-is. It uses `bg-primary text-white`, so it visually merges with the blue hero background seamlessly.
- **Background:** The hero background is solid Michigan Blue, with animated streaking lines layered behind the content. The `<WaveDivider>` bridges the hero into the warm-white features section below.

---

## Step-by-Step Implementation

### 1. Dependencies — None Required
- **Framer Motion (`motion` v12.23.24)** is already installed and will be used for all animations.
- **No new packages needed.** Do NOT install GSAP — it would duplicate animation capabilities already provided by Framer Motion.

### 2. Component: `SplitText`
- **File:** `frontend/components/animations/SplitText.tsx` (client component, already implemented)
- **Purpose:** Splits a text string into individual `<span>` elements per character and staggers their entrance with Framer Motion.
- **Props:** `text: string`, `className?: string`, `delay?: number`
- **Behavior:**
  - Wrap each character in a `<motion.span>` with `initial={{ opacity: 0, y: 20 }}` and `animate={{ opacity: 1, y: 0 }}`.
  - Stagger each character by ~0.04s using `transition.delay` offsets.
  - Respect `prefers-reduced-motion` via Framer Motion's `useReducedMotion()`.
- **Includes `'use client'`** at the top (Next.js App Router requirement).

### 3. Component: `StreakingLines`
- **File:** `frontend/components/animations/StreakingLines.tsx` (client component)
- **Purpose:** Draw and animate curved paths sweeping from the left edge toward the bottom-right.
- **Animation Requirements:**
  1. **Trailing Effect:** Lines appear as short glowing segments that fly across each path, not a simple full-path draw. Achieved using CSS `stroke-dasharray` (short visible segment + long gap) and animating `stroke-dashoffset` via Framer Motion's `animate` prop.
  2. **Propagation:** Starts with one line, then progressively more lines spawn and streak across the screen. Stagger their start times and speeds.
  3. **Looping:** The animation runs in a continuous infinite loop using Framer Motion's `transition.repeat: Infinity` and `transition.repeatType: "reverse"` (yoyo behavior).
- **Colors:** Yellow (`var(--maize)`) and light-blue (`var(--blue-tint)`) strokes at varying opacity so they remain visible but don't overpower the title text on the blue background.
- **Accessibility:** Wrap in `<svg aria-hidden="true">`. Respect `prefers-reduced-motion` — skip animation when the user prefers reduced motion.
- **Includes `'use client'`**.

### 4. Page Integration (`frontend/app/page.tsx`)
- **Modification Zone:** The `{/* Hero */}` section (between `{/* Nav */}` and `{/* Features */}`). Identify by comment markers, not line numbers.
- **Current Hero (already implemented):**
  - **Container:** `<div className="relative bg-primary overflow-hidden">` — solid Michigan Blue background.
  - **Inner layout:** `<div className="relative z-10 min-h-[85vh] flex flex-col items-center justify-center px-6 pt-20 pb-24 text-center">`.
  - **Background layer:** `<StreakingLines />` with `className="absolute inset-0 z-0 w-full h-full"`.
  - **Title:** `<SplitText text="ConceptPilot" className="text-6xl md:text-8xl lg:text-9xl font-extrabold text-white tracking-tight" />`
  - **Accent bar:** `<div className="h-1.5 w-32 bg-accent rounded-full mx-auto mt-4 mb-6" />`
  - **Tagline:** White/70 paragraph with existing copy.
  - **Buttons:**
    - **Instructor button:** Filled yellow bg, dark blue text (`bg-accent text-primary`), pill shape.
    - **Student button:** White outlined on blue (`border-2 border-white text-white`), pill shape.
    - Both use `<Link>` to `/dashboard` and `/student` with `ShieldCheck` and `GraduationCap` icons.
  - **Wave divider:** `<WaveDivider fill="var(--background)" />` at the bottom.
- **`'use client'` note:** The page remains a server component — `SplitText` and `StreakingLines` handle their own client directives.

### 5. Accessibility
- All animations respect `prefers-reduced-motion` (Framer Motion components use `useReducedMotion()`).
- Decorative SVG elements use `aria-hidden="true"`.
- Button contrast ratios: yellow (`#FFCB05`) on blue (`#00274C`) passes WCAG AA for large text; white on blue passes AAA.
