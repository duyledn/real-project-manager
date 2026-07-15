"use client";

import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { Plus, X } from "lucide-react";
import type { RenovationItem } from "@/lib/types";
import { useCurrency } from "@/lib/currency";
import { useI18n } from "@/lib/i18n";
import { useDragReorder, useFlipList, moveItem, moveItemsBefore } from "@/lib/useDragReorder";
import { useColumnWidths } from "@/lib/useColumnWidths";
import { capitalizeFirst, focusCellDirectlyBelow, focusColumnInLastRow } from "@/lib/tableNav";
import { DragHandle, MoneyInput, NumberInput, currencySymbol } from "@/components/fields";
import { ColorPicker, tint } from "@/components/ColorPicker";
import { ResizableTh } from "@/components/ResizableTh";

// Resizable column widths are shared by `key` so the grouped-view sub-tables
// all line up. Fixed columns (the select/remove gutters) aren't resizable.
const COL_DEFAULTS = { item: 260, cat: 160, qty: 96, cost: 132, total: 132 };
const SEL_W = 64;
const RM_W = 44;

/**
 * The Itemized Remodel Costs table, rendered for any list of items (the whole
 * list in Table view, or one group's items in Grouped view). Self-contained
 * drag-reorder + Enter navigation; all edits flow back through callbacks that
 * operate on the parent's global item list by id. Columns are resizable by
 * dragging the grip on the right edge of each header cell.
 */
