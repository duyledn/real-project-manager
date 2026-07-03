# Coding LLM Handoff — UX Polish Batch

## Read These Files First
1. `LLM/context/ux-polish.md` — theme summary and architecture diagram
2. `src/app/globals.css` — existing glass tokens and `.field-input` styles
3. `src/components/JobTimeline.tsx` — full file (all schedule changes live here)
4. `src/app/projects/[id]/scheduling/page.tsx` — full file (layout + prop wiring)
5. `src/lib/types.ts` — `Job`, `JobStatus`, `Bidder`, `BidderStatus`
6. `src/components/JobDrawer.tsx` — read it for reference only; do not modify it

Implement the phases below in order. Run `npx tsc --noEmit` after Phase C and
once more at the very end.

---

## Phase A — Glass opacity fix (`src/app/globals.css`)

The glass surfaces are too see-through. Increase alpha values to the values
below. `--blur` and `--glass-strong` are already correct — do not change them.

**Light theme** (inside `:root` block):
```css
--glass:        rgba(255, 255, 255, 0.72);   /* was 0.55 */
--glass-2:      rgba(255, 255, 255, 0.58);   /* was 0.40 */
```

**Dark theme** (inside `[data-theme="dark"]` block):
```css
--glass:        rgba(44, 37, 32, 0.72);      /* was 0.55 */
--glass-2:      rgba(44, 37, 32, 0.58);      /* was 0.38 */
```

This keeps the translucency visible (blur is still applied) while making panel
content readable. No other token changes.

---

## Phase B — Date picker styling (`src/app/globals.css`)

Add these rules inside the `@layer components` block, after the `.field-input`
block:

```css
/* Force a consistent light-mode calendar popup on all platforms. */
.field-input[type="date"],
.field-input[type="datetime-local"] {
  color-scheme: light;
}

/* Tint the picker-open icon to the app's accent color. */
.field-input[type="date"]::-webkit-calendar-picker-indicator,
.field-input[type="datetime-local"]::-webkit-calendar-picker-indicator {
  cursor: pointer;
  border-radius: 4px;
  padding: 2px;
  opacity: 0.7;
  filter: invert(36%) sepia(60%) saturate(600%) hue-rotate(120deg) brightness(85%);
  /* The filter approximates --accent (#1F8A5B) from a neutral grey base. */
  transition: opacity 0.15s;
}
.field-input[type="date"]::-webkit-calendar-picker-indicator:hover,
.field-input[type="datetime-local"]::-webkit-calendar-picker-indicator:hover {
  opacity: 1;
}
```

---

## Phase C — `src/components/JobTimeline.tsx` (7 changes)

Read the full current file before making any edits. All changes below are
described in the order you should apply them.

### C1 — New optional props on `JobTimelineProps`
Add these four new optional props:
```ts
saveState?: import("@/components/fields").SaveState;
onExpand?: () => void;
onHoverAdd?: (category: string) => void;   // called when hover-"+" is clicked
```
And remove the existing `onAddJob?: () => void` prop — it is superseded. The
toolbar button moves to the bottom (C4); `onHoverAdd` handles the hover path
(C5). Update the destructured props accordingly.

> **Important:** `SaveIndicator` is already imported in `fields.tsx` —
> import it in this file too:
> `import { SaveIndicator } from "@/components/fields";`
> Also import `SaveState` type: `import type { SaveState } from "@/components/fields";`
> (If SaveState isn't exported from fields, look for the type name used for
> `saveState` in `useProjectContext` — match whatever the project already uses.)

### C2 — Toolbar: replace Add phase button with SaveIndicator + Expand
The existing `toolbar` variable renders:
```
[Search input | flex-1]  [Add phase button (if onAddJob)]
```

Replace it with:
```
[Search input | flex-1]  [SaveIndicator (if saveState)]  [↗ Expand (if onExpand)]
```

Exact JSX for the right side of the toolbar:
```tsx
<div className="flex items-center gap-2 shrink-0">
  {saveState && <SaveIndicator state={saveState} />}
  {onExpand && (
    <button
      type="button"
      className="btn h-9 gap-1.5 px-3 inline-flex items-center"
      onClick={onExpand}
    >
      <Maximize2 size={14} /> Expand
    </button>
  )}
</div>
```

Keep the outer toolbar wrapper exactly as-is (flex row, `gap-3 mb-5`).

