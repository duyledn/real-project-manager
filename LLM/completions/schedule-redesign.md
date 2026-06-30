# Schedule Redesign Completion

## Pass/Fail
Pass.

- `npx tsc --noEmit` completed with exit code 0.
- `npm run build` completed with exit code 0.
- Build emitted the existing warning: `ESLint must be installed in order to run during builds: npm install --save-dev eslint`.
- Local dev server was started on `http://localhost:3001` because port 3000 was already in use.
- HTTP smoke check for `http://localhost:3001/projects/648177ec-1956-45c6-b39e-7af8e99aa839/scheduling` returned `200` and the dev log showed the route compiled successfully.

## Commands Run
- `Get-Content -Raw -LiteralPath "LLM/handoffs/schedule-redesign.md"`
- `Get-Content -Raw -LiteralPath "LLM/context/schedule-redesign.md"`
- `Get-Content -Raw -LiteralPath "src/app/projects/[id]/layout.tsx"`
- `Get-Content -Raw -LiteralPath "src/app/projects/[id]/scheduling/page.tsx"`
- `Get-Content -Raw -LiteralPath "src/components/JobTimeline.tsx"`
- `Get-Content -Raw -LiteralPath "src/app/projects/[id]/manage/page.tsx"`
- `Get-Content -Raw -LiteralPath "src/lib/types.ts"`
- `Get-Content -Raw -LiteralPath "src/lib/defaults.ts"`
- `Get-Content -Raw -LiteralPath "src/app/globals.css"`
- `Get-Content -Raw -LiteralPath "C:\Users\lehoa\.codex\plugins\cache\openai-curated-remote\vercel\1.0.0\skills\nextjs\SKILL.md"`
- `Get-Content -Raw -LiteralPath "C:\Users\lehoa\.codex\plugins\cache\openai-curated-remote\vercel\1.0.0\skills\react-best-practices\SKILL.md"`
- `npx tsc --noEmit`
- `npm run build`
- `Start-Process -FilePath "npm.cmd" -ArgumentList @("run", "dev", "--", "-p", "3001") ...`
- `Invoke-WebRequest -Uri "http://localhost:3001/projects/648177ec-1956-45c6-b39e-7af8e99aa839/scheduling" -UseBasicParsing -TimeoutSec 30`
- Browser-check attempts:
  - `where.exe agent-browser` failed: `agent-browser` is not installed in this shell.
  - Playwright import succeeded through the Node REPL, but the bundled Chromium executable was missing.
  - Launching installed Chrome through Playwright failed with sandbox `spawn EPERM`, so no live visual click/save test was completed.

## Manual Rendering Description
The new `JobTimeline` renders as DOM/CSS instead of canvas: a panel contains a rounded search pill, an optional blue `Add phase` button, a month ruler aligned to a 190px label column, and one roomy row per phase. Each row has a category icon/color swatch, the phase name, a horizontal track, and either a fully rounded colored bar labeled with a short month range or a DOM diamond for start-only phases. The today marker remains a full-height vertical line using `var(--accent)`, preserving the app's green accent. The bottom status legend was removed, and the component inherits the app UI font instead of applying the old JetBrains Mono canvas font.

## Sidebar Sticky / Max-Height Confirmation
`src/app/projects/[id]/layout.tsx` applies the requested sidebar style directly on the existing `<aside>` while keeping its class list and `borderRadius: 26`: `position: "sticky"`, `top: 20`, `maxHeight: "calc(100vh - 40px)"`, and `overflowY: "auto"`. This caps the nav to the viewport minus the page wrapper's 20px top and bottom padding, so long main content scrolls independently while the sidebar stays pinned and internally scrollable if needed.

## Quick-Add / Jobs & Bids Confirmation
The `+ Add phase` popover lives on the schedule page and appends through `useProjectContext().setProject`, using the same `project.jobs` array that Jobs & Bids reads. The saved object mirrors `manage/page.tsx` defaults: `id: makeId()`, `status: "N/A"`, `approvedBidderId: null`, `color: ""`, `estimatedCost: 0`, `sourceItemId: ""`, and `bidders: []`, with category defaulting to `categories[0] ?? "Designing"` and start date defaulting to the project start date or today. Because `manage/page.tsx` renders from the same context-backed `project.jobs`, a newly saved phase appears there via the existing autosave/cache path; no separate API or save path was added. This was verified by code-path reasoning because a live browser save test was unavailable in this environment.

## File Change Confirmation
Implementation edits were limited to the three allowed files:

- `src/app/projects/[id]/layout.tsx`
- `src/app/projects/[id]/scheduling/page.tsx`
- `src/components/JobTimeline.tsx`

No new helper file was added. No Jobs & Bids, type, default, CSS, API, or storage file was changed for this task. This required report was added at `LLM/completions/schedule-redesign.md`. The working tree also contains pre-existing unrelated modified/untracked files (`LLM/CURRENT_TASKS.md`, `LLM/context/schedule-redesign.md`, `LLM/handoffs/schedule-redesign.md`, `tsconfig.tsbuildinfo`) that were not implementation edits for this handoff.

## Exact Diff: `src/app/projects/[id]/layout.tsx`
```diff
diff --git a/src/app/projects/[id]/layout.tsx b/src/app/projects/[id]/layout.tsx
index a70495a..9aac682 100644
--- a/src/app/projects/[id]/layout.tsx
+++ b/src/app/projects/[id]/layout.tsx
@@ -172,3 +172,3 @@ function ShellChrome({ id, children }: { id: string; children: React.ReactNode }
     },
-    { key: "scheduling", label: "Scheduling", icon: CalendarRange, href: `${base}/scheduling`, active: inScheduling },
+    { key: "scheduling", label: "Schedule", icon: CalendarRange, href: `${base}/scheduling`, active: inScheduling },
     { key: "files", label: "Files", icon: FolderOpen, href: `${base}/files`, active: inFiles },
@@ -194,3 +194,3 @@ function ShellChrome({ id, children }: { id: string; children: React.ReactNode }
         : inScheduling
-          ? { kicker: t("Timeline"), title: t("Scheduling") }
+          ? { kicker: t("Timeline"), title: t("Schedule") }
           : inFiles
@@ -213,3 +213,6 @@ function ShellChrome({ id, children }: { id: string; children: React.ReactNode }
       <div className="flex gap-4 sm:gap-[18px] items-start">
-        <aside className="panel no-print w-[244px] shrink-0 p-[15px] hidden lg:flex flex-col self-stretch" style={{ borderRadius: 26 }}>
+        <aside
+          className="panel no-print w-[244px] shrink-0 p-[15px] hidden lg:flex flex-col self-stretch"
+          style={{ borderRadius: 26, position: "sticky", top: 20, maxHeight: "calc(100vh - 40px)", overflowY: "auto" }}
+        >
           <div className="panel-2 flex items-center gap-3 p-[11px] mb-4">
```

