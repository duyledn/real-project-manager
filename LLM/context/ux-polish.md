# Context — UX Polish Batch (Glass + Schedule + Date Picker)

## Source
User feedback after viewing the live app. Ten discrete changes grouped into
three themes.

## Theme A — Glass surface opacity
The existing `--glass` (0.55 alpha) and `--glass-2` (0.40 alpha) surfaces are too
transparent, making panel content hard to read against the animated background
blobs. The fix increases the alpha values so the blur still shows but content has
enough contrast. `--blur` stays at `blur(22px) saturate(175%)` — no performance
change needed; increasing opacity is the right lever.

## Theme B — Schedule page reorganization (7 changes)
All changes are within `src/components/JobTimeline.tsx` (the DOM-based Gantt,
already rewritten from canvas in the prior schedule-redesign task) and
`src/app/projects/[id]/scheduling/page.tsx`. No other page is affected.

The schedule tab currently has:
- A floating "Expand / SaveIndicator" row ABOVE the panel (misplaced)
- An "Add phase" button INSIDE the toolbar row next to Search (hard to discover)
- A horizontal hairline running across each job row (visual noise)
- Fully-round (`rounded-full`), 40px-tall bar bubbles (inconsistent with the app's
  angular design language)
- Clicking a job routes the user away to the Jobs & Bids page (breaks flow)
- No quick-row-add from hovering the category label

### New Schedule architecture (after this handoff)
```
SchedulingPage
├── <div className="flex gap-4 items-start">          ← new wrapper
│   ├── <JobTimeline> (flex-1)                        ← receives saveState + onExpand
│   │   ├── Toolbar: [Search ........] [Save] [↗ Expand]   ← Add phase button removed
│   │   ├── Month header row
│   │   ├── Job rows (solid bg, rounded, no hairline)
│   │   │   └── Label col: category icon + name + hover-"+" button
│   │   │   └── Bar col: bar bubble (8px radius, 28px tall, shadow)
│   │   └── [+ Add phase] row at very bottom (below all jobs)
│   └── <ScheduleJobPanel> (w-80, appears when job selected)  ← new component
└── {expanded && <FullscreenModal>}
```

## Theme C — Date picker styling
The browser-native `<input type="date">` calendar popup renders in the OS's
default system style (blue/grey on most platforms) — clashing with the warm
glass aesthetic. Fix is twofold:
1. Force `color-scheme: light` on all `type="date"` inputs so all browsers render
   the same consistent light-mode calendar pop-up (prevents the jarring dark
   calendar on dark-themed systems).
2. Style the `::-webkit-calendar-picker-indicator` pseudo-element to match the
   app's accent color instead of the system blue.
3. Keep the `field-input` styling already in place (border-radius: 12px,
   glass-2 background).

## Files touched
| File | What changes |
|---|---|
| `src/app/globals.css` | Glass opacity + date input styling |
| `src/components/JobTimeline.tsx` | All 7 schedule changes + new props |
| `src/app/projects/[id]/scheduling/page.tsx` | Layout, prop wiring, sidebar state |
| NEW `src/components/ScheduleJobPanel.tsx` | Inline job-editing sidebar |

## Files NOT touched
- `src/components/JobDrawer.tsx` — used only in Jobs & Bids, untouched
- `src/components/JobsBidsBoard.tsx` — untouched
- Any Financials, Dashboard, or manage pages
- `LLM/handoffs/global-redesign.md` / `schedule-redesign.md` — separate tasks,
  run independently
