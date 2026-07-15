# Project Settings Consolidation & Shell Polish

## Pass/Fail Status

**FAIL - full verification did not complete.** The implementation passes TypeScript and static scope checks. The required lint command cannot run because ESLint is not installed in the project, and the local Next.js server listened on a port but did not return the first page, so the required browser walkthrough could not be completed.

## Verification Commands Run

- `npx.cmd tsc --noEmit` - passed with exit code 0 after the final edits.
- `npx.cmd next lint` - exited 1. Next.js reported that `next lint` is deprecated and that ESLint must be installed.
- `git diff --check` - passed; only Git line-ending conversion warnings were emitted.
- `rg -n 'SaveIndicator|saveState|onEditProject|EditIdentityModal' -- 'src/app/projects/[id]' 'src/components/GradientHero.tsx' 'src/components/JobTimeline.tsx'` - passed the intended scope check; only the shell-level `SaveIndicator` and `saveState` remain.
- `cmd.exe /c start "" /b npm.cmd run dev` - the sandboxed attempt failed with `spawn EPERM`; the approved retry listened on port 3000, but the first HTTP request timed out.
- `cmd.exe /c start "" /b npx.cmd next dev -p 3001` - fallback without the Turbopack script flag listened on port 3001, but browser navigation still timed out before a document was served.
- `npx.cmd next dev -p 3002` - foreground diagnostic reached a listening state and then exited without serving a page.
- In-app browser navigation to `http://127.0.0.1:3000` and `http://127.0.0.1:3001` - both timed out with an empty document and no browser console errors.

## Extra Files Explored

- `src/app/projects/[id]/construction/page.tsx` - required by changes 6 and 7 for the per-page save indicator and subtitle cleanup.
- `src/app/projects/[id]/files/page.tsx` - required by changes 6 and 7 for the per-page save indicator and subtitle cleanup.
- `src/app/projects/[id]/investment/page.tsx` - required by changes 6 and 7 for the per-page save indicator and caption cleanup.
- `src/app/projects/[id]/scheduling/page.tsx` - required by change 6 to remove `saveState` from both timeline usages.
- `src/components/JobTimeline.tsx` - required by change 6 to remove the optional save-state contract and indicator.
- `src/app/projects/[id]/analysis/page.tsx` - required by change 7 for caption cleanup.
- `src/app/projects/[id]/math/page.tsx` - required by change 7 for caption cleanup.

## Skills Used

- No project-local `LLM/skills/*.md` files were read.
- Bundled `browser:control-in-app-browser` instructions were helpful for the localhost walkthrough and for confirming the server returned an empty document without console errors.
- Bundled `vercel:react-best-practices` instructions were helpful; the review caught the empty-name fallback edge case and ensured scrolling inside the portal menu remains usable.

## What Was Changed

- `src/app/projects/[id]/settings/page.tsx` - added the first-card Project details editor, strategy presets, autosaving bindings, empty-name fallback, and optional card captions; removed the page-level save indicator and Project image caption.
- `src/app/projects/[id]/layout.tsx` - added the shell-header save indicator, capped the sticky sidebar, and moved the project-switcher menu into a fixed portal with outside-click and scroll handling.
- `src/app/projects/[id]/manage/page.tsx` - removed Project Details and the page-level save indicator, then renumbered Jobs, Bids, and Bid Email Identity.
- `src/app/projects/[id]/page.tsx` - removed dashboard edit state, the edit modal, strategy presets, and the page-level save indicator.
- `src/components/GradientHero.tsx` - removed the edit-project prop and button.
- `src/app/projects/[id]/construction/page.tsx` - removed the page-level save indicator and shortened the subtitle to the required behavioral sentence.
- `src/app/projects/[id]/files/page.tsx` - removed the page-level save indicator and shortened the subtitle to the drag instruction.
- `src/app/projects/[id]/investment/page.tsx` - removed the page-level save indicator, page subtitle, and specified descriptive captions.
- `src/app/projects/[id]/analysis/page.tsx` - removed captions from sections 01, 02, 03, and 05 while retaining section 04 guidance.
- `src/app/projects/[id]/math/page.tsx` - removed the section 04 caption.
- `src/app/projects/[id]/scheduling/page.tsx` - stopped passing save state to both timeline instances.
- `src/components/JobTimeline.tsx` - removed the save-state prop, imports, and toolbar indicator.

## Deviations from Handoff

- Project Name uses a native input instead of `TextField` because `TextField` has no blur/commit hook and `fields.tsx` is off-limits. Focus captures the previously committed non-empty name, typing remains unrestricted, and an empty blur restores that name (or `Untitled project` as a final fallback).
- Investment Strategy uses a native input with `list="strategy-presets"` because `TextField` does not expose a `list` prop and `fields.tsx` is off-limits.
- The final sidebar values are the specified `SIDEBAR_TOP = 79` and `maxHeight = calc(100vh - 91px)` (expressed from the constant). They could not be visually adjusted because the dev server did not serve the page.
- The portal scroll listener ignores scrolls originating inside the menu so a long project list remains scrollable; window and sidebar scrolling still close the fixed menu.
- Lint and manual browser verification remain blocked by the environment/tooling failures documented above. No dependency was added because the handoff forbids adding dependencies.
