# Coding LLM Handoff — Schedule Page Redesign + Sidebar Max-Height Fix

## Context
Read `LLM/context/schedule-redesign.md` first — it has the full rationale and
the two scope decisions the user already made. Summary: cap the project
sidebar's height at the viewport, and rebuild the Scheduling page's timeline
from an HTML `<canvas>` into DOM/CSS rounded bars matching a reference image
the user supplied, **keeping the app's existing green accent** (not the
image's orange) and adding a real inline "+ Add phase" quick-add that writes
into the same `project.jobs` array Jobs & Bids uses.

## Read These Files First
1. `LLM/context/schedule-redesign.md`
2. `src/app/projects/[id]/layout.tsx` — sidebar markup (`ShellChrome`)
3. `src/app/projects/[id]/scheduling/page.tsx` — current Scheduling page
4. `src/components/JobTimeline.tsx` — current canvas Gantt renderer
5. `src/app/projects/[id]/manage/page.tsx` — read `addJob()` (~line 93) and
   the `useJobCategories()` usage at the top — this is the canonical
   "create a job" pattern to mirror
6. `src/lib/types.ts` — `Job`, `JobStatus` shapes
7. `src/lib/defaults.ts` — `makeId()`
8. `src/app/globals.css` — design tokens (`--accent`, `.panel`, `.btn`,
   `.btn-blue`, fonts) and the `.panel-2`/popover styling pattern (see how
   the existing color-picker popover in `JobTimeline.tsx` is styled — reuse
   that same recipe for the new "Add phase" popover)

## Changes Required

