# Coding LLM Handoff — Global Visual Redesign ("Verdant Glass")

## Overview
A phased visual redesign of the existing React/Next.js app to match a design
reference ZIP (`Real Project Manager redesign_v3.zip`). No data model, routing,
or calculation logic changes. Implement in the order listed below — each phase
builds on the previous.

## Read These Files First (before writing a single line)
1. `LLM/context/global-redesign.md` — rationale, scope, design-to-code mapping
2. `design_handoff_rpm_green/README.md` (in the uploaded ZIP) — the full design
   spec (tokens, recipes, screen descriptions, interactions)
3. `src/app/globals.css` — existing design tokens (already correct; do not change)
4. `src/app/projects/[id]/page.tsx` — current Dashboard page
5. `src/app/projects/[id]/investment/page.tsx` — current Financials/Investment page
6. `src/components/JobsBidsBoard.tsx` — current Jobs & Bids board (full file)
7. `src/app/projects/[id]/layout.tsx` — sidebar / ShellChrome
8. `src/lib/calculations.ts` — find `returns.totalProfit`, `returns.irr`,
   `returns.equityMultiple`, `cashInvested` fields on the return object
9. `src/lib/bidStatus.ts` — `BID_STATUS_COLOR`, `bidStatusColor()`, `pillStyle()`
10. `src/lib/types.ts` — `Job`, `Bidder`, `BidderStatus`

---

## Phase 1 — Foundation files (no UI yet, zero risk)

### 1a. NEW `src/lib/palette.ts`
```ts
/** Extended categorical data palette — cycle with PAL[i % PAL.length]. */
export const PAL = [
  '#1F8A5B', // Evergreen
  '#E0A92E', // Gold
  '#2C9C8E', // Teal
  '#7FB23C', // Lime
  '#4FAE6B', // Moss
  '#C98A2E', // Amber
] as const;

/** Per-index colors for the four Financials KPI cards. */
export const KPI_COLORS = ['#1F8A5B', '#1E8C7E', '#A8862A', '#3E8E5A'] as const;

/** `$0` when falsy, `$Xk` (1 dp) for ≥1000, `$X` otherwise. */
export function kMoney(n: number | null | undefined): string {
  if (!n) return '$0';
  if (n >= 1000) return `$${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return `$${Math.round(n)}`;
}

/** True when a BidderStatus counts as "awarded" for progress/bar purposes. */
export const AWARDED_STATUSES = new Set([
  'Bid approved',
  'Work-in-progress',
  'Partially-paid',
  'Fully-paid',
]);
```

---

## Phase 2 — New shared components

### 2a. NEW `src/components/GradientHero.tsx`
The primary focal point on the Dashboard. Takes analysis data; renders the green
gradient card.

**Props:**
```ts
{
  project: Project,
  analysis: ReturnType<typeof analyzeProject> | null,
  awardedPct: number,           // 0–100
  onEditProject: () => void,    // opens the existing EditIdentityModal
}
```

**Layout (matches README "Gradient hero banner" recipe exactly):**
- Outer: `border-radius:22px`, `padding:22px 24px`, `color:#fff`
- Background: `linear-gradient(120deg,#13674A 0%,#1F8A5B 42%,#4FAE6B 74%,#9ECF52 100%)`
- Box-shadow: `0 18px 44px rgba(31,138,91,0.30)`
- Two decorative `position:absolute pointer-events-none` radial circles:
  - Top-right 260px: `radial-gradient(circle, rgba(255,255,255,0.22), transparent 70%)`
  - Bottom-left 300px: `radial-gradient(circle, rgba(214,237,142,0.32), transparent 70%)`
- Top-right: a small `icon-btn` or ghost button for the pencil (edit) icon, white color,
  positioned absolute top-3 right-3. Clicking calls `onEditProject`.
- Grid: `grid-template-columns: 1.25fr 1fr`, `gap:24px`, `align-items:center`

