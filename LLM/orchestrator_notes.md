# Orchestrator Notes

## [Date] — Project Initialized
- Bootstrapped LLM workflow structure
- Created `ORCHESTRATOR_BOOTSTRAP.md`, `COMMANDS.md`, `API_REFERENCE.md`

## 2026-06-30 — Postgres Storage Driver: audit passed, one unrelated bug found
- Decision: deploy backend on Neon (serverless Postgres) rather than connecting
  Vercel to the user's Hostinger DB — Hostinger's IP-allowlisted remote access
  and connection limits don't reliably work with Vercel's serverless functions.
- Implemented: `Postgres*Repository` classes for all five repositories
  (projects, subcontractors, job categories, users, companies) in
  `src/lib/storage.ts`, branching on `STORAGE_DRIVER` via new `src/lib/db.ts`
  (`@neondatabase/serverless`). Schema is JSONB-heavy for projects
  (`scripts/schema.sql`) rather than fully normalized — matches the app's
  existing "read/write whole object" usage pattern. One-time migration script:
  `scripts/migrate-to-postgres.ts` (`npm run migrate:postgres`).
- Fixed two latent bugs while implementing: `doSeed()` and
  `relatedJobsBySubcontractor()` previously read the project JSON file
  directly, bypassing the repository abstraction — would have silently read
  stale/empty data under `STORAGE_DRIVER=postgres`. Both now go through
  `getRepository()`.
- Code review: implementation matches the handoff spec, no deviations of
  concern. JSON-path regression (`test:api`, `test:calcs`) and a targeted
  `tsc --noEmit` on the new/changed files passed (per Coding LLM's report;
  re-verified the targeted type-check independently).
- **Found, NOT caused by this task:** `src/app/projects/[id]/page.tsx` has a
  duplicate `export default` (leftover Neon quickstart boilerplate pasted in
  during an earlier, separate commit — `0287c71 "Adding Neon"`, predates this
  handoff). This currently breaks `npx tsc --noEmit` and would break
  `next build` / any Vercel deploy. Confirmed independently via git history
  and a fresh `tsc --noEmit` run — not introduced by the Coding LLM's
  postgres-storage work, which correctly left `src/app/` untouched. Wrote a
  separate, narrowly-scoped follow-up: `LLM/handoffs/fix-broken-project-page-export.md`.
- Updated `COMMANDS.md`, `API_REFERENCE.md`.

## 2026-06-30 — Fix Broken Project Page Export: audit found file corruption, sent back
- The Coding LLM's diff was correct — exactly the stray `Page`/Neon-quickstart
  block removed, nothing else touched, matching the handoff spec.
- However, independent verification (`npx tsc --noEmit`, byte-level inspection)
  found `src/app/projects/[id]/page.tsx` now ends with 600 trailing NUL bytes
  (`0x00`). File size matches the original `HEAD` size (16045 bytes) exactly,
  even though ~600 bytes of real code were removed — i.e. the removed content
  was replaced with NUL padding instead of the file being truncated. This
  produces ~600 `error TS1127: Invalid character.` errors on `tsc --noEmit`,
  so the file still does not compile, contradicting the completion report's
  claim that `tsc --noEmit`/`npm run build` passed.
- Did not patch this myself (production code is out of scope for the
  Orchestrator). Wrote a round-2 follow-up at the same path,
  `LLM/handoffs/fix-broken-project-page-export.md`, instructing the Coding
  LLM to strip the NUL padding (re-write the file via a method that actually
  truncates) without touching the already-correct code change.
- Task left in `CURRENT_TASKS.md` as Active/needs-handoff, not moved to
  Completed, until this is verified clean.

## 2026-06-30 — Fix Broken Project Page Export: round 2 passed, closed
- Coding LLM's round-2 report: file rewritten cleanly — `15445` bytes, `0`
  NUL bytes, ends with a single newline after the final `}`. Verified via a
  PowerShell byte scan on the actual file (not just a claim) — output
  included in the completion report. `npx tsc --noEmit` and `npm run build`
  both exit 0. The code diff is unchanged from round 1 (only the stray
  `Page`/Neon-quickstart block removed).
- Cross-check: `15445` bytes matches exactly what I'd independently computed
  in the round-1 audit by stripping the NUL padding from the corrupted file
  (`tr -d '\0'` → 15445 bytes) — strong evidence the fix is correct, not just
  a self-report.
- Caveat: my own sandbox's mounted copy of this OneDrive-synced repo did not
  pick up the change during this session (still showed the old 16045-byte/
  600-NUL version, mtime ~38 min stale, unchanged after a retry/wait) — a
  sync-lag limitation of my environment, consistent with prior sandbox
  artifacts on this project (e.g. the esbuild native-binary mismatch noted
  during the Postgres audit). Did not treat this as a real failure; relied on
  the Coding LLM's direct, falsifiable byte-level verification instead. If
  this recurs, the user should do a final local `npx tsc --noEmit` sanity
  check before deploying.
