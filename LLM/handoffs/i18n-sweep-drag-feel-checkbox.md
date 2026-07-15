# Coding LLM Handoff — Full Vietnamese Sweep, Floaty Drag, Checkbox Redesign

## Context
You are modifying the **Real Project Manager** Next.js app. Stack: Next.js 15 App Router, TypeScript, React client components, Tailwind + CSS variables, `@/` alias → `src/`.

Three workstreams:
1. **i18n sweep** — the app has a working translation layer (`useI18n().t()`, English string = dictionary key, graceful fallback), but only 5 files use it (`[id]/layout.tsx`, `[id]/page.tsx` partially, `TopNav.tsx`, `fields.tsx`, `app/settings/page.tsx`). Every other page/component is hardcoded English. Wrap ALL user-facing strings app-wide and fill the Vietnamese dictionary.
2. **Drag feel** — table row drag (via `useDragReorder`) reorders live but feels rigid: the native browser drag ghost is a static screenshot and row shifts snap instantly. Add a floaty custom drag ghost + smoothly animated row shifts.
3. **Checkbox redesign** — the row-select checkboxes are unstyled native inputs. Restyle globally: bigger, more padding, rounder corners.

## Read These Files First
1. `src/lib/i18n.tsx` — the provider; `t(key, vars)` semantics and `{placeholder}` filling.
2. `src/lib/translations.ts` — the `VI` dictionary; note the grouping comments and the header rule (never translate user data/figures/currency).
3. `src/lib/useDragReorder.ts` — the drag hook you'll extend (handleProps/rowProps/dragIndex).
4. `src/components/ItemsTable.tsx` — has BOTH a drag table and checkboxes; your reference implementation site.
5. `src/app/globals.css` — where the checkbox restyle and drag-ghost CSS go.
6. `src/app/projects/[id]/manage/page.tsx` — a second drag table (jobs), plus many hardcoded strings.

Start with the listed files; you may explore others if needed, but log every extra file and why in your completion report, and STOP to ask the user if the task scope expands. Do NOT modify files not listed in "Changes Required" below.

## Changes Required

### Workstream 1 — Vietnamese i18n sweep

**1a. Conventions (apply everywhere):**
- Wrap display strings at the render site: `t("Add job")`, `t("{n} pending", { n: x })`. Use the exact English text as the key.
- Translate: visible text, buttons, table headers, `placeholder`, `title`, `aria-label`, empty states, `window.confirm`/`window.alert` messages, pill/badge labels, section captions, page subtitles.
- Do NOT translate: user-entered data, project/company names, numbers, currency codes/symbols, CSS classes, stored enum **values**. For enums shown in `<select>`, keep `value` as the stored English string and translate only the label: `<option key={s} value={s}>{t(s)}</option>` (pattern: `JOB_STATUSES`, `BID_STATUSES`, item categories, strategy presets).
- Status/short-label maps that live in `src/lib/*` (e.g. `BID_STATUS_SHORT` in `lib/bidStatus.ts`): do NOT edit the lib files — translate at the render site: `t(BID_STATUS_SHORT[b.status])` (the dashboard already does this; copy that pattern).
- Components that render caller-supplied labels (`SectionHeader`, `MetricCard`, `SettingsCard`, `ResizableTh`): translate at the **call site**, not inside the component, except where the component already owns text (e.g. `SaveIndicator` — already done).
- Client components only (`"use client"` is on all of these); get `t` via `const { t } = useI18n()`. Add the import where missing.

**1b. Files to sweep (this is the complete checklist — tick each in your report):**

Pages:
- `src/app/page.tsx` (landing / all projects)
- `src/app/login/page.tsx`, `src/app/signup/page.tsx`, `src/app/recover/page.tsx`
- `src/app/admin/page.tsx`
- `src/app/subcontractors/page.tsx`
- `src/app/settings/page.tsx` (mostly done — audit for stragglers)
- `src/app/projects/[id]/page.tsx` (dashboard — `t()` exists but `BudgetByCategory`/`BudgetRow` are hardcoded: "Budget by category", headers, "No bids", "Add jobs to see budget breakdown", etc.)
- `src/app/projects/[id]/manage/page.tsx`
- `src/app/projects/[id]/construction/page.tsx`
- `src/app/projects/[id]/investment/page.tsx`
- `src/app/projects/[id]/analysis/page.tsx`
- `src/app/projects/[id]/math/page.tsx`
- `src/app/projects/[id]/report/page.tsx`
- `src/app/projects/[id]/scheduling/page.tsx`
- `src/app/projects/[id]/files/page.tsx`
- `src/app/projects/[id]/settings/page.tsx`