**Left column:**
- Kicker: `PROJECTED 3-YR NET PROFIT` — 11px, weight 800, uppercase,
  `letter-spacing:0.1em`, `rgba(255,255,255,0.84)`
- Big figure: formatted `analysis.returns.totalProfit` prefixed with "+" when
  positive — 46px, weight 800, `letter-spacing:-0.03em`, JetBrains Mono,
  `text-shadow:0 2px 18px rgba(0,0,0,0.18)`. Show `—` when `analysis` is null.
- Subtitle row: trending-up icon (use Lucide `TrendingUp`, 14px, white opacity 0.8) +
  text (13px, `rgba(255,255,255,0.78)`): `"Levered IRR {irr}% on {equity} all-in · {awardedPct}% committed"` where `irr` is `fmtPercent(analysis.returns.irr)`, `equity` is `fmtMoney(analysis.cashInvested)`. Show placeholder dashes when analysis is null.

**Right column:**
Three glass stat chips in a `flex flex-col gap-[10px]`:
- Chip style: `background:rgba(255,255,255,0.15)`, `border:1px solid rgba(255,255,255,0.24)`,
  `border-radius:15px`, `padding:10px 14px`, `backdrop-filter:blur(6px)`,
  flex row with value + label.
- Value style: 20px, weight 800, JetBrains Mono.
- Label style: 10.5px, weight 600, `rgba(255,255,255,0.78)`.
- The three chips:
  1. Value `fmtPercent(analysis?.returns.irr)`, label `"Levered IRR"`
  2. Value `fmtMultiple(analysis?.returns.equityMultiple)`, label `"Equity multiple"`
  3. Value `${awardedPct}%`, label `"Budget awarded"`

**Imports needed:** `Project` from `@/lib/types`, `analyzeProject` return type,
`fmtPercent`, `fmtMultiple` from `@/lib/format`, `fmtMoney`-compatible formatter
from `useCurrency` (or accept `fmtMoney` as a prop), `TrendingUp` from `lucide-react`.

---

### 2b. NEW `src/components/MetricCard.tsx`
Tinted metric card with 7-bar sparkline. One per dashboard metric.

**Props:**
```ts
{
  color: string,    // hex from PAL
  icon: LucideIcon,
  value: string,
  label: string,
  note: string,     // trend chip text
  bars: number[],   // 7 values in 0..1, for sparkline heights
}
```

**Card recipe (matches README "Tinted card recipe"):**
```
background: linear-gradient(155deg, <color>1F, var(--glass-2) 62%)
border: 1px solid var(--border)
border-top-color: var(--border-top)
border-radius: 18px
padding: 16px
```
(`<color>1F` = hex color + "1F" appended as alpha — concatenate the hex string with
`"1F"` to get a 12%-alpha version)

**Layout inside the card:**
1. Top row: icon tile (34×34, `border-radius:10px`, `background:<color>26`, icon in
   `color`) + trend chip (right-aligned: `color` text on `<color>1C` fill, `padding:3px
   8px`, `border-radius:999px`, `font-size:10.5px`, weight 700).
2. Value: 23px, weight 800, JetBrains Mono, `margin-top:10px`.
3. Label: 12.5px, weight 500, `var(--muted)`, `margin-top:2px`.
4. Sparkline (below label, `margin-top:10px`): `display:flex`, `align-items:flex-end`,
   `height:30px`, `gap:3px`. Seven `<div>` bars, each `width:5px`,
   `background:<color>`, `border-radius:2px 2px 0 0`,
   `height: ${5 + Math.round(v * 24)}px`, `opacity: ${0.38 + v * 0.62}`.

---

## Phase 3 — Dashboard page (`src/app/projects/[id]/page.tsx`)

### Changes summary
- Add `analyzeProject` import and `useMemo` computation (pattern from `investment/page.tsx`)
- Remove the existing project-name header section (h1 + edit button + address line)
  — keep the `EditIdentityModal` component and its `editing` state, just move the
  trigger inside `GradientHero` via the `onEditProject` prop