- Marked Completed in `CURRENT_TASKS.md`. This was the last item blocking
  `next build`/Vercel deploy.

<!-- Add entries here after each audit. Format:

## [Date] — [Feature Name] Complete
- [What was added/changed]
- [Key implementation details]
- [Files modified]
- Updated `COMMANDS.md`, `API_REFERENCE.md`.

-->


## 2026-07-14 — Full Vietnamese Sweep, Floaty Drag, Checkbox Redesign: audit PASSED
- Scope (3 workstreams): (1) full i18n sweep — all 17 pages + 12 components now use `useI18n().t()`, 750 new call sites, 643 new Vietnamese entries, 761 total dictionary keys; (2) `useDragReorder.ts` extended with custom floaty ghost (transparent native image suppression, deep-clone into `.drag-ghost` wrapper, document-level dragover + rAF movement, cleanup on unmount, reduced-motion bypass) and exported `useFlipList` FLIP hook (position capture on dragover, inverted-delta `useLayoutEffect`, 180ms cubic-bezier, skips dragged row); (3) checkbox global restyle (19px, border-radius 7px, appearance:none, clip-path checkmark).
- Audit findings: all spec requirements met. Ghost CSS (`.drag-ghost`), checkbox CSS, glass opacity tokens, all verified via Read tool against spec — exact matches. All 4 FLIP call sites wired correctly (`data-key`, container ref, `opacity:0.35` + outline). Enum values not translated (stored values preserved, translated at render site via `t(s)` pattern). 3 justified untranslated strings (email format example, 2 Drive URLs).
- Acceptable deviation: `useFlipList` API takes `(containerRef, keys: readonly string[], dragIndex)` instead of the spec's `keySelector` function — functionally equivalent, covers all 4 call sites correctly.
- Out-of-checklist edits: `layout.tsx` and `TopNav.tsx` updated for untranslated accessibility text found by the required global heuristic — justified.
- TypeScript: Coding LLM's `tsc --noEmit` exit 0 (authoritative). Sandbox tsc run invalid due to OneDrive sync lag (known recurring issue — bash sandbox shows stale 109-line stubs instead of the 291-line actual files; same pattern as prior audits).
- Blocked: browser visual verification (Vietnamese display, drag feel, checkbox rendering) blocked by `TypeError: Cannot redefine property: process` in bundled browser client — environment limitation, not a code defect. Manual QA still needed before deploy.
- Files modified by Coding LLM: `src/lib/useDragReorder.ts`, `src/lib/translations.ts`, `src/app/globals.css`, `src/app/projects/[id]/layout.tsx`, `src/components/TopNav.tsx`, all 17 pages in checklist 1b, all 12 components in checklist 1b.

## 2026-07-14 — Project Settings Consolidation & Shell Polish: audit passed (code), visual QA pending
- Scope (6 user requests): project-detail editing moved from Jobs & Bids §01 +
  Dashboard modal into a new autosaving "Project details" card at the top of
  Project Settings (name, strategy w/ datalist presets, address, start date,
  PM, owner, GC); sidebar capped at `SIDEBAR_TOP = 79` /
  `calc(100vh - 91px)`; ProjectSwitcher dropdown moved to a
  `createPortal`+fixed panel (fixes clipping by the aside's `overflowY`);
  Dashboard edit button/modal removed (GradientHero prop dropped);
  SaveIndicator relocated to the shell header title row in
  `[id]/layout.tsx` and stripped from all 6 pages + JobTimeline; descriptive
  captions removed per keep/remove table (how-to captions retained).
- Audit: diffed every modified file against the handoff with
  `git diff --ignore-all-space` — all changes match spec. `tsc --noEmit`
  exit 0 (run independently in sandbox). `JobsBidsBoard.tsx`'s huge diff is
  pure CRLF→LF churn, zero content change.
- Approved deviations: Project Name + Investment Strategy use native inputs
  (TextField lacks blur-commit and `list` props; `fields.tsx` was
  off-limits). Empty-name guard: ref captures last non-empty name on focus,
  restores on empty blur ("Untitled project" fallback). Portal menu ignores
  its own internal scroll so long project lists stay scrollable.
- Blocked verification: `next dev` never served a page in the Coding LLM's
  environment NOR my sandbox (hangs at "Starting…" — mounted-FS/OneDrive
  slowness, consistent with prior sandbox artifacts). ESLint not installed
  so `next lint` can't run. USER must visually verify: sidebar never
  under-laps TopNav (tweak SIDEBAR_TOP if off by a few px), dropdown
  position/close-on-scroll, header Saving…/Saved placement.
- Docs: no changes to COMMANDS.md / API_REFERENCE.md needed (pure UI, no new
  commands or endpoints). Flagged overlap: `schedule-redesign.md` handoff
  also contains a sidebar max-height task — now superseded; prune before
  dispatch.
