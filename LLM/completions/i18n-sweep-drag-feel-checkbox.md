# Full Vietnamese Sweep, Floaty Drag, Checkbox Redesign

## Pass/Fail Status

**Conditional PASS.** All automated checks passed: the final TypeScript check exits 0, the required hardcoded-attribute heuristic has only three justified data-format examples, all static `t()` keys exist in the Vietnamese dictionary, placeholder variables match, forbidden files are unchanged, reorder helper behavior is unchanged, and `git diff --check` passes.

The local app responded with HTTP 200 for every page route in the checklist. The interactive browser walkthrough could not be completed because the supported in-app browser runtime failed while loading its bundled client with `TypeError: Cannot redefine property: process` at `browser-client.mjs:33`. Language switching, visual drag feel, and checkbox rendering in both themes therefore remain manual acceptance items.

## Verification Commands Run

```powershell
npx.cmd tsc --noEmit
```

- Final result: exit 0.
- An earlier run exposed one duplicate `Processing...` dictionary property (`TS1117`); the duplicate was removed and the command was rerun successfully.
- Intermediate checks also used `npx.cmd tsc --noEmit --incremental false` and exited 0.

```powershell
$hits = rg -n --pcre2 --glob '*.tsx' '(?:placeholder|title|aria-label)=\x22[A-Za-z]' src/app src/components
$hits
if (@($hits).Count -ne 3) { throw ('Expected 3 justified heuristic hits, found ' + @($hits).Count) }
```

- This is the PowerShell/`rg` equivalent of the handoff's `grep` command; Bash is unavailable on this machine.
- Remaining hits:
  - `src/app/subcontractors/page.tsx:240` - `name@company.com`, a language-neutral email format example.
  - `src/app/projects/[id]/manage/page.tsx:312` - Drive URL, a language-neutral URL format example.
  - `src/components/JobDrawer.tsx:206` - Drive URL, a language-neutral URL format example.

```powershell
git diff --check
```

- Exit 0. Git emitted only existing LF-to-CRLF conversion warnings.

```powershell
npx.cmd tsx -e "import { moveItem, moveItemsBefore } from './src/lib/useDragReorder'; const rows=[{id:'a'},{id:'b'},{id:'c'},{id:'d'}]; const one=moveItem(rows,0,2).map(x=>x.id).join(''); const many=moveItemsBefore(rows,new Set(['a','c']),3).map(x=>x.id).join(''); if(one!=='bcad'||many!=='bacd') throw new Error(JSON.stringify({one,many})); console.log('reorder helpers: pass');"
```

- Passed. The sandboxed attempt failed because `esbuild` could not spawn (`EPERM`); the approved retry outside the sandbox printed `reorder helpers: pass`.

```powershell
git diff --name-only -- src/lib/bidStatus.ts src/lib/types.ts src/lib/palette.ts src/app/api LLM/docs/RULES.md LLM/skills
```

- No output; no forbidden file was modified.

Additional inline TypeScript-AST audits were run with `node` to:

- Parse every TSX file under `src/app` and `src/components`.
- Verify that every literal `t()` key exists in `VI`: 0 missing.
- Verify key/value placeholder sets: 0 mismatches.
- Inventory dynamic `t()` calls and the dedicated dynamic-label section: 75 enum/status/month/color/formula entries.
- Scan raw JSX text, literal UI attributes, and non-`t()` confirm/alert arguments. Only the product name, format examples, and already-translated variable forwarding remained.

Route availability was checked with `Invoke-WebRequest` against `http://127.0.0.1:3000` for `/`, all public/auth/workspace pages, and every `/projects/nonexistent/*` checklist route. All 17 requests returned 200.

Dev/browser attempts:

- `npm.cmd run dev -- --port 3000` initially failed in the sandbox with `spawn EPERM`.
- The approved retry reported `EADDRINUSE`; an existing local instance was already serving port 3000 and returned HTTP 200.
- The required browser client initialization failed at import time with `TypeError: Cannot redefine property: process`; retrying from a clean browser runtime produced the same error.

## i18n Checklist

Counts are net-new `t()` call sites. A dynamic call site can cover multiple stored labels.

### Pages

- ✔ `src/app/page.tsx` - 31
- ✔ `src/app/login/page.tsx` - 9
- ✔ `src/app/signup/page.tsx` - 14
- ✔ `src/app/recover/page.tsx` - 12
- ✔ `src/app/admin/page.tsx` - 14
- ✔ `src/app/subcontractors/page.tsx` - 35
- ✔ `src/app/settings/page.tsx` - 2
- ✔ `src/app/projects/[id]/page.tsx` - 11
- ✔ `src/app/projects/[id]/manage/page.tsx` - 35
- ✔ `src/app/projects/[id]/construction/page.tsx` - 28
- ✔ `src/app/projects/[id]/investment/page.tsx` - 131
- ✔ `src/app/projects/[id]/analysis/page.tsx` - 46
- ✔ `src/app/projects/[id]/math/page.tsx` - 85
- ✔ `src/app/projects/[id]/report/page.tsx` - 87
- ✔ `src/app/projects/[id]/scheduling/page.tsx` - 11
- ✔ `src/app/projects/[id]/files/page.tsx` - 24
- ✔ `src/app/projects/[id]/settings/page.tsx` - 48