## Exact Diff: `src/app/projects/[id]/scheduling/page.tsx`
```diff
diff --git a/src/app/projects/[id]/scheduling/page.tsx b/src/app/projects/[id]/scheduling/page.tsx
index c0eb7c5..f2d7514 100644
--- a/src/app/projects/[id]/scheduling/page.tsx
+++ b/src/app/projects/[id]/scheduling/page.tsx
@@ -5,10 +5,110 @@ import { useRouter } from "next/navigation";
 import { Maximize2, Minimize2 } from "lucide-react";
-import { useProjectContext } from "@/lib/projectContext";
+
 import { SaveIndicator } from "@/components/fields";
-import { JobTimeline } from "@/components/JobTimeline";
-import type { Project, Job } from "@/lib/types";
+import JobTimeline from "@/components/JobTimeline";
+import { makeId } from "@/lib/defaults";
+import { useJobCategories } from "@/lib/useJobCategories";
+import { useProjectContext } from "@/lib/projectContext";
+import type { Project } from "@/lib/types";
+
+function todayIso(): string {
+  return new Date().toISOString().slice(0, 10);
+}
+
+type QuickAddPopoverProps = {
+  categories: string[];
+  category: string;
+  startDate: string;
+  endDate: string;
+  onCategoryChange: (value: string) => void;
+  onStartDateChange: (value: string) => void;
+  onEndDateChange: (value: string) => void;
+  onClose: () => void;
+  onSave: () => void;
+};
+
+function QuickAddPopover({
+  categories,
+  category,
+  startDate,
+  endDate,
+  onCategoryChange,
+  onStartDateChange,
+  onEndDateChange,
+  onClose,
+  onSave,
+}: QuickAddPopoverProps) {
+  const options = Array.from(new Set([category, ...categories].filter(Boolean)));
+
+  return (
+    <>
+      <button
+        type="button"
+        aria-label="Close add phase"
+        className="fixed inset-0 z-40 cursor-default bg-transparent"
+        onClick={onClose}
+      />
+      <div
+        className="absolute right-5 top-[78px] z-50 w-[min(340px,calc(100vw-40px))] rounded-[22px] border p-4 shadow-[0_28px_80px_rgba(0,0,0,0.34)]"
+        style={{
+          background: "var(--glass-strong)",
+          backdropFilter: "var(--blur)",
+          borderColor: "var(--line)",
+          borderTopColor: "var(--line-strong)",
+        }}
+      >
+        <div className="space-y-3">
+          <label className="block">
+            <span className="label-mono mb-1 block text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
+              Phase
+            </span>
+            <select className="field-input h-11 w-full" value={category} onChange={(event) => onCategoryChange(event.target.value)}>
+              {options.map((option) => (
+                <option key={option} value={option}>
+                  {option}
+                </option>
+              ))}
+            </select>
+          </label>
+
+          <div className="grid grid-cols-2 gap-3">
+            <label className="block">
+              <span className="label-mono mb-1 block text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
+                Start
+              </span>
+              <input
+                className="field-input h-11 w-full"
+                type="date"
+                value={startDate}
+                onChange={(event) => onStartDateChange(event.target.value)}
+              />
+            </label>
+            <label className="block">
+              <span className="label-mono mb-1 block text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
+                End
+              </span>
+              <input
+                className="field-input h-11 w-full"
+                type="date"
+                min={startDate || undefined}
+                value={endDate}
+                onChange={(event) => onEndDateChange(event.target.value)}
+              />
+            </label>
+          </div>
+
+          <div className="flex items-center justify-end gap-2 pt-1">
+            <button type="button" className="btn h-10 px-4" onClick={onClose}>
+              Cancel
+            </button>
+            <button type="button" className="btn btn-blue h-10 px-4" onClick={onSave}>
+              Add phase
+            </button>
+          </div>
+        </div>
+      </div>
+    </>
+  );
+}
 
-/** Scheduling — the project timeline (Gantt) for every job, pulled straight
- *  from the Jobs & Bids data. Recoloring a bar autosaves; clicking a job opens
- *  it back on the Jobs & Bids tab. */
 export default function SchedulingPage() {
@@ -16,5 +116,11 @@ export default function SchedulingPage() {
   const router = useRouter();
+  const { categories } = useJobCategories();
   const [expanded, setExpanded] = useState(false);
+  const [search, setSearch] = useState("");
+  const [quickAddOpen, setQuickAddOpen] = useState(false);
+  const [quickCategory, setQuickCategory] = useState("");
+  const [quickStartDate, setQuickStartDate] = useState("");
+  const [quickEndDate, setQuickEndDate] = useState("");
 
-  if (loading) return <div className="font-mono text-ink-muted text-sm uppercase">Loading…</div>;
+  if (loading) return <div className="font-mono text-ink-muted text-sm uppercase">Loading...</div>;
   if (error) return <div className="panel border-red text-red p-4 font-mono text-sm">{error}</div>;
@@ -23,50 +129,88 @@ export default function SchedulingPage() {
   const base = `/projects/${project.id}`;
+  const defaultStartDate = project.startDate || todayIso();
+  const searchTerm = search.trim().toLowerCase();
+  const filteredJobs = searchTerm
+    ? project.jobs.filter((job) => job.category.toLowerCase().includes(searchTerm))
+    : project.jobs;
 
-  function updateJob(jobId: string, updater: (j: Job) => Job) {
-    setProject((p: Project) => ({ ...p, jobs: p.jobs.map((j) => (j.id === jobId ? updater(j) : j)) }));
+  function openInJobs(jobId: string) {
+    router.push(`${base}/manage?job=${jobId}`);
+  }
+
+  function openQuickAdd() {
+    setQuickCategory(categories[0] ?? "Designing");
+    setQuickStartDate(defaultStartDate);
+    setQuickEndDate("");
+    setQuickAddOpen(true);
+  }
+
+  function saveQuickAdd() {
+    setProject((currentProject: Project) => ({
+      ...currentProject,
+      jobs: [
+        ...currentProject.jobs,
+        {
+          id: makeId(),
+          category: quickCategory || categories[0] || "Designing",
+          startDate: quickStartDate || currentProject.startDate || todayIso(),
+          endDate: quickEndDate,
+          status: "N/A",
+          approvedBidderId: null,
+          color: "",
+          estimatedCost: 0,
+          sourceItemId: "",
+          bidders: [],
+        },
+      ],
+    }));
+    setQuickAddOpen(false);
   }
-  // Selecting a job sends you to Jobs & Bids with that job's drawer open.
-  const openInJobs = (jobId: string) => router.push(`${base}/manage?job=${jobId}`);
 
   return (
-    <div className="space-y-6">
-      {/* Intro + save status */}
-      <div className="flex items-end justify-between gap-4 flex-wrap">
-        <div>
-          <h1 className="font-display font-extrabold text-2xl leading-none">Scheduling</h1>
-          <p className="text-sm text-ink-muted mt-1.5 max-w-2xl">
-            Every job positioned by its start and (optional) end date — pulled live from Jobs &amp; Bids. Recolor a
-            bar here, or click one to open it on the Jobs &amp; Bids tab.
-          </p>
-        </div>
-        <div className="flex items-center gap-2.5">
-          <SaveIndicator state={saveState} />
-          {project.jobs.length > 0 && (
-            <button onClick={() => setExpanded(true)} className="btn inline-flex items-center gap-1.5 shrink-0">
-              <Maximize2 size={14} /> Expand
-            </button>
-          )}
+    <>
+      <main className="space-y-5">
+        <div className="flex justify-end">
+          <div className="flex items-center gap-2.5">
+            <SaveIndicator state={saveState} />
+            {project.jobs.length > 0 && (
+              <button type="button" className="btn h-10 gap-2 px-4" onClick={() => setExpanded(true)}>
+                <Maximize2 size={16} />
+                Expand
+              </button>
+            )}
+          </div>
         </div>
-      </div>
 
-      {project.jobs.length === 0 ? (
-        <div className="panel p-8 text-center">
-          <p className="text-sm text-ink-muted">
-            No jobs yet. Add construction scopes on the{" "}
-            <button onClick={() => router.push(`${base}/manage`)} className="text-accent font-bold underline-offset-2 hover:underline">
-              Jobs &amp; Bids
-            </button>{" "}
-            tab and they&rsquo;ll appear here on the timeline.
-          </p>
+        <div className="relative">
+          <JobTimeline
+            jobs={filteredJobs}
+            selectedJobId={null}
+            onSelect={openInJobs}
+            onAddJob={openQuickAdd}
+            onColorChange={(jobId, color) =>
+              setProject((currentProject: Project) => ({
+                ...currentProject,
+                jobs: currentProject.jobs.map((job) => (job.id === jobId ? { ...job, color } : job)),
+              }))
+            }
+            searchValue={search}
+            onSearchChange={setSearch}
+          />
+
+          {quickAddOpen && (
+            <QuickAddPopover
+              categories={categories}
+              category={quickCategory}
+              startDate={quickStartDate}
+              endDate={quickEndDate}
+              onCategoryChange={setQuickCategory}
+              onStartDateChange={setQuickStartDate}
+              onEndDateChange={setQuickEndDate}
+              onClose={() => setQuickAddOpen(false)}
+              onSave={saveQuickAdd}
+            />
+          )}
         </div>
-      ) : (
-        <JobTimeline
-          jobs={project.jobs}
-          selectedJobId={null}
-          onSelect={openInJobs}
-          onColorChange={(jobId, color) => updateJob(jobId, (j) => ({ ...j, color }))}
-        />
-      )}
+      </main>
 
-      {/* Expanded timeline — 3/4 of the screen */}
       {expanded && (
@@ -90,3 +234,3 @@ export default function SchedulingPage() {
             }}
-            onClick={(e) => e.stopPropagation()}
+            onClick={(event) => event.stopPropagation()}
           >
@@ -94,7 +238,8 @@ export default function SchedulingPage() {
               <div>
-                <div className="label-mono">Scheduling · Timeline</div>
+                <div className="label-mono">Schedule / Timeline</div>
                 <h2 className="font-display font-extrabold text-xl leading-none mt-0.5">{project.name}</h2>
               </div>
-              <button onClick={() => setExpanded(false)} className="btn inline-flex items-center gap-1.5">
-                <Minimize2 size={14} /> Close
+              <button type="button" className="btn inline-flex items-center gap-1.5" onClick={() => setExpanded(false)}>
+                <Minimize2 size={14} />
+                Close
               </button>
@@ -103,6 +248,13 @@ export default function SchedulingPage() {
               <JobTimeline
-                jobs={project.jobs}
+                jobs={filteredJobs}
                 selectedJobId={null}
                 onSelect={openInJobs}
-                onColorChange={(jobId, color) => updateJob(jobId, (j) => ({ ...j, color }))}
+                onColorChange={(jobId, color) =>
+                  setProject((currentProject: Project) => ({
+                    ...currentProject,
+                    jobs: currentProject.jobs.map((job) => (job.id === jobId ? { ...job, color } : job)),
+                  }))
+                }
+                searchValue={search}
+                onSearchChange={setSearch}
               />
@@ -112,3 +264,3 @@ export default function SchedulingPage() {
       )}
-    </div>
+    </>
   );
```