### C3 — Job rows: solid background + rounded corners
Each job row currently uses:
```tsx
background: isSelected ? "var(--accent-soft)" : index % 2 ? "rgba(255,255,255,0.13)" : "transparent"
```

Replace the row's `style` (and class) with:
```tsx
style={{
  gridTemplateColumns: `${LABEL_COL_W}px minmax(0,1fr)`,
  minHeight: ROW_H,
  background: isSelected
    ? "var(--accent-soft)"
    : "var(--surface-solid)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  marginBottom: 4,
}}
```

Remove the `hover:bg-[var(--glass-2)]` Tailwind class from the row's
`className` (since we now have explicit bg). Keep the `rounded-[18px]` class or
change it to `rounded-[12px]` — **use `rounded-[12px]`** to match the app's
tighter radius language. Remove the alternating-stripe logic entirely.

### C4 — "Add phase" button at the bottom
Remove the `{onAddJob && ...}` branch from the toolbar. Instead, add a row
**below** the `jobs.map(...)` block and **above** the closing `</div>` of the
rows container:

```tsx
<button
  type="button"
  onClick={() => onHoverAdd?.("")}          /* empty string = let page pick default category */
  className="w-full mt-2 flex items-center gap-2 px-4 rounded-[12px] text-[12.5px] font-bold text-ink-muted transition-colors hover:text-accent hover:bg-[var(--accent-soft)]"
  style={{
    height: 40,
    border: "1.5px dashed var(--border)",
  }}
>
  <Plus size={15} /> Add phase
</button>
```

Only render this button when `onHoverAdd` is defined (i.e., the timeline is
being used in a context that supports adding).

### C5 — Remove the horizontal track line
Inside the bar column for each job row, there is:
```tsx
<div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[2px]" style={{ background: "var(--border)" }} />
```
Delete this `<div>` entirely. Do not replace it.

### C6 — Hover the category label → inline "+" button
In the label column of each row, the category name is currently:
```tsx
<span className="text-[13px] font-extrabold truncate">{job.category}</span>
```

Wrap the label area in a `relative group/label` div and add a hover button:
```tsx
<div className="relative flex-1 min-w-0 group/label">
  <span className="text-[13px] font-extrabold truncate block">{job.category}</span>
  <button
    type="button"
    onClick={(e) => {
      e.stopPropagation();
      onHoverAdd?.(job.category);     /* pre-fill the same category */
    }}
    className="absolute -bottom-3 left-0 z-10 opacity-0 group-hover/label:opacity-100
               flex items-center gap-1 px-2 py-0.5 rounded-[8px] text-[10.5px] font-bold
               text-accent bg-[var(--accent-soft)] transition-opacity"
    tabIndex={-1}
    aria-label={`Add phase below ${job.category}`}
  >
    <Plus size={11} /> Add below
  </button>
</div>
```

The button appears only on row hover (the `group-hover/label:opacity-100`
transition handles this). Clicking it does NOT select the row — `e.stopPropagation()`
prevents the `onSelect` from firing. The `onHoverAdd(job.category)` call passes
the current category as the pre-fill hint to the page.

Note: `ROW_H` is 56px — there is enough space for the absolute-positioned
`-bottom-3` button to peek out without overlapping the next row significantly.
If rows overlap, consider increasing `ROW_H` to 64 or add `overflow: visible`
to the row container.

### C7 — Bar bubble: shadow, less round, thinner
The duration bar is currently:
```tsx
<div
  className="absolute top-1/2 -translate-y-1/2 h-10 rounded-full flex items-center justify-center px-4 text-[12.5px] font-extrabold shadow-sm"
  ...
>
```

Replace with:
```tsx
<div
  className="absolute top-1/2 -translate-y-1/2 flex items-center justify-center px-3 text-[12px] font-extrabold"
  style={{
    left: `${startPct}%`,
    width: `max(${widthPct}%, 48px)`,
    maxWidth: `${Math.max(0, 100 - startPct)}%`,
    height: 28,
    borderRadius: 8,            /* was rounded-full → fully round */
    background: barColor,
    color: textColor,
    boxShadow: "0 3px 10px rgba(0,0,0,0.18), 0 1px 3px rgba(0,0,0,0.10)",
  }}
>
  <span className="truncate">{monthRangeLabel(start, safeEnd)}</span>
</div>
```