- Replace 4 metric tiles with 4 `<MetricCard>` instances
- Insert `<GradientHero>` above the metric cards
- Insert the Budget by category table after the metric cards (see spec below)
- Keep the existing two-column section (bids decision list + compliance alerts +
  awarded vs budget) — restyle bid decision cards slightly (see below)

### New imports to add
```ts
import { useMemo } from "react";
import { analyzeProject } from "@/lib/calculations";
import { fmtPercent, fmtMultiple } from "@/lib/format";
import { PAL, kMoney, AWARDED_STATUSES } from "@/lib/palette";
import { GradientHero } from "@/components/GradientHero";
import { MetricCard } from "@/components/MetricCard";
```

### New derived values (add after existing `metrics` array)
```ts
const analysis = useMemo(() => (project ? analyzeProject(project) : null), [project]);
```

### Replace metric tiles
Current: `metrics.map(m => <div className="panel-2 p-4">...`)`)

Replace the array definition and the render with `<MetricCard>` instances. The
four cards map to `PAL[0]`–`PAL[3]` (Evergreen, Gold, Teal, Lime). Suggested
static `bars` arrays — plausible placeholders since the app has no weekly history:
```ts
const metricCards = [
  {
    color: PAL[0], icon: Wallet,
    value: fmtMoney(estBudget), label: t("Total budget"),
    note: t("{n} jobs", { n: project.jobs.length }),
    bars: [0.40, 0.45, 0.52, 0.58, 0.65, 0.70, 0.75],
  },
  {
    color: PAL[1], icon: Gavel,
    value: String(bidsInPlay), label: t("Bids in play"),
    note: t("+{n} wk", { n: 3 }),
    bars: [0.20, 0.45, 0.60, 0.80, 0.55, 0.90, 0.70],
  },
  {
    color: PAL[2], icon: CheckCircle2,
    value: `${awardedJobs}/${project.jobs.length}`,
    label: t("Awarded"), note: t("{a} jobs", { a: awardedJobs }),
    bars: [0.10, 0.20, 0.35, 0.45, 0.55, 0.65, 0.80],
  },
  {
    color: PAL[3], icon: CalendarRange,
    value: `${datedJobs}/${project.jobs.length || 0}`,
    label: t("On schedule"), note: t("on track"),
    bars: [0.50, 0.55, 0.65, 0.60, 0.75, 0.72, 0.88],
  },
];
```
Render as: `<div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">` containing
`metricCards.map(m => <MetricCard key={m.label} {...m} />)`.

### Budget by category table (inline, after metric cards)
Full-width card (`panel-2 p-[18px] sm:p-5`). Insert in the JSX between the
metric card grid and the existing two-column `lg:grid-cols-[1.5fr_1fr]` section.

**Header row:** "Budget by category" (14.5px/800) + sub-text "Awarded vs budget · bid
spread per trade" (11px, `var(--muted)`) + right-aligned accent pill showing
`kMoney(estBudget) + " total"`.

**Table** (`w-full`, `border-collapse:collapse`):

| Column | What to render | Style notes |
|---|---|---|
| Category | 11px color dot + category name | Dot: `9px`, color `PAL[i % 6]`, `box-shadow: 0 0 0 3px <color>22`, `border-radius:50%`. Name: 12.5px/700 |
| Bids | `job.bidders.length` | Centered, mono, `var(--muted)`, 11.5px |
| Bid range | min–max of non-zero `bidder.bidPrice` values | Right, mono 11.5, `var(--muted)`. Format each bound with `kMoney()`. Show "—" when no bids |
| Budget | `kMoney(job.estimatedCost)` | Right, mono 12.5/600 |
| Progress | Progress bar + % label | Bar track: `h-1.5 rounded-full`, `background:var(--glass)`, `border:1px solid var(--border)`. Fill: `linear-gradient(90deg,<color>,<color>bb)` if any AWARDED_STATUSES bid exists, else diagonal stripe (`repeating-linear-gradient(135deg, <color>40 0,<color>40 4px, transparent 4px, transparent 8px)`). Width % = `Math.min(100, Math.round((awardedBidPrice || lowestBid) / est * 100))`. % label: mono 11px, colored when filled |
| Status | status pill | Use existing `pillStyle()` on the awarded bid's status, or first active bid |