### Components

- ✔ `src/components/ItemsTable.tsx` - 14
- ✔ `src/components/JobDrawer.tsx` - 27
- ✔ `src/components/JobsBidsBoard.tsx` - 32
- ✔ `src/components/JobTimeline.tsx` - 24
- ✔ `src/components/ScheduleJobPanel.tsx` - 17
- ✔ `src/components/GradientHero.tsx` - 3
- ✔ `src/components/MetricCard.tsx` - 0; audited, caller-supplied labels are translated at call sites and it owns no UI strings.
- ✔ `src/components/ColorPicker.tsx` - 6
- ✔ `src/components/AuthFrame.tsx` - 1
- ✔ `src/components/Background.tsx` - 0; audited, no user-facing text.
- ✔ `src/components/AppShell.tsx` - 1
- ✔ `src/components/fields.tsx` - 2

**Totals:** 750 new `t()` call sites and 643 new Vietnamese dictionary entries. The final dictionary contains 761 keys.

## Extra Files Explored

- Every page/component in checklist 1b was read because each was an explicit sweep target; the full list is recorded above.
- `src/app/projects/[id]/layout.tsx` and `src/components/TopNav.tsx` - audited after the required global heuristic found untranslated shell accessibility text; both were updated.
- `src/lib/types.ts` - read-only audit of frequency, job-status, and bidder-status stored values.
- `src/lib/jobs.ts` - read-only audit of default job categories and timeline color names.
- `src/lib/bidStatus.ts` - read-only audit of short status labels; not modified.
- `package.json` - confirmed available scripts and that ESLint is not installed/configured for the requested workflow.

No additional product scope was added. `LLM/CURRENT_TASKS.md`, `data/projects.json`, and the untracked handoff file were pre-existing user changes and were not edited by this implementation.

## Skills Used

- No repository `LLM/skills/*.md` files were read.
- Codex `vercel:nextjs` - useful for App Router/client-component review.
- Codex `vercel:react-best-practices` - useful for checking hook lifecycles, stable keys, accessibility, and TypeScript patterns.
- Codex `browser:control-in-app-browser` - followed for local verification, but its bundled runtime failed before a browser connection could be established.

## What Was Changed

- `src/lib/translations.ts` - added 643 natural Vietnamese entries, retaining exact English keys, established terminology, placeholders, stored enum values, and section grouping.
- `src/app/page.tsx`, auth pages, `admin/page.tsx`, `subcontractors/page.tsx`, and workspace settings - wrapped visible text, controls, empty/error states, attributes, and dialogs.
- All nine project financial/content pages plus dashboard, manage, scheduling, files, and project settings - completed the display-string sweep while preserving user data, currency, formulas, and stored enum values.
- `src/components/ItemsTable.tsx`, `JobDrawer.tsx`, `JobsBidsBoard.tsx`, `JobTimeline.tsx`, `ScheduleJobPanel.tsx`, `GradientHero.tsx`, `ColorPicker.tsx`, `AuthFrame.tsx`, `AppShell.tsx`, and `fields.tsx` - translated component-owned strings and dynamic display labels at render sites.
- `src/app/projects/[id]/layout.tsx` and `src/components/TopNav.tsx` - wrapped two shell accessibility strings found by the required heuristic.
- `src/lib/useDragReorder.ts` - added the transparent native image suppression, fixed custom ghost wrapper, table-aware deep clone, document `dragover` tracking, rAF movement, cleanup, reduced-motion behavior, and exported keyed FLIP animation hook without changing reorder semantics.
- `src/components/ItemsTable.tsx`, `src/app/projects/[id]/manage/page.tsx`, `src/app/projects/[id]/investment/page.tsx`, and `src/components/JobDrawer.tsx` - wired stable `data-key` values, container refs, FLIP animation, and consistent 0.35 source opacity.
- `src/app/globals.css` - added floaty ghost styling and the global 19px, 7px-radius custom checkbox treatment.
- `src/components/ItemsTable.tsx` and `src/app/projects/[id]/investment/page.tsx` - increased checkbox-row padding/gap while retaining hover reveal behavior.

## Deviations from Handoff

- `src/app/projects/[id]/layout.tsx` and `src/components/TopNav.tsx` were outside checklist 1b but were minimally updated because the handoff's app-wide heuristic exposed untranslated user-facing accessibility text there. No other out-of-checklist source file was modified.
- Three hardcoded placeholders remain intentionally untranslated because they are data-format examples: one email address and two Drive URLs. The `123 Construction` and phone-number examples are likewise user-data formats, not English chrome.
- The FLIP helper accepts an ordered key array plus `dragIndex` rather than a key-selector function. It still captures keyed row positions immediately before React's delegated reorder handler and animates the post-render inversion for all four surfaces.
- Interactive browser verification is blocked by the bundled browser client initialization error described above. Route serving and all source/automated checks pass, but Vietnamese visual coverage, drag feel, and checkbox appearance in both themes were not manually accepted in this run.
- No dependencies were added, API/server strings were not translated, stored shapes and enum values were not changed, and no forbidden file was modified.