### 1. Sidebar max-height — `src/app/projects/[id]/layout.tsx`
The `<aside>` (`w-[244px] ... self-stretch`, ~line 214) currently grows to
match `<main>`'s height with no cap, so on tall pages it can exceed the
viewport. Make it sticky and cap its height to the viewport, accounting for
the page wrapper's `py-5` (20px) top/bottom padding:
- Add `position: sticky`, `top: 20px` (matches `py-5`'s 20px).
- Add `maxHeight: "calc(100vh - 40px)"` (20px top + 20px bottom).
- Add `overflowY: "auto"` so the nav itself scrolls internally if it's ever
  taller than the available space, instead of pushing past the viewport.
- Keep everything else (`w-[244px]`, `shrink-0`, `p-[15px]`, `flex
  flex-col`, `borderRadius: 26`) unchanged.
- Verify on a project with a long Dashboard or Financials page (tall
  `<main>`) that the sidebar now stays pinned in view while the main panel
  scrolls past it, instead of stretching taller than the screen.

### 2. Rename "Scheduling" → "Schedule"
To match the reference image's label exactly, change the label in two
places in `layout.tsx`:
- The sidebar nav item: `{ key: "scheduling", label: "Scheduling", ... }` →
  `label: "Schedule"`.
- The screen title: `inScheduling ? { kicker: t("Timeline"), title:
  t("Scheduling") }` → `title: t("Schedule")`. Keep the kicker as
  `"Timeline"` (already matches the image's "TIMELINE" kicker).

### 3. Rebuild the timeline as DOM/CSS — `src/components/JobTimeline.tsx`
Replace the `<canvas>` rendering with a DOM-based layout. Keep the existing
exported signature (`jobs`, `selectedJobId`, `onSelect`, `onAddJob`,
`onColorChange` props) and keep all the color logic (`statusFill`,
`barColorOf`, `barTextOf`, `JOB_COLOR_PALETTE` picker) — only the rendering
mechanism changes, not the color rules.

**Switch typography for this component** from `JetBrains Mono` to the app's
default UI font (just drop the `font-family: MONO` overrides — inherit Plus
Jakarta Sans). The reference image uses a clean sans throughout, not a mono
font; this component is the only thing affected, nothing else in the app's
font usage changes.

**Structure** (rough sketch — adapt freely to existing component
conventions, this is not literal code to paste):
```
<div className="panel p-5 sm:p-6">
  {/* header row: was the "Schedule" label-mono + Add-job button */}
  <div className="flex items-center gap-3 mb-4">
    <SearchInput />            {/* rounded pill input, Search icon, "Search…" placeholder */}
    <AddPhaseButton />          {/* .btn-blue, Plus icon, "Add phase" — opens the quick-add popover */}
  </div>

  <div className="flex">
    <div style={{ width: LABEL_COL_W }} />   {/* spacer matching the label column below */}
    <MonthRuler domain={domain} />            {/* Mar  Apr  May  Jun  Jul  Aug, evenly spaced */}
  </div>

  <div className="relative">
    <TodayLine domain={domain} accentColor="var(--accent)" />  {/* full-height vertical line */}
    {jobs.map((job) => (
      <PhaseRow key={job.id} job={job}>
        <PhaseIcon category={job.category} />   {/* small lucide icon, see mapping below */}
        <span>{job.category}</span>
        <BarTrack>
          <Bar style={{ left: pctOf(start), width: pctOf(end-start), background: barColorOf(job) }}>
            {monthRangeLabel(job.startDate, job.endDate)}  {/* "Mar – Apr" */}
          </Bar>
        </BarTrack>
      </PhaseRow>
    ))}
  </div>
</div>
```

Sizing to roughly match the reference image's proportions: label column
~190px wide, row height ~52-56px (generous vertical spacing, image rows
have noticeably more breathing room than the old 36px canvas rows), bar
height ~36-40px, bar border-radius ~18-20px (fully rounded ends), bar text
~12.5px bold using `barTextOf(job)` for contrast.

**Icon per phase** — small `lucide-react` icon next to the category label.
Add a small lowercase-substring-keyed lookup (e.g. "framing"/"drywall" →
`Hammer`, "electric" → `Zap`, "plumb" → `Wrench`, "roof" → `Home`,
"cabinet" → `Archive`, "floor" → `Grid3x3`), falling back to a generic icon
(e.g. `Layers`) for anything unmatched — categories are free-text/global
(`useJobCategories`), so this must degrade gracefully, not hard-fail on an
unknown category.

**Date-range label format**: `"Mar – Apr"` style — short month name, start
to end, en dash. If `endDate` is empty, keep the existing milestone-diamond
behavior (or an equivalent simple "start only" treatment) rather than
inventing a new state — that path already exists, just needs a DOM
equivalent instead of a canvas diamond.

**Interactions to preserve exactly:**
- Clicking a row (outside the icon/swatch) calls `onSelect(job.id)` — opens
  the Jobs & Bids drawer, unchanged.
- Clicking the icon/swatch opens the existing color popover
  (`JOB_COLOR_PALETTE`, "Reset to status color") — same logic as today,
  just anchored to a DOM element's position instead of canvas coordinates.
- Hover/selected row highlight — reuse `var(--glass-2)` / `var(--accent-soft)`
  the same way the canvas version did via row striping.
- "Today" vertical line — keep using `var(--accent)` (green), not the
  image's orange. Per the user's decision, this page does not get a new
  accent color.

**Drop the bottom status legend.** The reference image has no legend strip;
remove it to match the cleaner look. (The status→color mapping is still
discoverable via the color picker popover.)

**Empty/no-domain state**: keep an equivalent of the current "Add start
dates to your jobs to see them on the timeline" message, but it's fine if a
phase added via the new quick-add (which sets a start date by default)
makes this state rarer in practice.

### 4. Add the "+ Add phase" inline quick-add
Lives in `src/app/projects/[id]/scheduling/page.tsx` (passes `onAddJob` into
`JobTimeline`, or owns the popover state itself — match however
`onAddJob`/`onColorChange` are already wired today). On click, open a small
popover (style it like the existing color-picker popover in
`JobTimeline.tsx`: `var(--glass-strong)`, `var(--blur)`, `border:
1px solid var(--border)`, `borderTopColor: var(--border-top)`, rounded
16px, `var(--shadow-lg)`) containing:
- Category `<select>`, options from `useJobCategories().categories`
  (mirror `manage/page.tsx`'s `categories[0] ?? "Designing"` default).
- Start date input (default to the project's start date or today, same as
  `addJob()` in `manage/page.tsx`).
- End date input (optional).
- Save / Cancel.

On Save, build the new `Job` with **exactly** the same defaults
`manage/page.tsx`'s `addJob()` uses: `id: makeId()`, `status: "N/A"`,
`approvedBidderId: null`, `color: ""`, `estimatedCost: 0`, `sourceItemId:
""`, `bidders: []`. Append it via `setProject` from `useProjectContext` —
the same `project.jobs` array Jobs & Bids reads, so the new phase appears
there immediately (autosave already happens through the existing
`useProjectContext` plumbing; do not build a separate save path).

### 5. Search box
Filters the rendered phases by category name (case-insensitive substring
match). Lives in the Scheduling page, filters the `jobs` array passed into
`JobTimeline`. Purely client-side, no API change.

## Rules
- Only touch: `src/app/projects/[id]/layout.tsx`,
  `src/app/projects/[id]/scheduling/page.tsx`, `src/components/JobTimeline.tsx`.
  If you genuinely need a new small file (e.g. a `PhaseIcon` helper), keep it
  under `src/components/` and say so in the completion report — don't expand
  scope beyond the timeline/sidebar/quick-add described here.
- Do not change `--accent` or add a new accent color token. Do not touch
  the existing `statusFill()` color values.
- Do not change anything on the Jobs & Bids (`manage`) page itself — the
  data flows through `project.jobs` already; no edits needed there.
- Keep using the existing `useProjectContext().setProject` pattern for all
  writes — don't introduce a new fetch/save path.

## Verification
1. `npx tsc --noEmit` — zero new errors.
2. `npm run build` — must succeed.
3. Manually describe (in the completion report) how the new
   `JobTimeline` renders for a project with several jobs spanning
   different months, and confirm the sidebar's `position: sticky` /
   `max-height` behavior was applied exactly as specified.
4. Confirm a phase added via the new "+ Add phase" quick-add appears on the
   Jobs & Bids page for the same project (same `project.jobs` array) —
   describe how you verified this (code-path reasoning is fine if a live
   browser check isn't available in your environment, but say so
   explicitly).

## Completion Report (REQUIRED)
Create `LLM/completions/schedule-redesign.md` with: pass/fail, commands run,
exact diff for each of the three files (or note if a new file was added and
why), and confirmation that no other file changed.

## Final Output to User (REQUIRED)
End with the same "Implementation Complete" / "Next Step" block format as
other handoffs, pointing the Orchestrator at
`LLM/completions/schedule-redesign.md` and
`LLM/handoffs/schedule-redesign.md`.