**Per-row derivation** (compute for each `job`):
```ts
const nonZeroBids = job.bidders.filter(b => b.bidPrice > 0);
const lowBid = Math.min(...nonZeroBids.map(b => b.bidPrice));
const highBid = Math.max(...nonZeroBids.map(b => b.bidPrice));
const awardedBid = job.bidders.find(b => AWARDED_STATUSES.has(b.status));
const firstActiveBid = job.bidders.find(b => b.status !== 'Not sent');
const fillBid = awardedBid ?? null;
const fillPct = job.estimatedCost > 0
  ? Math.min(100, Math.round(((fillBid?.bidPrice || lowBid || 0) / job.estimatedCost) * 100))
  : 0;
```

Show a note row ("Add jobs to see budget breakdown") when `project.jobs.length === 0`.

---

## Phase 4 — Financials / Investment page (`src/app/projects/[id]/investment/page.tsx`)

**Only the 4 KPI `panel-2 p-[18px]` cards at the top change.** Everything below
(Assumptions toolbar, input sections, Expand modal) stays exactly as-is.

Import `KPI_COLORS` from `@/lib/palette`.

For each of the 4 KPI cards, apply the "Tinted KPI card recipe" from the README:
```
background: linear-gradient(155deg, <color>1E, var(--glass-2) 62%)
border: 1px solid var(--border)
border-top-color: var(--border-top)
border-radius: 18px
padding: 18px
```
Color the metric value text to match the card's `KPI_COLORS[i]` color (instead of
the current `var(--pos)` / `var(--neg)` / `var(--text)` logic — **exception**: keep
using red/green coloring if the value is negative, i.e. still apply negative-value
red when `irr < 0` or similar; only change positive values to use the card color).

Map: `KPI_COLORS[0]` for IRR, `[1]` for equity multiple, `[2]` for cash-on-cash,
`[3]` for cap rate — same order as the existing 4-card render loop.

---

## Phase 5 — Jobs & Bids board (`src/components/JobsBidsBoard.tsx`)

**Only `KanbanView`'s column render block changes.** All state, all callbacks
(`onDragStart`, `onDropTo`, `setOverCol`, `addJob`, `addBidderTo`) stay exactly
as-is.

Import `bidStatusColor`, `hexAlpha` from `@/lib/bidStatus` if not already
imported (they should already be in scope in the component file).

### Find this block (approximately lines 280–310 in the file):
```tsx
<div className="flex gap-3 overflow-x-auto pb-2.5">
  {BIDDER_STATUSES.map((status) => {
    const bids = selectedJob.bidders.filter((b) => b.status === status);
    ...
  })}
</div>
```