Key changes: `h-10` (40px) → 28px, `rounded-full` → `borderRadius: 8`, stronger
box-shadow replacing `shadow-sm`.

---

## Phase D — New component `src/components/ScheduleJobPanel.tsx`

Create this file from scratch. It renders an inline side panel (not position-fixed)
that shows all editable fields for a selected job, anchored beside the timeline.

**Props:**
```ts
type ScheduleJobPanelProps = {
  project: Project;
  job: Job;
  categories: string[];
  subcontractors: SubcontractorWithJobs[];
  onChange: (updater: (j: Job) => Job) => void;
  onClose: () => void;
};
```

**Imports needed:**
```ts
import { X } from "lucide-react";
import { syncJobFromBidders } from "@/lib/jobs";
import { BIDDER_STATUSES, JOB_STATUSES } from "@/lib/types";
import type { Project, Job, Bidder, SubcontractorWithJobs } from "@/lib/types";
import { pillStyle, initialsOf, bidStatusColor } from "@/lib/bidStatus";
import { makeId } from "@/lib/defaults";
import { useCurrency } from "@/lib/currency";
import { MoneyInput } from "@/components/fields";
```

**Structure:**
```tsx
export function ScheduleJobPanel({ project, job, categories, subcontractors, onChange, onClose }) {
  const { fmtMoney, currency } = useCurrency();

  function editField<K extends keyof Job>(key: K, value: Job[K]) {
    onChange((j) => ({ ...j, [key]: value }));
  }

  function editBidder(bidderId: string, patch: Partial<Bidder>) {
    onChange((j) =>
      syncJobFromBidders({
        ...j,
        bidders: j.bidders.map((b) => (b.id === bidderId ? { ...b, ...patch } : b)),
      }),
    );
  }

  function addBidder() {
    onChange((j) => ({
      ...j,
      bidders: [
        ...j.bidders,
        { id: makeId(), subcontractorId: null, bidPrice: 0, status: "Not sent", bidLink: "" },
      ],
    }));
  }

  function removeBidder(bidderId: string) {
    onChange((j) =>
      syncJobFromBidders({ ...j, bidders: j.bidders.filter((b) => b.id !== bidderId) }),
    );
  }

  return (
    <aside
      className="flex flex-col shrink-0 overflow-y-auto"
      style={{
        width: 308,
        borderRadius: 20,
        background: "var(--surface-solid)",
        border: "1px solid var(--border)",
        borderTopColor: "var(--border-top)",
        boxShadow: "var(--shadow-lg)",
        maxHeight: "calc(100vh - 100px)",  /* don't exceed viewport */
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 shrink-0 border-b"
        style={{ borderColor: "var(--border)" }}
      >
        <div>
          <div className="label-mono text-[10px] uppercase tracking-widest">Phase detail</div>
          <h3 className="font-extrabold text-[15px] leading-tight mt-0.5 truncate max-w-[210px]">
            {job.category}
          </h3>
        </div>
        <button type="button" onClick={onClose} className="icon-btn" aria-label="Close">
          <X size={16} />
        </button>
      </div>

      {/* Body — scrollable */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">

        {/* Category */}
        <label className="block">
          <span className="label-mono mb-1 block text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">
            Category
          </span>
          <select
            className="field-input w-full h-10"
            value={job.category}
            onChange={(e) => editField("category", e.target.value)}
          >
            {Array.from(new Set([job.category, ...categories].filter(Boolean))).map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="label-mono mb-1 block text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">
              Start
            </span>
            <input
              type="date"
              className="field-input w-full h-10"
              value={job.startDate}
              onChange={(e) => editField("startDate", e.target.value)}
            />
          </label>
          <label className="block">
            <span className="label-mono mb-1 block text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">
              End
            </span>
            <input
              type="date"
              className="field-input w-full h-10"
              min={job.startDate || undefined}
              value={job.endDate}
              onChange={(e) => editField("endDate", e.target.value)}
            />
          </label>
        </div>

        {/* Status */}
        <label className="block">
          <span className="label-mono mb-1 block text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">
            Status
          </span>
          <select
            className="field-input w-full h-10"
            value={job.status}
            onChange={(e) => editField("status", e.target.value as any)}
          >
            {JOB_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>

        {/* Estimated cost */}
        <label className="block">
          <span className="label-mono mb-1 block text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">
            Estimated cost
          </span>
          <MoneyInput
            value={job.estimatedCost}
            onChange={(v) => editField("estimatedCost", v)}
            currency={currency}
            className="field-input w-full h-10"
          />
        </label>

        {/* Bidders */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="label-mono text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">
              Bids ({job.bidders.length})
            </span>
            <button
              type="button"
              onClick={addBidder}
              className="text-[11.5px] font-bold text-accent hover:underline"
            >
              + Add bid
            </button>
          </div>

          {job.bidders.length === 0 ? (
            <p className="text-[12px] text-ink-muted">No bids yet.</p>
          ) : (
            <div className="space-y-2">
              {job.bidders.map((bidder) => {
                const sub = subcontractors.find((s) => s.id === bidder.subcontractorId);
                const color = bidStatusColor(bidder.status);
                return (
                  <div
                    key={bidder.id}
                    className="rounded-[10px] p-2.5"
                    style={{
                      background: "var(--glass-2)",
                      border: "1px solid var(--border)",
                      borderLeft: `3px solid ${color}`,
                    }}
                  >
                    {/* Sub selector */}
                    <select
                      className="field-input w-full h-8 text-[12px] mb-1.5"
                      value={bidder.subcontractorId ?? ""}
                      onChange={(e) =>
                        editBidder(bidder.id, { subcontractorId: e.target.value || null })
                      }
                    >
                      <option value="">— Unassigned —</option>
                      {subcontractors.map((s) => (
                        <option key={s.id} value={s.id}>{s.companyName}</option>
                      ))}
                    </select>
                    {/* Status + price row */}
                    <div className="flex gap-2 items-center">
                      <select
                        className="field-input flex-1 h-8 text-[11.5px]"
                        value={bidder.status}
                        onChange={(e) =>
                          editBidder(bidder.id, { status: e.target.value as any })
                        }
                      >
                        {BIDDER_STATUSES.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                      <MoneyInput
                        value={bidder.bidPrice}
                        onChange={(v) => editBidder(bidder.id, { bidPrice: v })}
                        currency={currency}
                        className="field-input w-[90px] h-8 text-[12px] font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => removeBidder(bidder.id)}
                        className="icon-btn text-ink-muted hover:text-red-500 shrink-0"
                        aria-label="Remove bid"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

export default ScheduleJobPanel;
```

