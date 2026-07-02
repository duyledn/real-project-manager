# Context — Global Visual Redesign ("Verdant Glass")

## Source
`Real Project Manager redesign_v3.zip` → `design_handoff_rpm_green/` → two files:
- `Real Project Manager Redesign - Green.dc.html` — the interactive design reference.
  Read its markup for layout/style; read the embedded `class Component` script for
  state, data shapes, and behavior. The templating runtime (`support.js`) is not
  ported.
- `README.md` — the complete design spec (tokens, recipes, screen-by-screen layout,
  interactions). This is the source of truth for the handoff.

## What this redesign covers
Six visual/layout changes layered onto the existing codebase. Nothing in the
calculation engine, routing, or data-persistence layer changes.

### 1. Extended data palette (new)
Six categorical colors for charts, metric cards, and budget table rows.
Defined as a JS constant (`PAL`) in a new `src/lib/palette.ts` — not CSS vars,
because they're used in dynamic JS inline styles.

### 2. Gradient hero banner on Dashboard (new)
Replaces the current project-name header (`<h1>` + edit button). The hero card
shows the projected 3-yr net profit (from `analyzeProject().returns.totalProfit`),
three glass chips (IRR, equity multiple, awarded %), and two decorative radial
circles. The existing `EditIdentityModal` is kept; its trigger (the pencil icon
button) moves to the top-right of the hero card.

### 3. Tinted metric cards with sparklines on Dashboard (restyle)
The four existing `panel-2 p-4` metric tiles become tinted cards — each gets a
per-color wash from `PAL[0..3]` and a 7-bar static sparkline below the value.
Static bar data is fine because the app doesn't track weekly history; placeholder
values chosen to look plausible per metric.

### 4. "Budget by category" data table on Dashboard (new)
A full-width card inserted between the metric cards and the existing two-column
section (bids decision list + compliance). One row per job: category dot, bid
count, bid range (min–max of non-zero bids), budget, progress bar (awarded vs
budget), status pill of the awarded or first active bid.

### 5. Tinted KPI cards on Financials / Investment page (restyle)
The four `panel-2 p-[18px]` KPI cards at the top of `investment/page.tsx` get
the KPI tinted-card recipe: a per-color gradient wash, and the metric value
colored to match. Everything below (Adjust toolbar, assumptions sections, Expand
modal) is untouched.

### 6. Vertical kanban in Jobs & Bids (structural change)
The current `KanbanView` renders status columns in a `flex gap-3 overflow-x-auto`
horizontal scroll. The redesign flips this to a **vertical stack** of full-width
lanes (`flex-col gap-[11px]`). Each lane gets a 3px left border in its status
color, a lane header (dot + label + count + hairline divider), and a
`grid-template-columns: repeat(auto-fill, minmax(212px, 1fr))` card grid inside.
Bid cards also get a 3px left border in their status color. All existing HTML5
drag-and-drop state and callbacks are preserved exactly — only the column markup
and its CSS change.

## Explicit out-of-scope
- **`src/app/projects/[id]/scheduling/`** — covered by the separate
  `LLM/handoffs/schedule-redesign.md` handoff. Do not touch.
- **`src/app/globals.css`** — all base design tokens, blob animations, and
  keyframes already match the spec (verified). Do not change.
- **`src/components/Background.tsx`** — blob decorations already implemented
  with correct tokens and `blobFloat` animation. Do not change.
- **`src/lib/bidStatus.ts`** — `BID_STATUS_COLOR` already matches the design
  spec's status palette exactly. Do not change.
- **Construction, Analysis, Math, Report sub-pages** (`/construction`,
  `/analysis`, `/math`, `/report`) — not shown in the design prototype; untouched.
- **Calculation engine** (`src/lib/calculations.ts`) — untouched; only the
  presentation of its outputs changes.

## Design-to-codebase mapping
| Design element | Existing file / concept |
|---|---|
| "Financials" screen | `src/app/projects/[id]/investment/page.tsx` |
| `Job.est` | `Job.estimatedCost` |
| `Bid.price` | `Bidder.bidPrice` |
| `Bid.subId` | `Bidder.subcontractorId` |
| Awarded status set (accepted/in_progress/partially/fully_paid) | `["Bid approved","Work-in-progress","Partially-paid","Fully-paid"]` |
| `analyzeProject().returns.totalProfit` | Hero banner main figure |
| `analyzeProject().returns.irr` | Hero / Financials IRR chip |
| `analyzeProject().returns.equityMultiple` | Hero / Financials equity chip |
| Material Symbols icons | Lucide React — keep existing icons; don't swap libraries |
| `kMoney(n)` helper | Inline function: `$0` when falsy, `$Xk` (1dp) for ≥1000, `$X` otherwise |
| `isAwarded(status)` | `["Bid approved","Work-in-progress","Partially-paid","Fully-paid"].includes(status)` |

## Coordinate with schedule-redesign handoff
The `LLM/handoffs/schedule-redesign.md` task (sidebar sticky + Schedule page
DOM-Gantt) may run before or after this one. When both run:
- The sidebar width change (244 → 252px) lives in **this** handoff.
- The sidebar sticky/max-height and `schedule-redesign` label lives in that
  handoff.
- If both have already run, check `layout.tsx` for conflicts and keep both
  changes.