### Replace with vertical lane layout:
```tsx
{/* Hint line */}
<div className="flex items-center gap-2 mb-3 text-xs text-ink-muted">
  <GripVertical size={15} /> Drag bid cards between lanes to update their status.
</div>

<div className="flex flex-col gap-[11px]">
  {BIDDER_STATUSES.map((status) => {
    const bids = selectedJob.bidders.filter((b) => b.status === status);
    const color = bidStatusColor(status);
    const isOver = overCol === status;

    return (
      <div
        key={status}
        onDragOver={(e) => { e.preventDefault(); setOverCol(status); }}
        onDragLeave={() => setOverCol(null)}
        onDrop={(e) => { onDropTo(e, status); }}
        style={{
          borderRadius: 16,
          padding: '12px 14px',
          background: isOver ? 'var(--accent-soft)' : 'var(--glass-2)',
          border: `1px solid ${isOver ? 'var(--accent)' : 'var(--border)'}`,
          borderLeft: `3px solid ${isOver ? 'var(--accent)' : color}`,
          boxShadow: isOver ? 'inset 0 0 0 1px var(--accent)' : undefined,
          transition: 'background 0.18s, border-color 0.18s',
        }}
      >
        {/* Lane header */}
        <div className="flex items-center gap-2 mb-3">
          <span
            style={{
              width: 9, height: 9, borderRadius: '50%', flexShrink: 0,
              background: color,
              boxShadow: `0 0 0 3px ${hexAlpha(color, 0.13)}`,
            }}
          />
          <span className="text-[13px] font-extrabold">{BID_STATUS_SHORT[status]}</span>
          <span
            className="text-[11px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: 'var(--glass)', color: 'var(--muted)', border: '1px solid var(--border)' }}
          >
            {bids.length}
          </span>
          {/* Hairline divider fills the rest of the header row */}
          <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
        </div>

        {/* Cards grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(212px, 1fr))',
            gap: 9,
            minHeight: 46,
          }}
        >
          {bids.length === 0 ? (
            /* Empty drop target */
            <div
              style={{
                gridColumn: '1 / -1',
                border: '1.5px dashed var(--border)',
                borderRadius: 10,
                padding: '12px 0',
                textAlign: 'center',
                fontSize: 12,
                color: 'var(--faint)',
              }}
            >
              Drag a bid here
            </div>
          ) : (
            bids.map((bid) => {
              const sub = subById(bid.subcontractorId);
              return (
                <div
                  key={bid.id}
                  draggable
                  onDragStart={(e) => onDragStart(e as any, selectedJob!.id, bid.id)}
                  style={{
                    borderRadius: 13,
                    padding: 12,
                    background: 'var(--surface-solid)',
                    border: `1px solid var(--border)`,
                    borderLeft: `3px solid ${color}`,
                    boxShadow: 'var(--shadow)',
                    opacity: dragBidId === bid.id ? 0.4 : 1,
                    cursor: 'grab',
                    transition: 'box-shadow 0.2s, transform 0.2s',
                  }}
                  className="hover:-translate-y-0.5 hover:shadow-lg"
                >
                  {/* Card top: initials tile + sub name + rep + drag handle */}
                  <div className="flex items-start gap-2.5">
                    <div
                      className="w-[30px] h-[30px] rounded-[8px] flex items-center justify-center text-[10.5px] font-extrabold text-accent shrink-0"
                      style={{ background: 'var(--accent-soft)' }}
                    >
                      {initialsOf(sub?.companyName ?? '—')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div
                        className="text-[12.5px] font-bold truncate"
                        style={{ maxWidth: 130 }}
                      >
                        {sub?.companyName ?? 'Unassigned'}
                      </div>
                      <div className="text-[10.5px] text-ink-muted truncate">
                        {sub?.repName ?? '—'}
                      </div>
                    </div>
                    <GripVertical size={14} className="text-faint shrink-0 mt-0.5" />
                  </div>
                  {/* Card footer: price + PDF chip + compliance icon */}
                  <div className="flex items-center justify-between mt-2.5 gap-2">
                    <span className="font-mono text-[14px] font-semibold">
                      {fmtMoney(bid.bidPrice)}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {bid.bidLink && (
                        <span
                          className="text-[10.5px] font-bold px-2 py-0.5 rounded-full"
                          style={{ background: 'var(--glass)', color: 'var(--muted)', border: '1px solid var(--border)' }}
                        >
                          PDF
                        </span>
                      )}
                      {sub && (
                        subCompliance(sub).ok
                          ? <CheckCircle2 size={14} style={{ color: '#3E8E5A' }} />
                          : <AlertCircle size={14} style={{ color: '#C98A2E' }} />
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  })}
</div>
```