export function ItemsTable({
  items,
  categories,
  selected,
  onToggleSelect,
  onToggleSelectAll,
  onUpdate,
  onRemove,
  onReorderIds,
  onAdd,
  fmtMoney,
  addLabel = "Add line item",
}: {
  items: RenovationItem[];
  categories: string[];
  selected: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: (ids: string[]) => void;
  onUpdate: (id: string, patch: Partial<RenovationItem>) => void;
  onRemove: (id: string) => void;
  onReorderIds: (orderedIds: string[]) => void;
  onAdd: () => void;
  fmtMoney: (n: number | null | undefined) => string;
  addLabel?: string;
}) {
  const { currency } = useCurrency();
  const { t } = useI18n();
  const subtotal = items.reduce((s, i) => s + i.qty * i.unitCost, 0);

  const { widths, startResize } = useColumnWidths("items", COL_DEFAULTS);
  const tableWidth = SEL_W + widths.item + widths.cat + widths.qty + widths.cost + widths.total + RM_W;

  const drag = useDragReorder((from, to) => {
    const draggedId = items[from]?.id;
    const newItems =
      draggedId && selected.has(draggedId) && selected.size > 1
        ? moveItemsBefore(items, selected, to)
        : moveItem(items, from, to);
    onReorderIds(newItems.map((i) => i.id));
    // Tell the hook where the dragged item landed so live reordering tracks it.
    return draggedId ? newItems.findIndex((i) => i.id === draggedId) : to;
  });
  const bodyRef = useRef<HTMLTableSectionElement>(null);
  useFlipList(bodyRef, items.map((item) => item.id), drag.dragIndex);

  const tableRef = useRef<HTMLTableElement>(null);
  const [pendingCol, setPendingCol] = useState<number | null>(null);
  useEffect(() => {
    if (pendingCol == null) return;
    focusColumnInLastRow(tableRef.current, pendingCol);
    setPendingCol(null);
  }, [pendingCol, items]);

  function onCellEnter(e: ReactKeyboardEvent) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    if (focusCellDirectlyBelow(e.target)) return;
    const cell = (e.target as HTMLElement).closest("td");
    const row = cell?.closest("tr");
    const colIndex = cell && row ? Array.prototype.indexOf.call(row.children, cell) : 1;
    onAdd();
    setPendingCol(colIndex);
  }

  const allSelected = items.length > 0 && items.every((i) => selected.has(i.id));

  return (
    <>
      <div className="panel overflow-x-auto">
        <table ref={tableRef} className="border-collapse" style={{ tableLayout: "fixed", width: tableWidth }}>
          <colgroup>
            <col style={{ width: SEL_W }} />
            <col style={{ width: widths.item }} />
            <col style={{ width: widths.cat }} />
            <col style={{ width: widths.qty }} />
            <col style={{ width: widths.cost }} />
            <col style={{ width: widths.total }} />
            <col style={{ width: RM_W }} />
          </colgroup>
          <thead>
            <tr className="border-b-[1.5px] border-ink">
              <th className="p-2.5">
                <input
                  type="checkbox"
                  aria-label={t("Select all")}
                  checked={allSelected}
                  onChange={() => onToggleSelectAll(items.map((i) => i.id))}
                />
              </th>
              <ResizableTh label={t("Item")} col="item" startResize={startResize} />
              <ResizableTh label={t("Category")} col="cat" startResize={startResize} />
              <ResizableTh label={t("Qty")} col="qty" startResize={startResize} />
              <ResizableTh label={t("Unit Cost")} col="cost" startResize={startResize} />
              <ResizableTh label={t("Total")} col="total" startResize={startResize} align="right" />
              <th />
            </tr>
          </thead>
          <tbody ref={bodyRef}>
            {items.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-4 text-center text-ink-muted text-sm">{t("No items yet.")}</td>
              </tr>
            ) : (
              items.map((item, idx) => {
                const isSel = selected.has(item.id);
                const isDragging = drag.dragIndex === idx;
                return (
                  <tr
                    key={item.id}
                    data-key={item.id}
                    {...drag.rowProps(idx)}
                    className={`group border-b border-hair last:border-0 transition-colors ${isDragging ? "" : "hover:bg-[var(--accent-soft)]"} ${isSel && !isDragging ? "bg-paper" : ""}`}
                    style={
                      isDragging
                        ? { background: "var(--surface-solid)", opacity: 0.35, outline: "2px solid var(--accent)", outlineOffset: "-2px", position: "relative", zIndex: 1 }
                        : !isSel && item.color
                          ? { backgroundColor: tint(item.color) }
                          : undefined
                    }
                  >
                    <td className="p-2">
                      <div className="flex items-center justify-center gap-2">
                        <input
                          type="checkbox"
                          aria-label={t("Select item")}
                          checked={isSel}
                          onChange={() => onToggleSelect(item.id)}
                          className={`transition-opacity ${isSel ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus-visible:opacity-100"}`}
                        />
                        <ColorPicker value={item.color} onChange={(c) => onUpdate(item.id, { color: c })} title={t("Item color")} />
                        <DragHandle handleProps={drag.handleProps(idx)} />
                      </div>
                    </td>
                    <td className="p-1.5">
                      <input
                        value={item.description}
                        placeholder={t("e.g. Bathroom tile")}
                        onChange={(e) => onUpdate(item.id, { description: capitalizeFirst(e.target.value) })}
                        onKeyDown={onCellEnter}
                        className="cell-input"
                      />
                    </td>
                    <td className="p-1.5">
                      <select
                        value={item.category}
                        onChange={(e) => onUpdate(item.id, { category: e.target.value })}
                        onKeyDown={onCellEnter}
                        className="cell-input"
                      >
                        {categories.map((c) => (
                          <option key={c} value={c}>{t(c)}</option>
                        ))}
                      </select>
                    </td>
                    <td className="p-1.5">
                      <NumberInput
                        value={item.qty}
                        min={0}
                        onChange={(v) => onUpdate(item.id, { qty: v })}
                        onKeyDown={onCellEnter}
                        className="cell-input font-mono text-right"
                      />
                    </td>
                    <td className="p-1.5">
                      <div className="flex items-center">
                        <span className="font-mono text-ink-muted text-xs">{currencySymbol(currency)}</span>
                        <MoneyInput
                          value={item.unitCost}
                          min={0}
                          onChange={(v) => onUpdate(item.id, { unitCost: v })}
                          onKeyDown={onCellEnter}
                          className="cell-input font-mono text-right"
                        />
                      </div>
                    </td>
                    <td className="p-2.5 font-mono font-semibold text-right truncate">{fmtMoney(item.qty * item.unitCost)}</td>
                    <td className="p-1.5 text-center">
                      <button onClick={() => onRemove(item.id)} className="icon-btn" aria-label={t("Remove item")}>
                        <X size={13} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          <tfoot>
            <tr className="border-t-[1.5px] border-ink">
              <td colSpan={5} className="p-2.5 label-mono font-semibold">{t("Subtotal")}</td>
              <td className="p-2.5 font-mono font-bold text-right">{fmtMoney(subtotal)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
      <button onClick={onAdd} className="btn btn-blue mt-3 inline-flex items-center gap-1.5">
        <Plus size={14} /> {t(addLabel)}
      </button>
    </>
  );
}
