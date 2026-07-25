# Handoff — UI/UX Fix Batch (2026-07-19)

**To:** Coding LLM
**Scope:** 9 fixes across dashboard, files tab, tables, and modals. No new features beyond the expand-table behavior (item 5). Do not refactor unrelated code.

---

## 1. Currency switch doesn't update "Budget by Category"
**Bug:** Toggling to VND converts other values, but the Budget by Category section still renders USD.
**Task:** Trace the currency state (context/store/prop) used by components that DO react to the toggle. The Budget by Category component is either not subscribed to it or formats with a hardcoded USD formatter. Wire it to the same currency state and shared formatting util so amounts and symbols convert exactly like the rest of the app.
**Accept:** Toggle VND → every figure in Budget by Category shows VND (converted value + symbol/format). Toggle back → USD. No stale values on re-render.

## 2. Remove chart under the 4 stat boxes (Dashboard)
**Task:** On the dashboard page, delete the chart component rendered directly below the 4 summary boxes. Remove its imports and any now-dead data-prep code for it. Do not remove data logic shared with other components.
**Accept:** Dashboard shows the 4 boxes, then the next section with no empty gap where the chart was. No console errors, no unused imports.

## 3. Negative profit → red gradient
**Bug:** Profit display uses a green gradient regardless of sign.
**Task:** Make the gradient conditional: profit >= 0 → existing green gradient; profit < 0 → an equivalent red gradient (same direction/stops style, red hues). Apply everywhere profit is shown with the gradient treatment (stat box, and anywhere else the class/style is reused).
**Accept:** Set data so profit is negative → red gradient renders; positive → green unchanged; zero → green.

## 4. Files tab — remove duplicate "Files" title
**Task:** The Files tab renders a "Files" heading inside the page while the tab/nav already labels it, creating repetition. Remove the in-page title only. Keep surrounding layout spacing sane (adjust margin/padding if removing the heading leaves an odd gap).
**Accept:** Files tab shows content without the redundant heading; layout looks intentional.

## 5. Expand option on every table (floating editable overlay)
**Task:** Add an "expand" control (icon button) to every table in the app. Clicking it opens the same table as a floating overlay that:
- Spans nearly the full browser viewport, with a small inset/setback (e.g. ~24–32px margin on all sides) so the page behind is visibly beneath it — communicates "brought to front."
- Has rounded corners (match app radius scale, e.g. 12–16px) and an elevated shadow; dim/blur backdrop behind it.
- Is fully **editable** — same editing behavior as the inline table, same data source (edits in the overlay reflect in the inline table and persist the same way).
- Closes via a close button and Escape; closing returns to the normal view without losing edits.
**Implementation note:** Build this once as a reusable wrapper (e.g. `ExpandableTable` or an `expandable` prop on the shared table component) rather than per-table copies. All existing tables — budget, schedule/timeline, files, and any others — must get it.
**Accept:** Every table shows the expand control; overlay matches spec above; editing works identically in both views.

## 6. Larger base font size
**Task:** Increase font sizes app-wide for readability. Prefer a global change (root font-size or the type scale in the Tailwind/theme config) over per-component edits — roughly one step up (e.g. base 14px → 16px, and scale headings accordingly). Verify nothing overflows/clips (stat boxes, table cells, nav).
**Accept:** Noticeably larger, consistent typography everywhere; no broken layouts or truncated labels.

## 7. Schedule timeline table can't expand
**Bug:** After item 5, ensure the schedule timeline table specifically supports expand — it currently doesn't behave like other tables (likely a custom component not using the shared table wrapper).
**Task:** Give the schedule timeline the same expand control and overlay behavior as every other table, reusing the item-5 wrapper. If it's a bespoke component, adapt it to accept the wrapper rather than duplicating overlay logic.
**Accept:** Schedule timeline expands/collapses identically to other tables, remains editable in the overlay.

## 8. Clean up pop-up/modal styling (e.g. "Add phase" dialog)
**Task:** Remove the obvious borders/outlines on all pop-ups/modals/dialogs (the Add Phase modal on the schedule table is the reference case). Target: clean, minimal, glassy — translucent background with backdrop blur (glassmorphism), soft shadow for depth, no hard outline/border ring. Also remove focus-ring artifacts that render as a visible outline around the modal container itself (keep accessible focus styles on interactive elements *inside* the modal).
**Accept:** All modals (Add Phase and any others) share the glassy look, no visible hard outlines; inputs/buttons inside still show focus states.

## 9. Table check button spacing
**Task:** The check(box) button in table rows sits flush against the far-left edge. Add spacing so it sits **20px** from the left edge of the table (padding-left: 20px on the first cell/checkbox column, applied consistently to header and body rows, all tables).
**Accept:** Checkbox column starts 20px from the table's left edge in every table, header aligned with rows.

---

## Order of work
Do 5 first (shared expand wrapper), then 7 (schedule adoption), then the independent items 1, 2, 3, 4, 6, 8, 9 in any order. Item 6 last-ish is fine, but re-verify 2/3/9 layouts after the font bump.

## Verification checklist (run before returning)
- [ ] VND toggle converts Budget by Category both directions
- [ ] Dashboard chart gone, no gap, no console errors
- [ ] Negative profit red / positive green
- [ ] No duplicate "Files" title
- [ ] Expand works on ALL tables incl. schedule timeline; overlay editable, inset + rounded, Escape closes
- [ ] Fonts larger everywhere, no overflow
- [ ] Modals glassy, no hard outlines, inner focus states intact
- [ ] Checkbox 20px from left in all tables
- [ ] `npm run build` (or the project's build/lint command) passes

Report back: files touched per item, any spec ambiguity you resolved and how, and anything you deliberately did NOT change.
