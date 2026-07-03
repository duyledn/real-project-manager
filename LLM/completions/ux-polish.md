# UX Polish Completion Report

## Summary

Implemented phases A-E from `LLM/handoffs/ux-polish.md` in order.

## Phase Results

- Phase A: Pass. Updated only the requested light/dark `--glass` and `--glass-2` alpha values in `src/app/globals.css`.
- Phase B: Pass. Added the requested date and datetime-local picker styling rules after the `.field-input` block in `src/app/globals.css`.
- Phase C: Pass. Updated `JobTimeline` props, toolbar, row styling, bottom add row, hover add action, removed the horizontal track line, and restyled the bar bubble.
- Phase D: Pass. Added `src/components/ScheduleJobPanel.tsx` with a solid `var(--surface-solid)` background and inline editing for job basics and bidders.
- Phase E: Pass. Rewired the Schedule page so row selection opens/closes the inline panel, SaveIndicator/Expand live in the timeline toolbar, and Add phase opens the quick-add popover without navigating away.

## Validation Commands

- `npx tsc --noEmit` after Phase C: exit 1.
  - Output: `src/app/projects/[id]/scheduling/page.tsx` still passed removed prop `onAddJob` to `JobTimeline`.
  - Reason: Phase E was the handoff step that updates the caller to the new `onHoverAdd` API.
- `npx tsc --noEmit` after Phase E wiring: exit 0.
- Final `npx tsc --noEmit`: exit 0.
- `npm run build`: exit 0.
  - Build completed successfully.
  - Existing warning: `ESLint must be installed in order to run during builds: npm install --save-dev eslint`.
- `git diff --check`: exit 0.
- Scoped-out diff check for `JobDrawer.tsx`, `JobsBidsBoard.tsx`, `/projects/[id]/manage/`, `/investment/`, and `/construction/`: exit 0 with no diff output.

## Verification Notes

- Glass panels are more opaque through the updated alpha values, while `--blur` remains unchanged.
- Date inputs using `.field-input[type="date"]` now force `color-scheme: light` and use the accent-tinted WebKit picker indicator.
- Schedule timeline rows use `var(--surface-solid)`, `borderRadius: 12`, and no alternating stripe logic.
- The horizontal line in each timeline bar column was removed.
- SaveIndicator and Expand are rendered inside `JobTimeline` toolbar on the right side of the search row.
- The previous floating Save/Expand header above the timeline was removed from the Schedule page.
- The Add phase control is rendered at the bottom of the timeline job list when `onHoverAdd` is provided.
- Hovering a category label reveals the `+ Add below` control, which calls `onHoverAdd(job.category)` without selecting the row.
- Bar bubbles are 28px tall, use `borderRadius: 8`, and have the stronger drop shadow.
- Clicking a job row toggles `selectedJobId`; the selected row uses `var(--accent-soft)`.
- The selected job opens `ScheduleJobPanel` beside the timeline, where dates, status, estimated cost, and bidders can be edited without leaving the Schedule tab.
- Clicking the same row again or the panel close button clears `selectedJobId` and closes the panel.

## Files Created

- `src/components/ScheduleJobPanel.tsx`
- `LLM/completions/ux-polish.md`

## Files Modified

- `src/app/globals.css`
- `src/components/JobTimeline.tsx`
- `src/app/projects/[id]/scheduling/page.tsx`
- `src/components/fields.tsx`

`src/components/fields.tsx` was modified only to export the existing save-state union as `SaveState`, so `JobTimeline` can type its new `saveState` prop against the same state shape used by `SaveIndicator`.

## Existing Unrelated Worktree Changes

The worktree also contains unrelated modified files not caused by this implementation:

- `LLM/CURRENT_TASKS.md`
- `data/projects.json`
- `tsconfig.tsbuildinfo`

## Deviations

- The Phase C-only TypeScript checkpoint failed because the caller update is defined in Phase E. After Phase E, TypeScript passed cleanly.
- `MoneyInput` in this codebase does not accept a `currency` prop, so `ScheduleJobPanel` uses the existing `MoneyInput` API and `useCurrency().fmtMoney` for display text.
