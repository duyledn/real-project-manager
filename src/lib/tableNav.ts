// Shared helpers for spreadsheet-style table editing: name capitalization and
// Enter-to-move-down navigation between cells.

/** Uppercase the first character, leave the rest alone. */
export function capitalizeFirst(s: string): string {
  return s.length ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

/**
 * Move focus to the input/select in the cell directly below the current one
 * (same column, next row). Returns false if there is no row below.
 */
export function focusCellDirectlyBelow(target: EventTarget | null): boolean {
  const cell = (target as HTMLElement)?.closest?.("td");
  const row = cell?.closest("tr");
  if (!cell || !row) return false;
  const colIndex = Array.prototype.indexOf.call(row.children, cell);
  const nextRow = row.nextElementSibling as HTMLElement | null;
  if (!nextRow) return false;
  const el = nextRow.children[colIndex]?.querySelector<HTMLElement>("input, select");
  if (!el) return false;
  el.focus();
  if (el instanceof HTMLInputElement) el.select();
  return true;
}

/** Focus the input/select at `colIndex` in the last body row of a table. */
export function focusColumnInLastRow(table: HTMLTableElement | null, colIndex: number) {
  if (!table) return;
  const rows = table.querySelectorAll("tbody tr");
  const lastRow = rows[rows.length - 1];
  const el = lastRow?.children[colIndex]?.querySelector<HTMLElement>("input, select");
  el?.focus();
  if (el instanceof HTMLInputElement) el.select();
}
