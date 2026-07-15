# Current Tasks

## Active
- Project Settings consolidation & shell polish - Status: needs-user-visual-QA - Handoff: `LLM/handoffs/project-settings-and-shell-polish.md` - Last completion: `LLM/completions/project-settings-and-shell-polish.md` - Note: code review + tsc passed; browser walkthrough blocked in both LLM environments. User to verify: sidebar top/height constants (SIDEBAR_TOP=79), switcher dropdown position, header save indicator.
- Schedule page redesign + sidebar max-height fix - Status: needs-handoff - Handoff: `LLM/handoffs/schedule-redesign.md` - Context: `LLM/context/schedule-redesign.md` - Note: sidebar max-height portion now superseded by project-settings-and-shell-polish (layout.tsx SIDEBAR_TOP); re-check that handoff for overlap before dispatching.
- Global visual redesign ("Verdant Glass") - Status: needs-handoff - Handoff: `LLM/handoffs/global-redesign.md` - Context: `LLM/context/global-redesign.md`
- UX polish batch (glass + 9 schedule/date tasks) - Status: needs-handoff - Handoff: `LLM/handoffs/ux-polish.md` - Context: `LLM/context/ux-polish.md`

<!--
Keep Active tasks minimal. Prefer ONE active "current" task at a time.
Each active task should include pointers so a fresh Orchestrator chat can resume without guessing.

Format (one line per task):
- [Feature] - Status: [in-progress/blocked/needs-handoff/needs-audit] - Handoff: `LLM/handoffs/{feature}.md` - Context: `LLM/context/{feature}.md` - Last completion: `LLM/completions/{feature}.md` (optional)
-->

## Completed
- Full Vietnamese sweep + floaty drag + checkbox redesign - Completed: 2026-07-14 - Completion: `LLM/completions/i18n-sweep-drag-feel-checkbox.md` - Notes: `LLM/orchestrator_notes.md` - Note: browser visual QA (Vietnamese display, drag feel, checkbox) still needed before deploy
- Postgres Storage Driver - Completed: 2026-06-30 - Completion: `LLM/completions/postgres-storage.md` - Notes: `LLM/orchestrator_notes.md`
- Fix broken project page export - Completed: 2026-06-30 - Completion: `LLM/completions/fix-broken-project-page-export.md` - Notes: `LLM/orchestrator_notes.md`

<!--
Format (one line per task):
- [Feature] - Completed: YYYY-MM-DD - Completion: `LLM/completions/{feature}.md` - Notes: `LLM/orchestrator_notes.md`
-->