Components:
- `src/components/ItemsTable.tsx`, `JobDrawer.tsx`, `JobsBidsBoard.tsx`, `JobTimeline.tsx`, `ScheduleJobPanel.tsx`, `GradientHero.tsx`, `MetricCard.tsx` (call sites), `ColorPicker.tsx`, `AuthFrame.tsx`, `Background.tsx` (if it has text), `AppShell.tsx` ("Loading…").
- `src/components/fields.tsx` — already uses `t()` in `SaveIndicator`; audit remaining strings ("Drag to reorder" title, field hints are caller-supplied → call sites).

**1c. `src/lib/translations.ts`:** add every new key with a natural, concise Vietnamese translation. Keep the existing per-section comment grouping (add sections per page/component). Reuse the established terminology exactly: Công việc = job, Báo giá = bid, Nhà thầu phụ = subcontractor, Dự án = project, Cài đặt = settings. Keep `{placeholders}` intact in both key and value. Do not remove or rewrite existing entries.

**1d. Known trap:** keys are exact-match. If two call sites need the same phrase, use the identical English string. Don't create near-duplicate keys ("Add job" vs "Add Job").

### Workstream 2 — Floaty drag animation

All four drag surfaces use `useDragReorder`: manage jobs table (`<tr>`), investment page revenue + expense tables (`<tr>`), `ItemsTable` (`<tr>`), `JobDrawer` bidders list (`<div>`s).

