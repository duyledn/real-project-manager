# Coding LLM Handoff — Project Settings Consolidation & Shell Polish

## Context
You are modifying the **Real Project Manager** Next.js app (project root: the repo containing `src/app`). Stack: Next.js App Router, TypeScript, React client components, Tailwind + CSS variables, `@/` alias → `src/`.

Six related UX changes:
1. Move the "Project Details" editing (currently in Jobs & Bids §01 and the Dashboard's edit-identity modal) into **Project Settings** as a structured, autosaving card.
2. Cap the sidebar height at viewport height minus the sticky TopNav.
3. Fix the project-switcher dropdown being clipped by the sidebar's overflow.
4. Remove the "edit project details" affordance from the Dashboard.
5. Move the Saving/Saved indicator into the shell header bar (same row as the page title) instead of a per-page component.
6. Strip descriptive subtitle/caption text under titles, keeping only captions that explain **how to use** the feature.

## Read These Files First
1. `src/app/projects/[id]/layout.tsx` — the project shell: sidebar, ProjectSwitcher, header bar with kicker/title. Changes 2, 3, 5 land here.
2. `src/app/projects/[id]/settings/page.tsx` — Project Settings page; gains the new Project details card (change 1).
3. `src/app/projects/[id]/manage/page.tsx` — Jobs & Bids; loses §01 Project Details (change 1), loses its SaveIndicator row (change 5).
4. `src/app/projects/[id]/page.tsx` — Dashboard; loses `EditIdentityModal` + editing state (change 4) and its SaveIndicator row (change 5).
5. `src/components/fields.tsx` — `SaveIndicator`, `SectionHeader`, `TextField`, `DateField` definitions (read only; no changes needed here except as noted).
6. `src/components/GradientHero.tsx` — has the `onEditProject` prop / edit button to remove (change 4).
7. `src/components/TopNav.tsx` — sticky top bar; needed for the height math in change 2.

Start with the listed files; you may explore others if needed, but log every extra file and why in your completion report, and STOP to ask the user if the task scope expands. Do NOT modify files not listed in "Changes Required" below.

## Changes Required

### 1. `src/app/projects/[id]/settings/page.tsx` — add "Project details" card
Add a new `SettingsCard` as the **first** card on the page (above Currency):

- Icon: `ClipboardList` (or `FileText`) from `lucide-react` — add to the existing import.
- Title: `"Project details"`. Caption: `"Changes save automatically. New jobs default to the anticipated start date."` (this caption stays — it explains behavior the user relies on).
- Import `TextField, DateField` from `@/components/fields` (extend the existing `NumberInput, SaveIndicator` import).
- Fields, each binding straight to the autosaving `setProject` from `useProjectContext` (same pattern the manage page used):

```tsx
<div className="grid sm:grid-cols-2 gap-5">
  <TextField label="Project Name" value={project.name}
    onChange={(v) => setProject((p) => ({ ...p, name: v.trim() ? v : p.name }))} placeholder="Project name" />
  <TextField label="Investment Strategy" value={project.investmentStrategy}
    onChange={(v) => setProject((p) => ({ ...p, investmentStrategy: v }))} placeholder="e.g. Buy-Rehab-Hold Rental" />
  <TextField label="Project Address" value={project.projectAddress}
    onChange={(v) => setProject((p) => ({ ...p, projectAddress: v }))} placeholder="123 Main St, City" />
  <DateField label="Anticipated Start Date" value={project.startDate}
    onChange={(v) => setProject((p) => ({ ...p, startDate: v }))} />
  <TextField label="Project Manager" value={project.projectManager}
    onChange={(v) => setProject((p) => ({ ...p, projectManager: v }))} placeholder="Name" />
  <TextField label="Owner" value={project.owner}
    onChange={(v) => setProject((p) => ({ ...p, owner: v }))} placeholder="Name" />
  <TextField label="General Contractor" value={project.generalContractor}
    onChange={(v) => setProject((p) => ({ ...p, generalContractor: v }))} placeholder="Company / name" />
</div>
```

- Note on empty-name guard: `TextField` fires per keystroke, so a naive `.trim()` guard would block clearing the field while typing. If `TextField` supports `onBlur`-style commit, use it; otherwise allow free typing and only fall back to the previous name when the committed value is empty. State your chosen approach in the completion report.
- Move the `STRATEGY_PRESETS` array out of `src/app/projects/[id]/page.tsx` into this file (or a small export in `src/lib/defaults.ts`) and wire it as a `<datalist>` on the Investment Strategy field, mirroring how the dashboard modal did it (`list="strategy-presets"`).
- Remove the standalone `<SaveIndicator state={saveState} />` on this page (change 5 moves it to the shell header). Keep the intro paragraph ("Looking for theme or profile? … top-right gear") — it is navigational how-to.

### 2. `src/app/projects/[id]/manage/page.tsx` — remove §01 Project Details
- Delete the entire `{/* 01 — Project details */}` `<section>` (the `SectionHeader num="01" title="Project Details"` block and its 5 fields). These now live in Project Settings.
- Renumber remaining sections: Jobs → `num="01"`, Bids → `num="02"`, Bid Email Identity → `num="03"`.
- Remove the top `<div className="flex justify-end"><SaveIndicator …/></div>` row (change 5). Drop `SaveIndicator` from the fields import if now unused; keep `TextField`/`DateField` imports only if still used (Bid Email Identity uses `TextField` — keep it; `DateField` becomes unused — remove it).
- Do NOT touch the auto-fill `useEffect`, the jobs table, the bids board, or Bid Email Identity fields.

### 3. `src/app/projects/[id]/page.tsx` — remove Dashboard edit-project affordance
- Delete the `EditIdentityModal` component (bottom of file), the `const [editing, setEditing] = useState(false)` state, the `{editing && <EditIdentityModal …/>}` render, and the `onEditProject={() => setEditing(true)}` prop.
- Delete `STRATEGY_PRESETS` from this file (moved in change 1). Clean now-unused imports (`X`, `Check`, `useState` if unused, `SaveIndicator`, `Project` type if unused).
- Remove the top `<div className="flex justify-end"><SaveIndicator …/></div>` row (change 5).

### 4. `src/components/GradientHero.tsx` — drop the edit button
- Remove the `onEditProject` prop from `GradientHeroProps` and the component signature, and delete the edit button that calls it (the element with `title="Edit project details"`). Clean unused icon imports.

### 5. `src/app/projects/[id]/layout.tsx` — sidebar height, switcher clipping, header SaveIndicator
**(a) Sidebar max height (user request 2).** TopNav renders as a sticky bar: 12px top padding (`pt-3`) + the nav pill (~55px). In `ShellChrome`, update the `<aside>` inline style:

```ts
style={{ borderRadius: 26, position: "sticky", top: 79, maxHeight: "calc(100vh - 91px)", overflowY: "auto" }}
```

i.e. `top` = TopNav total height (67px) + 12px gap; `maxHeight` = `100vh - top - 12px` bottom breathing room. Verify the actual TopNav height in the browser (it may differ by a few px) and adjust the two constants so the sidebar never slides under the TopNav and never extends past the viewport bottom. Prefer defining the offset once (e.g. a local `const SIDEBAR_TOP = 79`) so the two values can't drift.

**(b) Un-clip the ProjectSwitcher dropdown (user request 3).** The dropdown is `position: absolute` inside the `<aside>`, which now has `overflowY: auto` — ancestors with overflow clip absolutely-positioned children. Fix by rendering the open dropdown in a portal with fixed positioning:

- In `ProjectSwitcher`, import `createPortal` from `react-dom`.
- Keep the button as is. When opening, measure the trigger: store `ref.current.getBoundingClientRect()` (or measure in a layout effect keyed on `open`).
- Render the dropdown via `createPortal(<div …/>, document.body)` with `position: "fixed"`, `top: rect.bottom + 8`, `left: rect.left`, same width (252px) and glass styling as today. Keep `z-[120]` or higher.
- The outside-mousedown close handler must treat clicks inside the portal as inside: give the portal div its own ref and check both refs before closing.
- Close the dropdown on scroll of the window/sidebar (`window.addEventListener("scroll", close, true)` while open) so the fixed panel can't drift away from its trigger.
- Guard portal rendering for SSR (`typeof document !== "undefined"` or only render when `open`, which is client-only after interaction — that's sufficient).

**(c) SaveIndicator in the header bar (user request 5).** In `ShellChrome`:
- Import `SaveIndicator` from `@/components/fields`.
- Pull `saveState` from the existing `useProjectContext()` call (it already returns it; extend the destructure).
- In the header row (the `div` containing the kicker + title), add the indicator to the right of the title block, before the mobile icon nav:

```tsx
<div className="min-w-0 flex-1"> …kicker/title… </div>
<div className="no-print shrink-0"><SaveIndicator state={saveState} /></div>
<nav className="flex lg:hidden …"> …
```

### 6. Per-page SaveIndicator removals (completes user request 5)
The shell header now owns the indicator; remove the per-page copies:
- `src/app/projects/[id]/construction/page.tsx` — remove `<SaveIndicator state={saveState} />` from the intro header row; drop unused import/destructure.
- `src/app/projects/[id]/files/page.tsx` — same.
- `src/app/projects/[id]/investment/page.tsx` — same.
- `src/app/projects/[id]/scheduling/page.tsx` — stop passing `saveState={saveState}` to both `JobTimeline` usages.
- `src/components/JobTimeline.tsx` — remove the optional `saveState` prop and its `{saveState && <SaveIndicator …/>}` render; drop the import.
- Dashboard, manage, settings — already covered in changes 1–3.
- Leave `SaveIndicator` itself in `src/components/fields.tsx` untouched.

### 7. Subtitle/caption cleanup (user request 6)
Rule applied: a caption survives only if it tells the user **how to operate or interpret** the feature; purely descriptive text goes.

**Remove the caption prop entirely from these `SectionHeader` calls:**
- `analysis/page.tsx` — §01, §02, §03, §05 (keep §04: "Where the line crosses zero is your break-even" — it teaches chart reading).
- `investment/page.tsx` — §01, §02, §04, §06 (keep §03 "Add years anytime — the analysis re-projects automatically" and §05 "Enter the amount per period using the frequency selector on each row").
- `math/page.tsx` — §04.

**Keep unchanged:** `construction/page.tsx` §01 caption (view-switching how-to); `manage/page.tsx` Jobs / Bids / Bid Email Identity captions (all operational).

**Page-level `<h1>` subtitles:**
- `construction/page.tsx` — replace the two-sentence paragraph with the single behavioral sentence: `Line items here auto-fill the Jobs section under Jobs & Bids.`
- `files/page.tsx` — replace the paragraph with: `Drag items onto a folder to move them.`
- `investment/page.tsx` — delete the subtitle paragraph entirely (purely descriptive).

**Settings page cards:** remove the "Project image" caption (descriptive). Keep the Currency caption, the currency tip paragraph, and the "Recommended next" caption (`not wired up yet` — operational). New Project details caption per change 1.

## Rules
- ES modules / TypeScript as in the existing files; match surrounding code style (inline style objects + Tailwind classes, plain strings on pages that don't use `t()` — the settings and manage pages do not use `t()`; layout.tsx does, so wrap any new user-visible layout strings in `t()`).
- Do NOT add dependencies. `createPortal` comes from `react-dom` (already available).
- Do NOT modify: `src/lib/*` (except optionally exporting `STRATEGY_PRESETS` from `defaults.ts`), API routes, `projectContext`, autosave logic, `TopNav.tsx` (measure only), `fields.tsx` (except nothing — no changes), global CSS.
- Do NOT rename `Project` type fields; the settings card writes the same fields the manage page wrote (`name`, `investmentStrategy`, `projectAddress`, `startDate`, `projectManager`, `owner`, `generalContractor`).
- Preserve print behavior: new/moved shell elements that shouldn't print need `no-print` (the SaveIndicator wrapper in the header, as specced).
- Do NOT edit `LLM/docs/RULES.md` or `LLM/skills/*.md`.

## Verification
1. `npx tsc --noEmit` — no type errors (catches every removed prop/import).
2. `npx next lint` — no new lint errors.
3. Manual, with `npm run dev`: (a) Project Settings shows the new Project details card at top; editing the name updates the sidebar project card and shell header after autosave, and "Saving…/Saved" appears next to the page title in the header bar on every project tab. (b) Jobs & Bids starts at §01 Jobs; no Project Details section; no stray save indicator row. (c) Dashboard hero has no edit button. (d) Shrink the browser: the sidebar never overlaps the TopNav and stops at the viewport bottom (scrolling internally if needed); the project-switcher dropdown opens fully un-clipped above the main panel.

## Completion Report (REQUIRED)
Create `LLM/completions/project-settings-and-shell-polish.md` containing:
- **Pass/Fail Status:** Did it pass all verification checks?
- **Verification Commands Run:** Exact commands you executed.
- **Extra Files Explored:** List any files you had to search outside the "Read These First" list and why.
- **Skills Used (if any):** List any `LLM/skills/*.md` you read and whether each was helpful or confusing.
- **What Was Changed:** Files modified and brief summaries.
- **Deviations from Handoff:** List anything you implemented differently from the spec and why (including the empty-name guard approach and the final sidebar `top`/`maxHeight` constants). Write "None" if you followed the spec exactly.
- **Metrics:** (Optional) Time taken or Token/Cost usage, if available in your interface.

## Final Output to User (REQUIRED)
End your response with:

```
---
## ✅ Implementation Complete

**Summary:** [1-2 sentence summary]

**Files changed:**
- `path/to/file` — description
- ...

**Completion report written to:** `LLM/completions/project-settings-and-shell-polish.md`

---

### 🔁 Next Step — Paste this into your Orchestrator:

> The coding LLM has finished the **Project Settings Consolidation & Shell Polish** implementation.
> Read the completion report at `LLM/completions/project-settings-and-shell-polish.md`.
> Perform a code review on the modified files against the handoff spec at `LLM/handoffs/project-settings-and-shell-polish.md` and run syntax checks.
> If there are deviations or issues, provide a follow-up prompt for the Coding LLM to fix them.
> If the review passes, update the project documentation and ask me what I'd like to work on next.
```