## Exact Diff: `src/components/JobTimeline.tsx`
```diff
diff --git a/src/components/JobTimeline.tsx b/src/components/JobTimeline.tsx
index a2064d1..05a4bb7 100644
--- a/src/components/JobTimeline.tsx
+++ b/src/components/JobTimeline.tsx
@@ -2,21 +2,18 @@
 
-import { useCallback, useEffect, useMemo, useRef, useState } from "react";
-import { Plus } from "lucide-react";
+import { useState } from "react";
+import {
+  Archive,
+  Hammer,
+  Home,
+  Layers,
+  LayoutGrid,
+  Plus,
+  Search,
+  Wrench,
+  Zap,
+} from "lucide-react";
 import { JOB_COLOR_PALETTE, contrastText } from "@/lib/jobs";
-import { useTheme } from "@/lib/theme";
 import type { Job, JobStatus } from "@/lib/types";
 
-const MONO = "'JetBrains Mono', monospace";
-
-/** Parse "#rrggbb" + alpha → rgba() string for canvas fills. */
-function hexA(hex: string, a: number): string {
-  const c = hex.replace("#", "");
-  if (c.length < 6) return hex;
-  const r = parseInt(c.slice(0, 2), 16);
-  const g = parseInt(c.slice(2, 4), 16);
-  const b = parseInt(c.slice(4, 6), 16);
-  return `rgba(${r},${g},${b},${a})`;
-}
-
-/** Status → bar fill in the warm "estate" palette, progressing as a job
+/** Status -> bar fill in the warm "estate" palette, progressing as a job
  *  advances. Vivid enough to read on both light and dark surfaces. */
@@ -37,10 +34,13 @@ const DAY = 86_400_000;
 const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
-
-const LABEL_W = 150;
-const HEADER_H = 44;
-const ROW_H = 36;
-const PAD_BOTTOM = 12;
-const SWATCH_X = 12;
-const SWATCH_SIZE = 14;
-const LABEL_TEXT_X = SWATCH_X + SWATCH_SIZE + 8;
+const LABEL_COL_W = 190;
+const ROW_H = 56;
+
+const PHASE_ICON_RULES = [
+  { terms: ["framing", "drywall", "labor", "demo", "construction"], Icon: Hammer },
+  { terms: ["electric", "electrical"], Icon: Zap },
+  { terms: ["plumb", "hvac", "mechanic"], Icon: Wrench },
+  { terms: ["roof", "exterior", "siding"], Icon: Home },
+  { terms: ["cabinet", "countertop"], Icon: Archive },
+  { terms: ["floor", "tile"], Icon: LayoutGrid },
+];
 
@@ -50,2 +50,3 @@ function barColorOf(j: Job): string {
 }
+
 function barTextOf(j: Job): string {
@@ -54,291 +55,96 @@ function barTextOf(j: Job): string {
 
-function startOfMonth(t: number): number {
-  const d = new Date(t);
-  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
-}
-function addMonth(t: number): number {
-  const d = new Date(t);
-  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1);
-}
-function parse(d: string): number | null {
-  if (!d) return null;
-  const t = new Date(d).getTime();
-  return Number.isFinite(t) ? t : null;
+function phaseIconOf(category: string) {
+  const lower = category.toLowerCase();
+  return PHASE_ICON_RULES.find((rule) => rule.terms.some((term) => lower.includes(term)))?.Icon ?? Layers;
 }
 
-export function JobTimeline({
-  jobs,
-  selectedJobId,
-  onSelect,
-  onAddJob,
-  onColorChange,
-}: {
-  jobs: Job[];
-  selectedJobId: string | null;
-  onSelect: (id: string) => void;
-  onAddJob?: () => void;
-  onColorChange?: (jobId: string, color: string) => void;
-}) {
-  const wrapRef = useRef<HTMLDivElement>(null);
-  const canvasRef = useRef<HTMLCanvasElement>(null);
-  const [width, setWidth] = useState(0);
-  const [hoverRow, setHoverRow] = useState<number | null>(null);
-  const [picker, setPicker] = useState<{ jobId: string; x: number; y: number } | null>(null);
-  const { theme } = useTheme(); // re-read tokens + redraw when the theme flips
-
-  // Track container width for a responsive, crisp canvas.
-  useEffect(() => {
-    const el = wrapRef.current;
-    if (!el) return;
-    const ro = new ResizeObserver((entries) => {
-      for (const e of entries) setWidth(e.contentRect.width);
-    });
-    ro.observe(el);
-    setWidth(el.clientWidth);
-    return () => ro.disconnect();
-  }, []);
-
-  // Compute the visible date domain (snapped to whole months). Memoized so the
-  // reference is stable across unrelated re-renders — otherwise `draw` would be
-  // recreated every render and the canvas would redraw on every keystroke.
-  const domain = useMemo(() => {
-    const times: number[] = [];
-    for (const j of jobs) {
-      const s = parse(j.startDate);
-      const e = parse(j.endDate) ?? (s != null ? s + 14 * DAY : null);
-      if (s != null) times.push(s);
-      if (e != null) times.push(e);
-    }
-    if (times.length === 0) return null;
-    const min = startOfMonth(Math.min(...times));
-    let max = addMonth(Math.max(...times)); // end at start of the following month
-    if (max - min < 28 * DAY) max = addMonth(max);
-    return { min, max };
-  }, [jobs]);
-
-  const height = HEADER_H + jobs.length * ROW_H + PAD_BOTTOM;
-
-  const draw = useCallback(() => {
-    const canvas = canvasRef.current;
-    if (!canvas || !domain || width === 0) return;
-    const dpr = window.devicePixelRatio || 1;
-    canvas.width = width * dpr;
-    canvas.height = height * dpr;
-    canvas.style.width = `${width}px`;
-    canvas.style.height = `${height}px`;
-    const ctx = canvas.getContext("2d");
-    if (!ctx) return;
-    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
-    ctx.clearRect(0, 0, width, height);
-
-    // Pull live design tokens so the timeline matches the active theme.
-    const cs = getComputedStyle(document.documentElement);
-    const cv = (n: string, f: string) => cs.getPropertyValue(n).trim() || f;
-    const textHex = cv("--text", "#2B2420");
-    const accentHex = cv("--accent", "#C65D3B");
-    const C = {
-      surface: cv("--surface-solid", "#FFFFFF"),
-      ink: textHex,
-      inkMuted: cv("--muted", "#8C7E73"),
-      grid: cv("--border", "rgba(120,86,60,0.16)"),
-      gridStrong: hexA(textHex, 0.22),
-      accent: accentHex,
-      rowAlt: hexA(textHex, 0.035),
-      hover: hexA(textHex, 0.06),
-      selected: hexA(accentHex, 0.12),
-    };
-
-    const plotX = LABEL_W;
-    const plotW = width - LABEL_W;
-    const span = domain.max - domain.min;
-    const xOf = (t: number) => plotX + ((t - domain.min) / span) * plotW;
-
-    // Background
-    ctx.fillStyle = C.surface;
-    ctx.fillRect(0, 0, width, height);
-
-    // Row striping + selection/hover highlight
-    jobs.forEach((j, i) => {
-      const y = HEADER_H + i * ROW_H;
-      if (j.id === selectedJobId) ctx.fillStyle = C.selected;
-      else if (i === hoverRow) ctx.fillStyle = C.hover;
-      else ctx.fillStyle = i % 2 === 0 ? "transparent" : C.rowAlt;
-      if (ctx.fillStyle !== "transparent") ctx.fillRect(0, y, width, ROW_H);
-    });
-
-    // Month gridlines + labels
-    const months: number[] = [];
-    for (let m = domain.min; m < domain.max; m = addMonth(m)) months.push(m);
-    const monthW = plotW / months.length;
-    const labelEvery = monthW < 42 ? Math.ceil(42 / monthW) : 1;
-
-    ctx.textBaseline = "middle";
-    months.forEach((m, idx) => {
-      const x = xOf(m);
-      ctx.strokeStyle = C.grid;
-      ctx.lineWidth = 1;
-      ctx.beginPath();
-      ctx.moveTo(Math.round(x) + 0.5, HEADER_H - 8);
-      ctx.lineTo(Math.round(x) + 0.5, height);
-      ctx.stroke();
-
-      if (idx % labelEvery === 0) {
-        const d = new Date(m);
-        const showYear = d.getUTCMonth() === 0 || idx === 0;
-        ctx.fillStyle = C.inkMuted;
-        ctx.font = `600 11px ${MONO}`;
-        ctx.textAlign = "left";
-        const label = showYear ? `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}` : MONTHS[d.getUTCMonth()];
-        ctx.fillText(label, x + 5, HEADER_H / 2);
-      }
-    });
+function parseDate(value: string): number | null {
+  if (!value) return null;
+  const [year, month, day] = value.split("-").map(Number);
+  if (!year || !month || !day) return null;
+  const time = Date.UTC(year, month - 1, day);
+  return Number.isFinite(time) ? time : null;
+}
 
-    // Header baseline + label-gutter divider
-    ctx.strokeStyle = C.gridStrong;
-    ctx.lineWidth = 1.5;
-    ctx.beginPath();
-    ctx.moveTo(0, HEADER_H + 0.5);
-    ctx.lineTo(width, HEADER_H + 0.5);
-    ctx.moveTo(plotX + 0.5, 0);
-    ctx.lineTo(plotX + 0.5, height);
-    ctx.stroke();
+function startOfMonth(time: number): number {
+  const d = new Date(time);
+  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
+}
 
-    // "Today" marker
-    const now = Date.now();
-    if (now >= domain.min && now <= domain.max) {
-      const x = xOf(now);
-      ctx.strokeStyle = C.accent;
-      ctx.lineWidth = 1.5;
-      ctx.setLineDash([4, 3]);
-      ctx.beginPath();
-      ctx.moveTo(x, HEADER_H - 4);
-      ctx.lineTo(x, height);
-      ctx.stroke();
-      ctx.setLineDash([]);
-      ctx.fillStyle = C.accent;
-      ctx.font = `700 9px ${MONO}`;
-      ctx.textAlign = "center";
-      ctx.fillText("TODAY", x, HEADER_H - 14);
-    }
+function addMonth(time: number): number {
+  const d = new Date(time);
+  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1);
+}
 
-    // Job rows: labels + bars
-    jobs.forEach((j, i) => {
-      const y = HEADER_H + i * ROW_H;
-      const cy = y + ROW_H / 2;
+function monthName(time: number): string {
+  return MONTHS[new Date(time).getUTCMonth()];
+}
 
-      // Color swatch (click to recolor) in the left gutter
-      const sy = cy - SWATCH_SIZE / 2;
-      ctx.fillStyle = barColorOf(j);
-      roundRect(ctx, SWATCH_X, sy, SWATCH_SIZE, SWATCH_SIZE, 4);
-      ctx.fill();
-      ctx.strokeStyle = picker?.jobId === j.id ? C.accent : C.gridStrong;
-      ctx.lineWidth = picker?.jobId === j.id ? 2 : 1;
-      roundRect(ctx, SWATCH_X, sy, SWATCH_SIZE, SWATCH_SIZE, 4);
-      ctx.stroke();
+function monthRangeLabel(start: number, end: number): string {
+  const s = monthName(start);
+  const e = monthName(end);
+  return s === e ? s : `${s} \u2013 ${e}`;
+}
 
-      // Label
-      ctx.fillStyle = j.id === selectedJobId ? C.accent : C.ink;
-      ctx.font = `${j.id === selectedJobId ? "700" : "500"} 12px ${MONO}`;
-      ctx.textAlign = "left";
-      const label = j.category.length > 15 ? j.category.slice(0, 14) + "…" : j.category;
-      ctx.fillText(label, LABEL_TEXT_X, cy);
+function pointPct(time: number, domain: { min: number; max: number }): number {
+  return ((time - domain.min) / (domain.max - domain.min)) * 100;
+}
 
-      const s = parse(j.startDate);
-      if (s == null) {
-        ctx.fillStyle = C.inkMuted;
-        ctx.font = `10px ${MONO}`;
-        ctx.fillText("no date", plotX + 8, cy);
-        return;
-      }
-      const e = parse(j.endDate);
-      const bar = barColorOf(j);
-      const text = barTextOf(j);
-      const barH = 20;
-      const by = cy - barH / 2;
+function clampPct(value: number): number {
+  return Math.max(0, Math.min(100, value));
+}
 
-      if (e == null) {
-        // Milestone diamond at the start date
-        const x = xOf(s);
-        ctx.fillStyle = bar;
-        ctx.strokeStyle = hexA(textHex, 0.25);
-        ctx.lineWidth = 1;
-        ctx.beginPath();
-        ctx.moveTo(x, cy - 8);
-        ctx.lineTo(x + 8, cy);
-        ctx.lineTo(x, cy + 8);
-        ctx.lineTo(x - 8, cy);
-        ctx.closePath();
-        ctx.fill();
-        ctx.stroke();
-        ctx.fillStyle = C.inkMuted;
-        ctx.font = `10px ${MONO}`;
-        ctx.textAlign = "left";
-        ctx.fillText(j.startDate, x + 12, cy);
-      } else {
-        const x1 = xOf(s);
-        const x2 = Math.max(xOf(e), x1 + 6);
-        const w = x2 - x1;
-        const r = 8;
-        // Bar with a subtle vertical sheen + specular top edge for the glass feel
-        const grad = ctx.createLinearGradient(0, by, 0, by + barH);
-        grad.addColorStop(0, hexA("#ffffff", 0.22));
-        grad.addColorStop(0.12, "rgba(255,255,255,0)");
-        ctx.fillStyle = bar;
-        roundRect(ctx, x1, by, w, barH, r);
-        ctx.fill();
-        ctx.fillStyle = grad;
-        roundRect(ctx, x1, by, w, barH, r);
-        ctx.fill();
-        // Duration label inside if it fits, else to the right
-        const days = Math.max(1, Math.round((e - s) / DAY));
-        const durText = `${days}d`;
-        ctx.font = `600 10px ${MONO}`;
-        const tw = ctx.measureText(durText).width;
-        if (w > tw + 12) {
-          ctx.fillStyle = text;
-          ctx.textAlign = "center";
-          ctx.fillText(durText, x1 + w / 2, cy);
-        } else {
-          ctx.fillStyle = C.inkMuted;
-          ctx.textAlign = "left";
-          ctx.fillText(durText, x2 + 5, cy);
-        }
-      }
-    });
-  }, [jobs, domain, width, height, hoverRow, selectedJobId, picker, theme]);
+function buildDomain(jobs: Job[]): { min: number; max: number } | null {
+  const times: number[] = [];
+  for (const job of jobs) {
+    const start = parseDate(job.startDate);
+    const end = parseDate(job.endDate);
+    if (start != null) times.push(start);
+    if (end != null) times.push(end);
+  }
+  if (times.length === 0) return null;
 
-  useEffect(() => {
-    draw();
-  }, [draw]);
+  const min = startOfMonth(Math.min(...times));
+  let max = addMonth(Math.max(...times));
+  if (max - min < 45 * DAY) max = addMonth(max);
+  return { min, max };
+}
 
-  // Hit-test helpers shared by hover + click.
-  function rowAt(clientY: number): number | null {
-    const canvas = canvasRef.current;
-    if (!canvas) return null;
-    const rect = canvas.getBoundingClientRect();
-    const y = clientY - rect.top;
-    if (y < HEADER_H) return null;
-    const idx = Math.floor((y - HEADER_H) / ROW_H);
-    return idx >= 0 && idx < jobs.length ? idx : null;
-  }
+function monthsInDomain(domain: { min: number; max: number }): number[] {
+  const months: number[] = [];
+  for (let time = domain.min; time < domain.max; time = addMonth(time)) months.push(time);
+  return months;
+}
 
-  /** Is this x (relative to the canvas) over the color swatch? */
-  function overSwatch(clientX: number): boolean {
-    const canvas = canvasRef.current;
-    if (!canvas) return false;
-    const rect = canvas.getBoundingClientRect();
-    const x = clientX - rect.left;
-    return x >= SWATCH_X - 4 && x <= SWATCH_X + SWATCH_SIZE + 4;
-  }
+type JobTimelineProps = {
+  jobs: Job[];
+  selectedJobId: string | null;
+  onSelect: (id: string) => void;
+  onAddJob?: () => void;
+  onColorChange?: (jobId: string, color: string) => void;
+  searchValue?: string;
+  onSearchChange?: (value: string) => void;
+};
 
-  function handleCanvasClick(clientX: number, clientY: number) {
-    const idx = rowAt(clientY);
-    if (idx == null) return;
-    const job = jobs[idx];
-    // A click on the swatch opens the color picker; elsewhere opens the drawer.
-    if (onColorChange && overSwatch(clientX)) {
-      setPicker({ jobId: job.id, x: LABEL_TEXT_X, y: HEADER_H + idx * ROW_H + ROW_H - 2 });
-    } else {
-      onSelect(job.id);
-    }
+export function JobTimeline({
+  jobs,
+  selectedJobId,
+  onSelect,
+  onAddJob,
+  onColorChange,
+  searchValue = "",
+  onSearchChange,
+}: JobTimelineProps) {
+  const [pickerJobId, setPickerJobId] = useState<string | null>(null);
+  const domain = buildDomain(jobs);
+  const months = domain ? monthsInDomain(domain) : [];
+  const today = Date.now();
+  const todayPct = domain && today >= domain.min && today <= domain.max ? clampPct(pointPct(today, domain)) : null;
+  const pickerIndex = pickerJobId ? jobs.findIndex((job) => job.id === pickerJobId) : -1;
+  const pickerJob = pickerIndex >= 0 ? jobs[pickerIndex] : null;
+
+  function rowKeyDown(e: React.KeyboardEvent<HTMLDivElement>, jobId: string) {
+    if (e.key !== "Enter" && e.key !== " ") return;
+    e.preventDefault();
+    onSelect(jobId);
   }
@@ -346,7 +152,24 @@ export function JobTimeline({
   const toolbar = (
-    <div className="flex items-center justify-between mb-3">
-      <span className="label-mono">Schedule</span>
+    <div className="flex items-center gap-3 mb-5">
+      <div
+        className="flex-1 min-w-[180px] flex items-center gap-2 px-3.5"
+        style={{
+          height: 42,
+          borderRadius: 999,
+          background: "var(--glass-2)",
+          border: "1px solid var(--border)",
+        }}
+      >
+        <Search size={16} className="text-ink-muted shrink-0" />
+        <input
+          value={searchValue}
+          onChange={(e) => onSearchChange?.(e.target.value)}
+          placeholder="Search..."
+          aria-label="Search phases"
+          className="w-full bg-transparent outline-none text-[13px] font-semibold text-ink placeholder:text-ink-muted"
+        />
+      </div>
       {onAddJob && (
-        <button onClick={onAddJob} className="btn btn-blue inline-flex items-center gap-1.5 !py-1.5">
-          <Plus size={13} /> Add job
+        <button type="button" onClick={onAddJob} className="btn btn-blue inline-flex items-center gap-1.5 shrink-0 !py-2.5">
+          <Plus size={15} /> Add phase
         </button>
@@ -358,5 +181,11 @@ export function JobTimeline({
     return (
-      <div className="panel p-4">
+      <div className="panel p-5 sm:p-6">
         {toolbar}
-        <p className="text-sm text-ink-muted">Add start dates to your jobs to see them on the timeline.</p>
+        <div className="text-sm text-ink-muted">
+          {jobs.length === 0
+            ? searchValue.trim()
+              ? "No phases match your search."
+              : "Add a phase or add start dates to your jobs to see them on the timeline."
+            : "Add start dates to your jobs to see them on the timeline."}
+        </div>
       </div>
@@ -366,88 +195,179 @@ export function JobTimeline({
   return (
-    <div className="panel p-4">
+    <div className="panel p-5 sm:p-6">
       {toolbar}
-      {onColorChange && (
-        <p className="text-[11px] text-ink-muted mb-2 -mt-1">
-          Tip: click a job&rsquo;s color chip on the left to recolor its bar.
-        </p>
-      )}
-      <div ref={wrapRef} className="w-full relative">
-        <canvas
-          ref={canvasRef}
-          className="block"
-          style={{ cursor: hoverRow != null ? "pointer" : "default" }}
-          onMouseMove={(e) => setHoverRow(rowAt(e.clientY))}
-          onMouseLeave={() => setHoverRow(null)}
-          onClick={(e) => handleCanvasClick(e.clientX, e.clientY)}
-        />
+      <div className="overflow-x-auto">
+        <div className="min-w-[760px]">
+          <div className="grid items-end" style={{ gridTemplateColumns: `${LABEL_COL_W}px minmax(0,1fr)` }}>
+            <div />
+            <div className="flex h-9 text-[12px] font-bold text-ink-muted">
+              {months.map((month) => (
+                <div key={month} className="relative flex-1 pl-3 border-l" style={{ borderColor: "var(--border)" }}>
+                  {monthName(month)}
+                </div>
+              ))}
+            </div>
+          </div>
+
+          <div className="relative">
+            {todayPct != null && (
+              <div className="absolute inset-y-0 z-20 pointer-events-none" style={{ left: LABEL_COL_W, right: 0 }}>
+                <div
+                  className="absolute top-0 bottom-0"
+                  style={{ left: `${todayPct}%`, borderLeft: "2px solid var(--accent)" }}
+                >
+                  <span
+                    className="absolute -top-5 -translate-x-1/2 text-[10px] font-extrabold uppercase"
+                    style={{ color: "var(--accent)" }}
+                  >
+                    Today
+                  </span>
+                </div>
+              </div>
+            )}
+
+            {jobs.map((job, index) => {
+              const Icon = phaseIconOf(job.category);
+              const start = parseDate(job.startDate);
+              const end = parseDate(job.endDate);
+              const isSelected = job.id === selectedJobId;
+              const barColor = barColorOf(job);
+              const textColor = barTextOf(job);
+              const startPct = start == null ? 0 : clampPct(pointPct(start, domain));
+              const safeEnd = end != null && start != null ? Math.max(end, start + DAY) : null;
+              const endPct = safeEnd == null ? startPct : clampPct(pointPct(safeEnd, domain));
+              const widthPct = Math.max(1, endPct - startPct);
+
+              return (
+                <div
+                  key={job.id}
+                  role="button"
+                  tabIndex={0}
+                  onClick={() => onSelect(job.id)}
+                  onKeyDown={(e) => rowKeyDown(e, job.id)}
+                  className="group grid items-center rounded-[18px] transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] hover:bg-[var(--glass-2)]"
+                  style={{
+                    gridTemplateColumns: `${LABEL_COL_W}px minmax(0,1fr)`,
+                    minHeight: ROW_H,
+                    background: isSelected ? "var(--accent-soft)" : index % 2 ? "rgba(255,255,255,0.13)" : "transparent",
+                  }}
+                >
+                  <div className="flex items-center gap-3 min-w-0 pr-4">
+                    <button
+                      type="button"
+                      onClick={(e) => {
+                        e.stopPropagation();
+                        if (onColorChange) setPickerJobId((current) => (current === job.id ? null : job.id));
+                      }}
+                      className="w-9 h-9 rounded-full shrink-0 inline-flex items-center justify-center transition-transform hover:scale-105"
+                      style={{
+                        background: barColor,
+                        color: textColor,
+                        border: pickerJobId === job.id ? "2px solid var(--accent)" : "1px solid var(--border)",
+                      }}
+                      aria-label={`Change color for ${job.category}`}
+                    >
+                      <Icon size={16} />
+                    </button>
+                    <span className="text-[13px] font-extrabold truncate">{job.category}</span>
+                  </div>
 
-        {/* In-canvas color picker: 7 main colors × 5 shades */}
-        {picker && (
-          <>
-            <div className="fixed inset-0 z-40" onClick={() => setPicker(null)} aria-hidden />
-            <div
-              className="absolute z-50 p-2.5"
-              style={{
-                left: picker.x,
-                top: picker.y,
-                width: 184,
-                borderRadius: 16,
-                background: "var(--glass-strong)",
-                backdropFilter: "var(--blur)",
-                WebkitBackdropFilter: "var(--blur)",
-                border: "1px solid var(--border)",
-                borderTopColor: "var(--border-top)",
-                boxShadow: "var(--shadow-lg)",
-              }}
-            >
-              <div className="label-mono mb-2">Bar Color</div>
-              <div className="space-y-1">
-                {JOB_COLOR_PALETTE.map((row) => (
-                  <div key={row.name} className="flex gap-1" title={row.name}>
-                    {row.shades.map((hex) => {
-                      const current = jobs.find((j) => j.id === picker.jobId)?.color;
-                      const selected = current === hex;
-                      return (
-                        <button
-                          key={hex}
-                          onClick={() => {
-                            onColorChange?.(picker.jobId, hex);
-                            setPicker(null);
-                          }}
-                          className="w-6 h-6 rounded-md hover:scale-110 transition-transform"
-                          style={{ background: hex, outline: selected ? "2px solid var(--accent)" : "1px solid var(--border)", outlineOffset: selected ? "1px" : "0" }}
-                          aria-label={`${row.name} ${hex}`}
+                  <div className="relative h-11">
+                    <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[2px]" style={{ background: "var(--border)" }} />
+                    {start == null ? (
+                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[12px] font-semibold text-ink-muted">
+                        No date
+                      </span>
+                    ) : safeEnd == null ? (
+                      <>
+                        <span
+                          className="absolute top-1/2 w-5 h-5 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-[6px]"
+                          style={{ left: `${startPct}%`, background: barColor, border: "1px solid var(--border)" }}
                         />
-                      );
-                    })}
+                        <span
+                          className="absolute top-1/2 translate-x-4 -translate-y-1/2 text-[12px] font-bold text-ink-muted"
+                          style={{ left: `${startPct}%` }}
+                        >
+                          {monthName(start)}
+                        </span>
+                      </>
+                    ) : (
+                      <div
+                        className="absolute top-1/2 -translate-y-1/2 h-10 rounded-full flex items-center justify-center px-4 text-[12.5px] font-extrabold shadow-sm"
+                        style={{
+                          left: `${startPct}%`,
+                          width: `max(${widthPct}%, 48px)`,
+                          maxWidth: `${Math.max(0, 100 - startPct)}%`,
+                          background: barColor,
+                          color: textColor,
+                        }}
+                      >
+                        <span className="truncate">{monthRangeLabel(start, safeEnd)}</span>
+                      </div>
+                    )}
                   </div>
-                ))}
-              </div>
-              <button
-                onClick={() => {
-                  onColorChange?.(picker.jobId, "");
-                  setPicker(null);
-                }}
-                className="mt-2 w-full font-mono text-[10px] uppercase tracking-wider rounded-[10px] py-1.5 transition-colors text-ink-muted hover:text-accent"
-                style={{ border: "1px solid var(--border)", background: "var(--glass-2)" }}
-              >
-                Reset to status color
-              </button>
-            </div>
-          </>
-        )}
-      </div>
-      {/* Legend */}
-      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 pt-3 border-t border-hair">
-        {(["N/A", "Bid Requested", "Bid Approved", "Work-in-progress", "Finished", "Paid"] as JobStatus[]).map(
-          (s) => (
-            <span key={s} className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-ink-muted">
-              <span className="w-3 h-3 rounded-[4px]" style={{ background: statusFill(s).bar, border: "1px solid var(--border)" }} />
-              {s}
-            </span>
-          ),
-        )}
-        <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-ink-muted">
-          <span className="inline-block w-3 border-t-2 border-dashed" style={{ borderColor: "var(--accent)" }} /> Today
-        </span>
+                </div>
+              );
+            })}
+
+            {pickerJob && onColorChange && (
+              <>
+                <div className="fixed inset-0 z-40" onClick={() => setPickerJobId(null)} aria-hidden />
+                <div
+                  className="absolute z-50 p-2.5"
+                  style={{
+                    left: 44,
+                    top: pickerIndex * ROW_H + 42,
+                    width: 184,
+                    borderRadius: 16,
+                    background: "var(--glass-strong)",
+                    backdropFilter: "var(--blur)",
+                    WebkitBackdropFilter: "var(--blur)",
+                    border: "1px solid var(--border)",
+                    borderTopColor: "var(--border-top)",
+                    boxShadow: "var(--shadow-lg)",
+                  }}
+                >
+                  <div className="label-mono mb-2">Bar Color</div>
+                  <div className="space-y-1">
+                    {JOB_COLOR_PALETTE.map((row) => (
+                      <div key={row.name} className="flex gap-1" title={row.name}>
+                        {row.shades.map((hex) => {
+                          const selected = pickerJob.color === hex;
+                          return (
+                            <button
+                              key={hex}
+                              type="button"
+                              onClick={() => {
+                                onColorChange(pickerJob.id, hex);
+                                setPickerJobId(null);
+                              }}
+                              className="w-6 h-6 rounded-md hover:scale-110 transition-transform"
+                              style={{
+                                background: hex,
+                                outline: selected ? "2px solid var(--accent)" : "1px solid var(--border)",
+                                outlineOffset: selected ? "1px" : "0",
+                              }}
+                              aria-label={`${row.name} ${hex}`}
+                            />
+                          );
+                        })}
+                      </div>
+                    ))}
+                  </div>
+                  <button
+                    type="button"
+                    onClick={() => {
+                      onColorChange(pickerJob.id, "");
+                      setPickerJobId(null);
+                    }}
+                    className="mt-2 w-full text-[11px] font-bold rounded-[10px] py-1.5 transition-colors text-ink-muted hover:text-accent"
+                    style={{ border: "1px solid var(--border)", background: "var(--glass-2)" }}
+                  >
+                    Reset to status color
+                  </button>
+                </div>
+              </>
+            )}
+          </div>
+        </div>
       </div>
@@ -457,11 +377,2 @@ export function JobTimeline({
 
-function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
-  const rad = Math.min(r, w / 2, h / 2);
-  ctx.beginPath();
-  ctx.moveTo(x + rad, y);
-  ctx.arcTo(x + w, y, x + w, y + h, rad);
-  ctx.arcTo(x + w, y + h, x, y + h, rad);
-  ctx.arcTo(x, y + h, x, y, rad);
-  ctx.arcTo(x, y, x + w, y, rad);
-  ctx.closePath();
-}
+export default JobTimeline;
```