Make sure `BID_STATUS_SHORT`, `bidStatusColor`, `hexAlpha`, `subCompliance`,
`initialsOf` are all imported/in scope. All of these already exist in
`src/lib/bidStatus.ts`. The `AlertCircle` and `CheckCircle2` icons from
`lucide-react` are already imported in the file — verify and add if missing.

---

## Phase 6 — Sidebar width (`src/app/projects/[id]/layout.tsx`)
Change the `<aside>` width from `w-[244px]` to `w-[252px]` to match the design
spec (252px sidebar). Also update the `maxWidth` in any corresponding wrapper
grid calculation if present. If the schedule-redesign handoff already ran and
added `max-height` / `position:sticky`, keep those changes — only the width value
changes here.

---

## Phase 7 — Low-priority cosmetic passes
These are lightweight; do your best to match the design reference without
breaking existing functionality.

### 7a. Files page (`src/app/projects/[id]/files/page.tsx`)
The design shows a list with: file-type icon tile (38×38, `border-radius:10px`,
icon in accent or type color on glass background), file name (13px/700), meta
line (job name · status, 11.5px muted), mono file size, and a download icon on
the right. Row hover tints to `var(--glass-2)`. Match this style for the file
list rows while keeping all existing upload/folder/rename/delete functionality
intact.

### 7b. Subcontractors page (`src/app/subcontractors/page.tsx`)
The design shows a 2-col card grid (each card: 48px initials tile, company name
bold, rep name muted, phone and email in mono, three compliance badges). The
existing page uses a resizable table with inline editing. Do a **cosmetic-only
pass** — improve the card/accordion appearance to be closer to the design's card
grid feel, but preserve all existing edit-in-place, add, and delete functionality.
Do not convert the table to a static card grid if that would break editing.

---

## Rules
1. Implement phases in order (1 → 7). Run `tsc --noEmit` after Phase 3 and
   again at the very end.
2. Do NOT modify: `src/app/globals.css`, `src/components/Background.tsx`,
   `src/lib/bidStatus.ts`, `src/lib/calculations.ts`, or any page under
   `src/app/projects/[id]/scheduling/`, `src/app/projects/[id]/construction/`,
   `src/app/projects/[id]/analysis/`, `src/app/projects/[id]/math/`,
   `src/app/projects/[id]/report/`.
3. Keep all existing DnD callbacks in `JobsBidsBoard.tsx` exactly as-is — only
   the column/lane markup changes.
4. Keep the `EditIdentityModal` component and its state in `page.tsx` — just
   move the trigger into `GradientHero`'s `onEditProject` prop.
5. Use only existing libraries: Lucide React for icons, Tailwind utility classes,
   inline `style={{}}` for dynamic/token-based values. No new npm packages.

## Verification
1. `npx tsc --noEmit` — zero new errors (run after Phase 3, and again at end).
2. `npm run build` — must succeed.
3. In the completion report, describe what each phase looks like in a project
   that has at least 2 jobs with bidders. Confirm:
   a. Hero banner renders with `totalProfit` value (or `—` when analysis has no
      inputs) and edit button is accessible.
   b. Each of the 4 metric cards has a distinct background tint (Evergreen, Gold,
      Teal, Lime) and shows 7 sparkline bars.
   c. Budget table shows one row per job, with correct bid range / progress bar.
   d. Kanban lanes are now a vertical stack; dragging a card between lanes still
      updates the bid status correctly.
   e. Financials KPI cards are tinted per `KPI_COLORS`.

## Completion Report (REQUIRED)
Create `LLM/completions/global-redesign.md` with:
- Pass/fail per phase
- Commands run and exit codes
- List of every file created or modified
- Confirmation of no unintended changes to scoped-out files
- Any deviations from this spec and why

## Final Output to User (REQUIRED)
End with the standard "Implementation Complete / Next Step" block pointing the
Orchestrator at `LLM/completions/global-redesign.md`.