**2a. `src/lib/useDragReorder.ts` — add a custom drag ghost.** Extend the hook (backwards-compatible; no call-site signature changes beyond what's below):
- In `onDragStart`: suppress the native ghost — `e.dataTransfer.setDragImage(transparentImg, 0, 0)` where `transparentImg` is a module-level 1×1 transparent `Image` (guard creation with `typeof window !== "undefined"`).
- Capture the dragged row element (`e.currentTarget.closest("tr, [data-drag-row]")`), deep-clone it, and append the clone to `document.body` inside a fixed-position wrapper `div.drag-ghost` sized to the source row's `getBoundingClientRect()` width/height. For `<tr>` clones, wrap in `<table><tbody>` so the row renders correctly, and copy the source table's computed width.
- Track the pointer with a `document`-level `dragover` listener (the only event that fires continuously during HTML5 drag): update the wrapper's `transform: translate(x, y)` from `e.clientX/clientY` offset by the initial grab point. Write via `requestAnimationFrame` (store latest coords in a ref, one rAF loop while dragging) so it never floods layout.
- The "floaty" feel comes from CSS (2c) — slight scale, tilt, shadow, and a short transform transition on the wrapper so it trails the cursor by a beat.
- On `dragend`/`drop`: cancel the rAF, remove the listener and the ghost node. Also clean up in a `useEffect` unmount return.
- Style the **source row** while dragging via the existing `dragIndex` state (call sites already branch on it — see 2b).
- Respect `prefers-reduced-motion`: if `window.matchMedia("(prefers-reduced-motion: reduce)").matches`, skip the ghost entirely (native behavior) and skip row-shift animations.

**2b. Animated row shifts (FLIP).** Add a small exported hook in the same file, `useFlipList(containerRef, keySelector)` or equivalent: before each reorder, record `getBoundingClientRect().top` of each row (keyed by `data-key`); after React re-renders (in `useLayoutEffect` keyed on the order), apply the inverted delta `transform: translateY(oldTop - newTop)`, force reflow, then transition to `transform: none` over ~180ms `cubic-bezier(.32,.72,0,1)`. Skip the currently dragged row (`dragIndex`) and skip entirely under reduced motion.
- Wire it into all four call sites: add `data-key={row.id}` (or job/bidder id) to each draggable row and a ref on the `tbody`/list container.
- Update source-row styling at the four call sites to a consistent "lifted-away" look: replace the current mixed styles (outline on manage/investment, `opacity-40` on JobDrawer) with `opacity: 0.35` + existing outline where present — keep it minimal, the ghost is now the visual focus.

**2c. `src/app/globals.css` — ghost styles:**
```css
.drag-ghost {
  position: fixed;
  top: 0; left: 0;
  z-index: 300;
  pointer-events: none;
  transform-origin: 40px center;
  scale: 1.02;
  rotate: 1.2deg;
  opacity: 0.92;
  border-radius: 12px;
  overflow: hidden;
  background: var(--surface-solid);
  box-shadow: 0 18px 40px rgba(0,0,0,0.22), 0 4px 10px rgba(0,0,0,0.12);
  transition: transform 90ms cubic-bezier(.2,.8,.2,1);
}
```
(Adjust to match the app's glass tokens; the `transition` on transform is what produces the floaty cursor-lag.)

### Workstream 3 — Checkbox redesign

**3a. `src/app/globals.css`:** restyle ALL checkboxes globally (they're only used for row selection today; a global restyle is intended):
```css
input[type="checkbox"] {
  appearance: none;
  -webkit-appearance: none;
  width: 19px;
  height: 19px;
  flex-shrink: 0;
  margin: 3px;                     /* breathing room inside tight cells */
  border: 1.5px solid var(--border);
  border-radius: 7px;              /* noticeably rounder */
  background: var(--surface-solid);
  cursor: pointer;
  display: inline-grid;
  place-content: center;
  transition: background .15s ease, border-color .15s ease, box-shadow .15s ease;
}
input[type="checkbox"]:hover { border-color: var(--accent); }
input[type="checkbox"]:focus-visible { outline: none; box-shadow: 0 0 0 3px var(--accent-soft); }
input[type="checkbox"]:checked { background: var(--accent); border-color: var(--accent); }
input[type="checkbox"]:checked::before {
  content: "";
  width: 11px; height: 11px;
  background: #fff;
  clip-path: polygon(14% 44%, 0 65%, 40% 100%, 100% 16%, 84% 5%, 38% 72%);
}
```
Scale-check against the app's date/number inputs so 19px doesn't blow up row heights; 18–20px is the acceptable range.

**3b. Padding at the two usage sites** (`src/components/ItemsTable.tsx`, `src/app/projects/[id]/investment/page.tsx`): the select-all `<th>` uses `p-2.5` and row cells `p-1.5` — bump the row-cell checkbox wrapper gap/padding so the bigger box doesn't crowd the drag handle (e.g. `gap-1.5` → `gap-2`, cell `p-1.5` → `p-2`). Keep the existing hover-reveal opacity behavior untouched.

## Rules
- Do NOT edit `src/lib/bidStatus.ts`, `src/lib/types.ts`, `src/lib/palette.ts`, or any stored-data shape — translation happens at render sites only.
- Do NOT add dependencies (no dnd-kit, no framer-motion — extend the existing hook).
- Do NOT change `useDragReorder`'s reorder semantics (live reorder on dragover stays; `moveItem`/`moveItemsBefore` untouched).
- Do NOT translate anything inside `src/app/api/**` (server responses stay English) — UI-side error display may wrap known messages in `t()` where already displayed.
- Keep hydration stable: no `lang`-dependent rendering outside the provider's established pattern.
- English mode must render pixel-identical to today (keys pass through `t()` unchanged).
- Do NOT edit `LLM/docs/RULES.md` or `LLM/skills/*.md`.

## Verification
Note: ESLint is not installed in this project — do not attempt `next lint`. The dev server has failed to serve pages in prior sessions on this machine; attempt the manual check, but if the server won't serve, say so in the report rather than burning time.
1. `npx tsc --noEmit` — exit 0.
2. Heuristic sweep for missed strings: `grep -rn --include="*.tsx" -E '(placeholder|title|aria-label)="[A-Za-z]' src/app src/components | grep -v "t(" | grep -v node_modules` — every remaining hit must be justified in the report (data-driven or non-UI).
3. Manual (if dev server serves): switch to Tiếng Việt in workspace Settings, walk every page in checklist 1b top to bottom — no English chrome anywhere; drag a row in Jobs, remodel items, and expenses — ghost floats with the cursor, rows glide instead of snapping; checkboxes are visibly larger/rounder and the check renders in both themes.

## Completion Report (REQUIRED)
Create `LLM/completions/i18n-sweep-drag-feel-checkbox.md` containing:
- **Pass/Fail Status:** Did it pass all verification checks?
- **Verification Commands Run:** Exact commands you executed.
- **i18n Checklist:** The full file list from 1b with a ✔/✘ per file and count of strings wrapped; total new dictionary entries added.
- **Extra Files Explored:** Any files outside "Read These First" and why.
- **Skills Used (if any):** Any `LLM/skills/*.md` read and whether each helped.
- **What Was Changed:** Files modified and brief summaries.
- **Deviations from Handoff:** Anything implemented differently and why (esp. ghost implementation details and any strings you deliberately left untranslated). Write "None" if you followed the spec exactly.
- **Metrics:** (Optional) Time/token usage if available.

## Final Output to User (REQUIRED)
End your response with:

```
---
## ✅ Implementation Complete

**Summary:** [1-2 sentence summary]

**Files changed:**
- `path/to/file` — description
- ...

**Completion report written to:** `LLM/completions/i18n-sweep-drag-feel-checkbox.md`

---

### 🔁 Next Step — Paste this into your Orchestrator:

> The coding LLM has finished the **Full Vietnamese Sweep, Floaty Drag, Checkbox Redesign** implementation.
> Read the completion report at `LLM/completions/i18n-sweep-drag-feel-checkbox.md`.
> Perform a code review on the modified files against the handoff spec at `LLM/handoffs/i18n-sweep-drag-feel-checkbox.md` and run syntax checks.
> If there are deviations or issues, provide a follow-up prompt for the Coding LLM to fix them.
> If the review passes, update the project documentation and ask me what I'd like to work on next.
```