---

## Phase E — `src/app/projects/[id]/scheduling/page.tsx` (layout + wiring)

### E1 — New imports
```ts
import { useSubcontractors } from "@/lib/useSubcontractors";
import { ScheduleJobPanel } from "@/components/ScheduleJobPanel";
import type { Job } from "@/lib/types";   // if not already imported
```

### E2 — New state
```ts
const { subs } = useSubcontractors();
const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
```

### E3 — Wire onHoverAdd (replaces openInJobs + the old onAddJob path)
```ts
function handleHoverAdd(prefillCategory: string) {
  setQuickCategory(prefillCategory || categories[0] || "Designing");
  setQuickStartDate(defaultStartDate);
  setQuickEndDate("");
  setQuickAddOpen(true);
}
```

Remove the old `openInJobs` function entirely — it was the `router.push` to Jobs
& Bids. Remove the `useRouter` import if it is no longer used anywhere else in
the file.

### E4 — Remove the floating Expand/Save header
Delete this block from the JSX:
```tsx
<div className="flex justify-end">
  <div className="flex items-center gap-2.5">
    <SaveIndicator state={saveState} />
    {project.jobs.length > 0 && (
      <button type="button" className="btn h-10 gap-2 px-4" onClick={() => setExpanded(true)}>
        <Maximize2 size={16} />
        Expand
      </button>
    )}
  </div>
</div>
```

### E5 — New layout wrapper
Wrap the `<div className="relative">` that currently holds `<JobTimeline>` and
`{quickAddOpen && <QuickAddPopover>}` in a `flex gap-4 items-start` wrapper that
also conditionally renders the `ScheduleJobPanel`:

```tsx
<div className="flex gap-4 items-start">
  {/* Timeline (flex-1) */}
  <div className="flex-1 min-w-0 relative">
    <JobTimeline
      jobs={filteredJobs}
      selectedJobId={selectedJobId}
      onSelect={(id) => setSelectedJobId((current) => (current === id ? null : id))}
      onColorChange={(jobId, color) =>
        setProject((p: Project) => ({
          ...p,
          jobs: p.jobs.map((j) => (j.id === jobId ? { ...j, color } : j)),
        }))
      }
      onHoverAdd={handleHoverAdd}
      saveState={saveState}
      onExpand={project.jobs.length > 0 ? () => setExpanded(true) : undefined}
      searchValue={search}
      onSearchChange={setSearch}
    />

    {quickAddOpen && (
      <QuickAddPopover
        categories={categories}
        category={quickCategory}
        startDate={quickStartDate}
        endDate={quickEndDate}
        onCategoryChange={setQuickCategory}
        onStartDateChange={setQuickStartDate}
        onEndDateChange={setQuickEndDate}
        onClose={() => setQuickAddOpen(false)}
        onSave={saveQuickAdd}
      />
    )}
  </div>

  {/* Side panel — appears when a job is selected */}
  {selectedJobId && (() => {
    const selectedJob = project.jobs.find((j) => j.id === selectedJobId);
    if (!selectedJob) return null;
    return (
      <ScheduleJobPanel
        project={project}
        job={selectedJob}
        categories={categories}
        subcontractors={subs}
        onChange={(updater) =>
          setProject((p: Project) => ({
            ...p,
            jobs: p.jobs.map((j) => (j.id === selectedJobId ? updater(j) : j)),
          }))
        }
        onClose={() => setSelectedJobId(null)}
      />
    );
  })()}
</div>
```

Note: `selectedJobId` is toggled (clicking the same job again closes the panel).
Clicking a different job switches the panel to show that job's data.

### E6 — Remove unused imports
After all changes, remove `Maximize2` (moved into JobTimeline.tsx), `SaveIndicator`
(moved into JobTimeline.tsx), and `useRouter` if nothing else in the file uses them.

---

## Rules
1. Implement phases A → E in order. Do not skip ahead.
2. Do not touch: `JobDrawer.tsx`, `JobsBidsBoard.tsx`, `globals.css` (beyond
   phases A and B), or any file under `/projects/[id]/manage/`, `/investment/`,
   `/construction/`.
3. All `setProject` calls in `scheduling/page.tsx` must use the pattern
   `(p: Project) => ({...})` — match the existing pattern in the file.
4. The `ScheduleJobPanel` must use `var(--surface-solid)` for background (not
   `var(--glass)`). This implements task 2: solid background for job detail.
5. When `selectedJobId` is set and the side panel is open, the timeline row for
   that job should show `background: "var(--accent-soft)"` (already handled by
   the `isSelected` check in `JobTimeline.tsx` — confirm this still works after
   your changes by tracing the `selectedJobId` prop through).

## Verification
1. `npx tsc --noEmit` — zero new errors after Phase C.
2. `npx tsc --noEmit` — zero errors at end.
3. `npm run build` — must succeed.
4. In the completion report, confirm each of the following works:
   a. Glass panels are visibly more opaque but blur is still visible behind.
   b. `<input type="date">` in QuickAddPopover shows the accent-colored calendar
      icon, and the picker calendar renders in a consistent light theme.
   c. Job rows in the Schedule timeline have solid white (light) / dark (dark)
      backgrounds with 12px radius — no alternating stripes, no horizontal line.
   d. The Expand button and SaveIndicator appear inside the timeline panel's
      toolbar (right side of the search bar row). The floating header row above
      the panel is gone.
   e. The "Add phase" button appears at the bottom of the job list, not in the
      toolbar.
   f. Hovering a category label shows a small "+ Add below" button beneath it.
   g. Bar bubbles are 28px tall, `borderRadius: 8`, with a visible drop shadow.
   h. Clicking a job row opens the `ScheduleJobPanel` to the right of the
      timeline — the user stays on the Schedule tab and can edit dates, status,
      cost, and bids without page navigation.
   i. Clicking the same job row again (or the ✕ in the panel) closes the panel.

## Completion Report (REQUIRED)
Create `LLM/completions/ux-polish.md` with: pass/fail per phase, `tsc` and
`build` outputs, exact list of files modified/created, and any deviations from
this spec with reasoning.

## Final Output to User (REQUIRED)
End with the standard "Implementation Complete / Next Step" block.
