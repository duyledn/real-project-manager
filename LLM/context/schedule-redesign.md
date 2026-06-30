# Context — Schedule Page Redesign + Sidebar Max-Height Fix

## Request
User supplied a reference image (a Gantt-style "Schedule" screen: cream
sidebar with rounded nav pills, a card-style timeline panel with a search bar
and "+ Add phase" button in its header, a month-ruler row, and large rounded
horizontal bars per phase with the date-range printed inside each bar) and
asked for two things:

1. Cap the sidebar's height at the screen height (it currently can grow
   taller than the viewport).
2. Redesign the project's Scheduling page to match that image's layout,
   typography, and color treatment.

## Decisions (asked the user directly, both resolved)

1. **Color palette: keep the app's existing green accent**, not the image's
   orange/terracotta. The user chose this explicitly over exact image-color
   matching. Only layout, spacing, density, and typography should mirror the
   image — the "+ Add phase" button and the timeline's "today" marker stay in
   `var(--accent)` (currently evergreen, `#1F8A5B` light / `#43B179` dark),
   not a new orange. The per-phase bar colors mostly fall out of the
   **existing** status-color system already, see below — no new palette
   needed there.
2. **"+ Add phase" is a real inline quick-add**, not just a link to Jobs &
   Bids. It must write into the same `project.jobs` array Jobs & Bids reads
   from (same `Job` shape, same `setProject` autosave path used everywhere
   else in this app) so a phase added here shows up on Jobs & Bids
   immediately, and vice versa — they are the same underlying data, not a
   separate "phases" concept.

## Why this is lower-risk than it looks
"Phases" in the reference image are exactly the app's existing `Job` records
(`src/lib/types.ts` → `Job`). The Schedule page already renders jobs as a
Gantt timeline via `JobTimeline` (`src/components/JobTimeline.tsx`) — it's
just rendered on an HTML `<canvas>` today (small JetBrains Mono labels, thin
36px rows), which looks nothing like the image's larger DOM-styled rounded
pill bars. This task is a **visual/markup rewrite of how jobs are rendered**,
not a new data model or new page.

The existing per-status bar palette in `JobTimeline.tsx` (`statusFill()`) is
already a "warm estate" palette that's close to the image's bar colors:
amber `#DFA258`, terracotta `#C65D3B`, teal `#5E8C9E`, green `#5AA15E`, deep
green `#3F7E54`. That's reusable as-is — the image's mixed bar colors come
from variety in status/custom-color, not from a palette we need to invent.

## Current relevant files
- `src/app/projects/[id]/layout.tsx` — `ShellChrome`: renders the `<aside>`
  sidebar (`w-[244px] ... self-stretch`) and `<main>` side by side in a
  `flex items-start` row inside a `max-w-[1240px] mx-auto px-4 sm:px-6 py-5`
  wrapper. `self-stretch` lets the sidebar grow to match `<main>`'s height
  with no cap — that's the bug.
- `src/app/projects/[id]/scheduling/page.tsx` — the Scheduling page. Current
  header is an intro paragraph + an "Expand" button; no search, no add
  button. Renders `<JobTimeline>`.
- `src/components/JobTimeline.tsx` — canvas-based Gantt renderer. Pulls
  colors from CSS vars at draw time (`getComputedStyle`) so it already
  respects the active theme/accent.
- `src/app/projects/[id]/manage/page.tsx` — Jobs & Bids page. `addJob()`
  (line ~93) is the canonical "create a job" logic: defaults `category` to
  `categories[0]`, `startDate` to the project's start date (or today),
  `status: "N/A"`, empty bidders. Uses `useJobCategories()` for the
  category list. The inline quick-add on Schedule should mirror this, not
  invent new defaults.
- `src/app/globals.css` — design tokens: `--accent` (green), `.panel`
  (26px/20px rounded glass card), `.btn` / `.btn-blue`, fonts: "Plus Jakarta
  Sans" (UI text) + "JetBrains Mono" (`label-mono`, figures).

## Out of scope
- No change to the Jobs & Bids page itself, beyond the shared `project.jobs`
  data both pages already read/write.
- No new accent color token. No new bar-color palette.
- Not touching the shared top header (kicker/title) rendered by `ShellChrome`
  beyond a one-word label change ("Scheduling" → "Schedule") to match the
  image and the sidebar nav label.
