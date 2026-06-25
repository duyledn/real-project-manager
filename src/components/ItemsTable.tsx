"use client";

import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { Plus, X } from "lucide-react";
import type { RenovationItem } from "@/lib/types";
import { useCurrency } from "@/lib/currency";
import { useDragReorder, moveItem, moveItemsBefore } from "@/lib/useDragReorder";
import { capitalizeFirst, focusCellDirectlyBelow, focusColumnInLastRow } from "@/lib/tableNav";
import { DragHandle, MoneyInput, NumberInput, currencySymbol } from "@/components/fields";
import { ColorPicker, tint } from "@/components/ColorPicker";

/**
 * The Itemized Remodel Costs table, rendered for any list of items (the whole
 * list in Table view, or one group's items in Grouped view). Self-contained
 * drag-reorder + Enter navigation; all edits flow back through callbacks that
 * operate on the parent's global item list by id.
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
  const subtotal = items.reduce((s, i) => s + i.qty * i.unitCost, 0);

  const drag = useDragReorder((from, to) => {
    const draggedId = items[from]?.id;
    const newItems =
      draggedId && selected.has(draggedId) && selected.size > 1
        ? moveItemsBefore(items, selected, to)
        : moveItem(items, from, to);
    onReorderIds(newItems.map((i) => i.id));
  });

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
        <table ref={tableRef} className="w-full border-collapse min-w-[600px]">
          <thead>
            <tr className="border-b-[1.5px] border-ink">
              <th className="w-16 p-2.5">
                <input
                  type="checkbox"
                  aria-label="Select all"
                  checked={allSelected}
                  onChange={() => onToggleSelectAll(items.map((i) => i.id))}
                />
              </th>
              <th className="text-left label-mono p-2.5">Item</th>
              <th className="text-left label-mono p-2.5 w-40">Category</th>
              <th className="text-left label-mono p-2.5 w-24">Qty</th>
              <th className="text-left label-mono p-2.5 w-32">Unit Cost</th>
              <th className="text-right label-mono p-2.5 w-32">Total</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-4 text-center text-ink-muted text-sm">No items yet.</td>
              </tr>
            ) : (
              items.map((item, idx) => {
                const isSel = selected.has(item.id);
                return (
                  <tr
                    key={item.id}
                    {...drag.rowProps(idx)}
                    className={`border-b border-hair last:border-0 ${drag.dragIndex === idx ? "opacity-40" : ""} ${isSel ? "bg-paper" : ""}`}
                    style={
                      drag.overIndex === idx && drag.dragIndex !== idx
                        ? { boxShadow: "inset 0 2px 0 #1D4ED8" }
                        : !isSel && item.color
                          ? { backgroundColor: tint(item.color) }
                          : undefined
                    }
                  >
                    <td className="p-1.5">
                      <div className="flex items-center justify-center gap-1.5">
                        <input type="checkbox" aria-label="Select item" checked={isSel} onChange={() => onToggleSelect(item.id)} />
                        <ColorPicker value={item.color} onChange={(c) => onUpdate(item.id, { color: c })} title="Item color" />
                        <DragHandle handleProps={drag.handleProps(idx)} />
                      </div>
                    </td>
                    <td className="p-1.5">
                      <input
                        value={item.description}
                        placeholder="e.g. Bathroom tile"
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
                          <option key={c} value={c}>{c}</option>
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
                    <td className="p-2.5 font-mono font-semibold text-right">{fmtMoney(item.qty * item.unitCost)}</td>
                    <td className="p-1.5 text-center">
                      <button onClick={() => onRemove(item.id)} className="icon-btn" aria-label="Remove item">
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
              <td colSpan={5} className="p-2.5 label-mono font-semibold">Subtotal</td>
              <td className="p-2.5 font-mono font-bold text-right">{fmtMoney(subtotal)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
      <button onClick={onAdd} className="btn btn-blue mt-3 inline-flex items-center gap-1.5">
        <Plus size={14} /> {addLabel}
      </button>
    </>
  );
}
