"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { Plus, X, Copy, Check, Table2, LayoutGrid, Trash2, SlidersHorizontal, Eye, Maximize2 } from "lucide-react";
import { useProjectContext } from "@/lib/projectContext";
import { makeId } from "@/lib/defaults";
import { totalRenovationCost, annualRoomRevenue, analyzeProject } from "@/lib/calculations";
import { fmtPercent, fmtMultiple } from "@/lib/format";
import { useCurrency } from "@/lib/currency";
import { NumberField, MoneyInput, MoneyField, currencySymbol, TextField, ToggleField, SaveIndicator, SectionHeader, DragHandle, EditModeProvider } from "@/components/fields";
import { useDragReorder, moveItem, moveItemsBefore } from "@/lib/useDragReorder";
import { useColumnWidths } from "@/lib/useColumnWidths";
import { capitalizeFirst, focusCellDirectlyBelow, focusColumnInLastRow } from "@/lib/tableNav";
import { copyRowsAsTSV } from "@/lib/clipboard";
import { ItemsTable } from "@/components/ItemsTable";
import { ResizableTh } from "@/components/ResizableTh";
import { ColorPicker, tint } from "@/components/ColorPicker";
import type { Project, ExpenseFrequency, ItemGroup } from "@/lib/types";
import { FREQUENCY_LABELS, FREQUENCY_FACTORS } from "@/lib/types";

const ITEM_CATEGORIES = ["Materials", "Labor", "Permits & Fees", "Contingency", "Other"];
const FREQUENCIES = Object.keys(FREQUENCY_LABELS) as ExpenseFrequency[];

export default function InputsPage() {
  const { project, setProject, loading, error, saveState } = useProjectContext();
  const { fmtMoney, currency } = useCurrency();

  // Renovation items: view mode (flat table vs grouped boxes), selection, copy.
  const [itemsView, setItemsView] = useState<"table" | "grouped">("table");
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [itemsCopied, setItemsCopied] = useState(false);

  // Assumptions: display vs edit, and the full-detail expand sheet.
  const [adjustMode, setAdjustMode] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // Live KPIs straight from the engine — never stored, always re-derived.
  const analysis = useMemo(() => (project ? analyzeProject(project) : null), [project]);

  if (loading) return <div className="font-mono text-ink-muted text-sm uppercase">Loading…</div>;
  if (error) return <div className="panel border-red text-red p-4 font-mono text-sm">{error}</div>;
  if (!project) return null;

  const renoTotal = totalRenovationCost(project);

  function patch(updater: (p: Project) => Project) {
    setProject(updater);
  }

  // --- Item CRUD ---
  function updateItem(itemId: string, fields: Partial<Project["items"][number]>) {
    patch((p) => ({ ...p, items: p.items.map((i) => (i.id === itemId ? { ...i, ...fields } : i)) }));
  }
  function removeItem(itemId: string) {
    patch((p) => ({ ...p, items: p.items.filter((i) => i.id !== itemId) }));
    setSelectedItems((s) => {
      const n = new Set(s);
      n.delete(itemId);
      return n;
    });
  }
  function addItem(groupId = "") {
    patch((p) => ({ ...p, items: [...p.items, { id: makeId(), description: "", category: "Materials", qty: 1, unitCost: 0, color: "", groupId }] }));
  }

  // --- Selection ---
  function toggleItem(id: string) {
    setSelectedItems((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }
  function toggleManyItems(ids: string[]) {
    setSelectedItems((s) => {
      const n = new Set(s);
      const allSel = ids.length > 0 && ids.every((id) => n.has(id));
      ids.forEach((id) => (allSel ? n.delete(id) : n.add(id)));
      return n;
    });
  }

  // --- Reorder: full list (table view) or within a group's slots (grouped) ---
  function reorderItemsFull(orderedIds: string[]) {
    patch((p) => ({ ...p, items: orderedIds.map((id) => p.items.find((i) => i.id === id)!).filter(Boolean) }));
  }
  function reorderItemsWithin(orderedIds: string[]) {
    const set = new Set(orderedIds);
    patch((p) => {
      let k = 0;
      const next = p.items.map((i) => (set.has(i.id) ? p.items.find((x) => x.id === orderedIds[k++])! : i));
      return { ...p, items: next };
    });
  }

  // --- Groups ---
  function addGroup() {
    patch((p) => ({ ...p, itemGroups: [...p.itemGroups, { id: makeId(), name: "New Group", color: "#3B82F6" }] }));
  }
  function updateGroup(gid: string, fields: Partial<ItemGroup>) {
    patch((p) => ({ ...p, itemGroups: p.itemGroups.map((g) => (g.id === gid ? { ...g, ...fields } : g)) }));
  }
  function removeGroup(gid: string) {
    patch((p) => ({
      ...p,
      itemGroups: p.itemGroups.filter((g) => g.id !== gid),
      items: p.items.map((i) => (i.groupId === gid ? { ...i, groupId: "" } : i)),
    }));
  }
  function moveSelectedToGroup(gid: string) {
    patch((p) => ({ ...p, items: p.items.map((i) => (selectedItems.has(i.id) ? { ...i, groupId: gid } : i)) }));
    setSelectedItems(new Set());
  }

  async function copyItems() {
    const sym = currency === "VND" ? "VND" : "USD";
    const money = (n: number) => (currency === "VND" ? Math.round(n) : Math.round(n * 100) / 100);
    const groupName = (gid: string) => project!.itemGroups.find((g) => g.id === gid)?.name ?? "";
    const header = ["Item", "Category", "Group", "Qty", `Unit Cost (${sym})`, `Total (${sym})`];
    const rows = project!.items.map((i) => [i.description, i.category, groupName(i.groupId), i.qty, money(i.unitCost), money(i.qty * i.unitCost)]);
    if (await copyRowsAsTSV([header, ...rows])) {
      setItemsCopied(true);
      setTimeout(() => setItemsCopied(false), 1500);
    }
  }

  const ungroupedItems = project.items.filter((i) => !i.groupId);

  return (
    <div className="space-y-10">
      {/* Title row */}
      <div className="panel p-5 flex items-center justify-between gap-4 flex-wrap">
        <input
          value={project.name}
          onChange={(e) => patch((p) => ({ ...p, name: e.target.value }))}
          className="font-display font-extrabold text-3xl bg-transparent outline-none border-b-[1.5px] border-transparent focus:border-blueprint flex-1 min-w-[200px]"
          aria-label="Project name"
        />
        <SaveIndicator state={saveState} />
      </div>

      {/* Headline KPIs — live from the calculation engine */}
      {analysis && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          {[
            { label: "IRR (levered)", value: fmtPercent(analysis.returns.irr), tone: (analysis.returns.irr ?? 0) >= 0 ? "pos" : "neg" },
            { label: "Equity multiple", value: fmtMultiple(analysis.returns.equityMultiple), tone: "text" },
            { label: "Cash-on-cash · Yr 1", value: fmtPercent(analysis.returns.cashOnCashYear1), tone: "text" },
            { label: "Cap rate · Yr 1", value: fmtPercent(analysis.returns.capRateYear1), tone: "text" },
          ].map((k) => (
            <div key={k.label} className="panel-2 p-[18px]">
              <div className="text-xs text-ink-muted font-semibold">{k.label}</div>
              <div
                className="font-mono text-[27px] font-extrabold tracking-tight mt-2"
                style={{ color: k.tone === "pos" ? "var(--pos)" : k.tone === "neg" ? "var(--neg)" : "var(--text)" }}
              >
                {k.value}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ===== GROUP A — Construction Estimate ===== */}
      <GroupBanner
        label="Construction Estimate"
        caption="What the remodel itself costs — the itemized scope of work. These line items also auto-fill the Jobs section under Manage."
      />

      {/* 01 — Renovation items */}
      <section>
        <SectionHeader num="01" title="Itemized Remodel Costs" caption="Color any row to tell items apart, or switch to Grouped view to organize them into colored boxes." />

        {/* Toolbar: view toggle, total, selection actions, copy */}
        <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="inline-flex gap-1 p-1 rounded-[13px]" style={{ background: "var(--glass-2)", border: "1px solid var(--border)" }}>
              {([
                { key: "table", label: "Table", Icon: Table2 },
                { key: "grouped", label: "Grouped", Icon: LayoutGrid },
              ] as const).map((t) => (
                <button
                  key={t.key}
                  onClick={() => setItemsView(t.key)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] text-[12.5px] font-bold transition-colors"
                  style={itemsView === t.key
                    ? { background: "var(--seg-active)", color: "var(--text)", boxShadow: "var(--shadow)" }
                    : { color: "var(--muted)" }}
                >
                  <t.Icon size={14} /> {t.label}
                </button>
              ))}
            </div>
            <span className="font-mono text-xs text-ink-muted">Total {fmtMoney(renoTotal)}</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {selectedItems.size > 0 && (
              <select
                value=""
                onChange={(e) => {
                  if (e.target.value) moveSelectedToGroup(e.target.value === "__none" ? "" : e.target.value);
                }}
                className="field-input !py-1.5 text-xs"
                aria-label="Move selected to group"
              >
                <option value="">Move {selectedItems.size} to…</option>
                {project.itemGroups.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
                <option value="__none">Ungrouped</option>
              </select>
            )}
            <button onClick={copyItems} className="btn inline-flex items-center gap-1.5 shrink-0">
              {itemsCopied ? <Check size={14} /> : <Copy size={14} />} {itemsCopied ? "Copied!" : "Copy for Sheets"}
            </button>
          </div>
        </div>

        {itemsView === "table" ? (
          <ItemsTable
            items={project.items}
            categories={ITEM_CATEGORIES}
            selected={selectedItems}
            onToggleSelect={toggleItem}
            onToggleSelectAll={toggleManyItems}
            onUpdate={updateItem}
            onRemove={removeItem}
            onReorderIds={reorderItemsFull}
            onAdd={() => addItem("")}
            fmtMoney={fmtMoney}
          />
        ) : (
          <div className="space-y-5">
            {project.itemGroups.map((g) => {
              const groupItems = project.items.filter((i) => i.groupId === g.id);
              return (
                <div key={g.id} className="border-[1.5px] p-4 rounded-[18px]" style={{ borderColor: g.color || "var(--border)", background: tint(g.color, "0D") }}>
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <ColorPicker value={g.color} onChange={(c) => updateGroup(g.id, { color: c })} size={18} title="Group color" />
                    <input
                      value={g.name}
                      onChange={(e) => updateGroup(g.id, { name: e.target.value })}
                      className="font-display font-bold text-lg bg-transparent outline-none border-b-[1.5px] border-transparent focus:border-blueprint"
                      aria-label="Group name"
                    />
                    <span className="font-mono text-[11px] text-ink-muted">
                      {groupItems.length} item(s) · {fmtMoney(groupItems.reduce((s, i) => s + i.qty * i.unitCost, 0))}
                    </span>
                    <button onClick={() => removeGroup(g.id)} className="icon-btn ml-auto flex items-center justify-center" aria-label="Delete group">
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <ItemsTable
                    items={groupItems}
                    categories={ITEM_CATEGORIES}
                    selected={selectedItems}
                    onToggleSelect={toggleItem}
                    onToggleSelectAll={toggleManyItems}
                    onUpdate={updateItem}
                    onRemove={removeItem}
                    onReorderIds={reorderItemsWithin}
                    onAdd={() => addItem(g.id)}
                    fmtMoney={fmtMoney}
                    addLabel={`Add item to ${g.name}`}
                  />
                </div>
              );
            })}

            {/* Ungrouped items */}
            <div className="border-[1.5px] border-hair p-4 rounded-[18px]">
              <div className="flex items-center gap-2 mb-3">
                <span className="label-mono">Ungrouped</span>
                <span className="font-mono text-[11px] text-ink-muted">{ungroupedItems.length} item(s)</span>
              </div>
              <ItemsTable
                items={ungroupedItems}
                categories={ITEM_CATEGORIES}
                selected={selectedItems}
                onToggleSelect={toggleItem}
                onToggleSelectAll={toggleManyItems}
                onUpdate={updateItem}
                onRemove={removeItem}
                onReorderIds={reorderItemsWithin}
                onAdd={() => addItem("")}
                fmtMoney={fmtMoney}
                addLabel="Add ungrouped item"
              />
            </div>

            <button onClick={addGroup} className="btn btn-blue inline-flex items-center gap-1.5">
              <Plus size={14} /> Add group
            </button>
          </div>
        )}
      </section>

      {/* ===== GROUP B — Investment Estimate ===== */}
      <GroupBanner
        label="Investment Estimate"
        caption="The buy-rehab-hold model: how you acquire and finance the property, hold-period assumptions, income, expenses, and exit. Drives the Analysis, Math, and Report tabs."
      />

      {/* Assumptions toolbar — Adjust (edit) + Expand all */}
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <div className="font-display font-bold text-lg">Assumptions</div>
          <div className="text-sm text-ink-muted mt-0.5">
            {adjustMode
              ? "Editing — every change autosaves and recalculates live."
              : "Read-only display. Toggle Adjust to edit the fields."}
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setAdjustMode((a) => !a)} className={adjustMode ? "btn btn-blue gap-1.5" : "btn gap-1.5"}>
            {adjustMode ? <Eye size={16} /> : <SlidersHorizontal size={16} />}
            {adjustMode ? "Done" : "Adjust"}
          </button>
          <button onClick={() => setExpanded(true)} className="btn gap-1.5">
            <Maximize2 size={16} /> Expand all
          </button>
        </div>
      </div>

      <EditModeProvider readOnly={!adjustMode}>
      {/* 01 — Acquisition */}
      <section>
        <SectionHeader num="01" title="Acquisition & Basis" caption="What you pay for the property, and how much of it is non-depreciable land." />
        <div className="panel p-5 grid sm:grid-cols-3 gap-5">
          <MoneyField label="Purchase Price" min={0} value={project.purchasePrice} onChange={(v) => patch((p) => ({ ...p, purchasePrice: v }))} />
          <MoneyField label="Closing Costs" min={0} value={project.closingCosts} onChange={(v) => patch((p) => ({ ...p, closingCosts: v }))} />
          <NumberField label="Land Portion" suffix="%" step={1} min={0} value={project.landPercent} onChange={(v) => patch((p) => ({ ...p, landPercent: v }))} hint="Land can't be depreciated; this carves it out of the basis." />
        </div>
      </section>

      {/* 02 — Financing */}
      <section>
        <SectionHeader num="02" title="Financing" caption="Borrowed capital, rate, and the interest-only rehab window before the loan begins amortizing." />
        <div className="panel p-5 grid sm:grid-cols-3 gap-5">
          <MoneyField label="Borrowed Capital" min={0} value={project.borrowed} onChange={(v) => patch((p) => ({ ...p, borrowed: v }))} />
          <NumberField label="Annual Interest Rate" suffix="%" step={0.1} min={0} value={project.interestRate} onChange={(v) => patch((p) => ({ ...p, interestRate: v }))} />
          <NumberField label="Construction Period" suffix="mo" step={1} min={0} value={project.constructionMonths} onChange={(v) => patch((p) => ({ ...p, constructionMonths: Math.round(v) }))} hint="Interest-only months before the property is rented." />
          <ToggleField label="Loan Type After Rehab" value={project.amortize} onChange={(v) => patch((p) => ({ ...p, amortize: v }))} trueLabel="Amortizing P&I" falseLabel="Interest-only" hint="Amortizing pays down principal over the term." />
          <NumberField label="Amortization Term" suffix="yr" step={1} min={1} value={project.loanTermYears} onChange={(v) => patch((p) => ({ ...p, loanTermYears: Math.round(v) }))} />
        </div>
      </section>

      {/* 03 — Hold assumptions */}
      <section>
        <SectionHeader num="03" title="Hold Period & Growth" caption="How long you hold, and the annual growth applied to rent and expenses. Add years anytime — the analysis re-projects automatically." />
        <div className="panel p-5 grid sm:grid-cols-3 gap-5">
          <NumberField label="Hold Period" suffix="yr" step={1} min={1} value={project.holdYears} onChange={(v) => patch((p) => ({ ...p, holdYears: Math.round(v) }))} hint="3, 5, 10… extend as far as you like." />
          <NumberField label="Rent Growth" suffix="%/yr" step={0.1} value={project.rentGrowthRate} onChange={(v) => patch((p) => ({ ...p, rentGrowthRate: v }))} />
          <NumberField label="Expense Growth" suffix="%/yr" step={0.1} value={project.expenseGrowthRate} onChange={(v) => patch((p) => ({ ...p, expenseGrowthRate: v }))} />
          <NumberField label="Vacancy Allowance" suffix="%" step={0.5} min={0} value={project.vacancyRate} onChange={(v) => patch((p) => ({ ...p, vacancyRate: v }))} />
        </div>
      </section>

      {/* 04 — Revenue sources */}
      <section>
        <SectionHeader num="04" title="Revenue Sources" caption="Income the property produces. Room revenue appears as a live line item below, then vacancy is applied alongside the other sources." />

        {/* Room revenue (hotel / short-term rental) */}
        <div className="panel p-5 mb-4">
          <div className="label-mono mb-3">Room Revenue</div>
          <div className="grid sm:grid-cols-3 gap-5">
            <NumberField label="Number of Rooms" step={1} min={0} value={project.rooms} onChange={(v) => patch((p) => ({ ...p, rooms: Math.round(v) }))} hint="Rentable rooms / keys. Leave 0 if not a per-room model." />
            <MoneyField label="Average Daily Room Revenue (ADR)" min={0} value={project.adr} onChange={(v) => patch((p) => ({ ...p, adr: v }))} hint="Revenue per available room, per night." />
            <NumberField label="Vacancy Allowance" suffix="%" step={0.5} min={0} value={project.vacancyRate} onChange={(v) => patch((p) => ({ ...p, vacancyRate: v }))} hint="Shared with the line items below." />
          </div>
          {(project.rooms > 0 && project.adr > 0) && (
            <div className="mt-4 pt-4 border-t border-hair grid sm:grid-cols-3 gap-3 text-sm">
              <div>
                <div className="label-mono mb-1">Gross / yr</div>
                <div className="font-mono font-semibold">{fmtMoney(annualRoomRevenue(project))}</div>
                <div className="text-[11px] text-ink-muted">{project.rooms} rooms × {fmtMoney(project.adr)} × 365</div>
              </div>
              <div>
                <div className="label-mono mb-1">Expected room revenue / yr</div>
                <div className="font-mono font-bold text-green">{fmtMoney(annualRoomRevenue(project) * (1 - project.vacancyRate / 100))}</div>
                <div className="text-[11px] text-ink-muted">after {project.vacancyRate}% vacancy</div>
              </div>
              <div>
                <div className="label-mono mb-1">Per occupied room-night</div>
                <div className="font-mono font-semibold">{fmtMoney(project.adr)}</div>
                <div className="text-[11px] text-ink-muted">{Math.round(365 * (1 - project.vacancyRate / 100))} occupied nights/room/yr</div>
              </div>
            </div>
          )}
        </div>

        <RecurringTable
          rows={project.incomes}
          pinnedRow={
            project.rooms > 0 && project.adr > 0
              ? { label: "Room revenue", amount: annualRoomRevenue(project) * (1 - project.vacancyRate / 100) }
              : null
          }
          onAdd={() => patch((p) => ({ ...p, incomes: [...p.incomes, { id: makeId(), label: "", amount: 0, frequency: "monthly" as ExpenseFrequency }] }))}
          onChange={(rowId, field, value) =>
            patch((p) => ({ ...p, incomes: p.incomes.map((i) => (i.id === rowId ? { ...i, [field]: value } : i)) }))
          }
          onRemove={(rowId) => patch((p) => ({ ...p, incomes: p.incomes.filter((i) => i.id !== rowId) }))}
          onReorderIds={(ids) => patch((p) => ({ ...p, incomes: ids.map((id) => p.incomes.find((i) => i.id === id)!).filter(Boolean) }))}
          labelHeader="Source"
          addLabel="Add revenue source"
          fmtMoney={fmtMoney}
        />
      </section>

      {/* 05 — Operating expenses */}
      <section>
        <SectionHeader num="05" title="Operating Expenses" caption="Costs to run the property. Enter the amount per period using the frequency selector on each row." />
        <RecurringTable
          rows={project.expenses}
          onAdd={() => patch((p) => ({ ...p, expenses: [...p.expenses, { id: makeId(), label: "", category: "Other", amount: 0, frequency: "monthly" as ExpenseFrequency }] }))}
          onChange={(rowId, field, value) =>
            patch((p) => ({ ...p, expenses: p.expenses.map((e) => (e.id === rowId ? { ...e, [field]: value } : e)) }))
          }
          onRemove={(rowId) => patch((p) => ({ ...p, expenses: p.expenses.filter((e) => e.id !== rowId) }))}
          onReorderIds={(ids) => patch((p) => ({ ...p, expenses: ids.map((id) => p.expenses.find((e) => e.id === id)!).filter(Boolean) }))}
          labelHeader="Expense"
          addLabel="Add expense"
          fmtMoney={fmtMoney}
        />
      </section>

      {/* 06 — Exit & tax */}
      <section>
        <SectionHeader num="06" title="Exit & Tax Assumptions" caption="How the property is valued at sale, and the tax rate used for after-tax returns." />
        <div className="panel p-5 grid sm:grid-cols-3 gap-5">
          <NumberField label="Appreciation Rate" suffix="%/yr" step={0.1} value={project.appreciationRate} onChange={(v) => patch((p) => ({ ...p, appreciationRate: v }))} hint="Used to project sale price if no override below." />
          <MoneyField label="Exit Value Override" min={0} value={project.exitValueOverride ?? 0} onChange={(v) => patch((p) => ({ ...p, exitValueOverride: v > 0 ? v : null }))} hint="Set a specific sale price. 0 = use appreciation projection." />
          <NumberField label="Selling Costs" suffix="%" step={0.5} min={0} value={project.sellingCostPercent} onChange={(v) => patch((p) => ({ ...p, sellingCostPercent: v }))} hint="Commission + closing on the sale." />
          <NumberField label="Marginal Tax Rate" suffix="%" step={1} min={0} value={project.taxRate} onChange={(v) => patch((p) => ({ ...p, taxRate: v }))} hint="Set 0 to analyze pre-tax." />
          <NumberField label="Depreciation Life" suffix="yr" step={0.5} min={1} value={project.depreciationLifeYears} onChange={(v) => patch((p) => ({ ...p, depreciationLifeYears: v }))} hint="27.5 for US residential rental." />
          <NumberField label="Depreciation Recapture Tax" suffix="%" step={1} min={0} value={project.recaptureTaxRate} onChange={(v) => patch((p) => ({ ...p, recaptureTaxRate: v }))} hint="Tax on depreciation taken, due at sale. ~25% in the US. Set 0 to ignore." />
        </div>
      </section>
      </EditModeProvider>

      {expanded && (
        <ExpandAllSheet
          project={project}
          patch={patch}
          renoTotal={renoTotal}
          netProfit={analysis ? analysis.returns.totalProfit : 0}
          fmtMoney={fmtMoney}
          onClose={() => setExpanded(false)}
        />
      )}
    </div>
  );
}

// --- Full-detail expand sheet: every assumption, one scrollable layout -------
function ExpandAllSheet({
  project,
  patch,
  renoTotal,
  netProfit,
  fmtMoney,
  onClose,
}: {
  project: Project;
  patch: (updater: (p: Project) => Project) => void;
  renoTotal: number;
  netProfit: number;
  fmtMoney: (n: number | null | undefined) => string;
  onClose: () => void;
}) {
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6"
      style={{ background: "rgba(20,12,8,0.5)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-[940px] max-w-full flex flex-col"
        style={{
          maxHeight: "88vh",
          borderRadius: 24,
          background: "var(--glass-strong)",
          backdropFilter: "var(--blur)",
          WebkitBackdropFilter: "var(--blur)",
          border: "1px solid var(--border)",
          borderTopColor: "var(--border-top)",
          boxShadow: "var(--shadow-lg)",
          animation: "popIn .3s cubic-bezier(.32,.72,0,1) both",
        }}
      >
        <div className="flex items-center justify-between gap-3 px-6 py-5 border-b" style={{ borderColor: "var(--border)" }}>
          <div>
            <div className="text-[11px] font-bold tracking-[0.06em] uppercase text-accent">Full detail</div>
            <div className="text-xl font-extrabold tracking-tight mt-0.5">All inputs &amp; assumptions</div>
          </div>
          <button onClick={onClose} className="icon-btn" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-5 sm:p-6">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="panel-2 p-[18px]">
              <div className="font-display font-bold text-base mb-3">Acquisition &amp; rehab</div>
              <div className="grid grid-cols-1 gap-4">
                <MoneyField label="Purchase price" min={0} value={project.purchasePrice} onChange={(v) => patch((p) => ({ ...p, purchasePrice: v }))} />
                <MoneyField label="Closing costs" min={0} value={project.closingCosts} onChange={(v) => patch((p) => ({ ...p, closingCosts: v }))} />
                <NumberField label="Land portion" suffix="%" min={0} value={project.landPercent} onChange={(v) => patch((p) => ({ ...p, landPercent: v }))} />
                <div className="flex items-center justify-between pt-1">
                  <span className="label-mono">Renovation budget</span>
                  <span className="font-mono font-semibold">{fmtMoney(renoTotal)}</span>
                </div>
              </div>
            </div>

            <div className="panel-2 p-[18px]">
              <div className="font-display font-bold text-base mb-3">Financing</div>
              <div className="grid grid-cols-1 gap-4">
                <MoneyField label="Borrowed capital" min={0} value={project.borrowed} onChange={(v) => patch((p) => ({ ...p, borrowed: v }))} />
                <NumberField label="Annual interest rate" suffix="%" min={0} value={project.interestRate} onChange={(v) => patch((p) => ({ ...p, interestRate: v }))} />
                <NumberField label="Construction period" suffix="mo" min={0} value={project.constructionMonths} onChange={(v) => patch((p) => ({ ...p, constructionMonths: Math.round(v) }))} />
                <ToggleField label="Loan type after rehab" value={project.amortize} onChange={(v) => patch((p) => ({ ...p, amortize: v }))} trueLabel="Amortizing P&I" falseLabel="Interest-only" />
                <NumberField label="Amortization term" suffix="yr" min={1} value={project.loanTermYears} onChange={(v) => patch((p) => ({ ...p, loanTermYears: Math.round(v) }))} />
              </div>
            </div>

            <div className="panel-2 p-[18px]">
              <div className="font-display font-bold text-base mb-3">Operating &amp; hold</div>
              <div className="grid grid-cols-1 gap-4">
                <NumberField label="Hold period" suffix="yr" min={1} value={project.holdYears} onChange={(v) => patch((p) => ({ ...p, holdYears: Math.round(v) }))} />
                <NumberField label="Rent growth" suffix="%/yr" value={project.rentGrowthRate} onChange={(v) => patch((p) => ({ ...p, rentGrowthRate: v }))} />
                <NumberField label="Expense growth" suffix="%/yr" value={project.expenseGrowthRate} onChange={(v) => patch((p) => ({ ...p, expenseGrowthRate: v }))} />
                <NumberField label="Vacancy allowance" suffix="%" min={0} value={project.vacancyRate} onChange={(v) => patch((p) => ({ ...p, vacancyRate: v }))} />
              </div>
            </div>

            <div className="panel-2 p-[18px]">
              <div className="font-display font-bold text-base mb-3">Revenue &amp; exit</div>
              <div className="grid grid-cols-1 gap-4">
                <NumberField label="Number of rooms" min={0} value={project.rooms} onChange={(v) => patch((p) => ({ ...p, rooms: Math.round(v) }))} />
                <MoneyField label="Average daily room revenue" min={0} value={project.adr} onChange={(v) => patch((p) => ({ ...p, adr: v }))} />
                <NumberField label="Appreciation rate" suffix="%/yr" value={project.appreciationRate} onChange={(v) => patch((p) => ({ ...p, appreciationRate: v }))} />
                <MoneyField label="Exit value override" min={0} value={project.exitValueOverride ?? 0} onChange={(v) => patch((p) => ({ ...p, exitValueOverride: v > 0 ? v : null }))} />
                <NumberField label="Selling costs" suffix="%" min={0} value={project.sellingCostPercent} onChange={(v) => patch((p) => ({ ...p, sellingCostPercent: v }))} />
                <NumberField label="Marginal tax rate" suffix="%" min={0} value={project.taxRate} onChange={(v) => patch((p) => ({ ...p, taxRate: v }))} />
                <NumberField label="Depreciation life" suffix="yr" min={1} value={project.depreciationLifeYears} onChange={(v) => patch((p) => ({ ...p, depreciationLifeYears: v }))} />
                <NumberField label="Depreciation recapture tax" suffix="%" min={0} value={project.recaptureTaxRate} onChange={(v) => patch((p) => ({ ...p, recaptureTaxRate: v }))} />
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 px-6 py-4 border-t" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-2.5">
            <span className="text-[12.5px] text-ink-muted font-semibold">Projected net profit</span>
            <span className="font-mono text-xl font-extrabold" style={{ color: netProfit >= 0 ? "var(--pos)" : "var(--neg)" }}>
              {fmtMoney(netProfit)}
            </span>
          </div>
          <button onClick={onClose} className="btn btn-blue gap-1.5">
            <Check size={16} /> Done
          </button>
        </div>
      </div>
    </div>
  );
}

/** Big divider that groups the page into "Construction Estimate" and
 *  "Investment Estimate". Purely presentational. */
function GroupBanner({ label, caption }: { label: string; caption?: string }) {
  return (
    <div
      className="rounded-[20px] px-5 py-4 text-white"
      style={{
        background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
        boxShadow: "0 10px 26px var(--accent-soft)",
      }}
    >
      <div className="font-mono text-[11px] tracking-widest uppercase text-white/75 mb-1">Section</div>
      <h2 className="font-display font-extrabold text-2xl uppercase tracking-wide leading-none">{label}</h2>
      {caption && <p className="text-sm text-white/85 mt-1.5 max-w-2xl">{caption}</p>}
    </div>
  );
}

// --- Shared recurring-row table for expenses & incomes ---
interface RecurringRow {
  id: string;
  label: string;
  category?: string;
  amount: number;
  frequency: ExpenseFrequency;
}

function RecurringTable({
  rows,
  onAdd,
  onChange,
  onRemove,
  onReorderIds,
  labelHeader,
  addLabel,
  fmtMoney,
  pinnedRow,
}: {
  rows: RecurringRow[];
  onAdd: () => void;
  onChange: (rowId: string, field: string, value: string | number | boolean) => void;
  onRemove: (rowId: string) => void;
  onReorderIds: (ids: string[]) => void;
  labelHeader: string;
  addLabel: string;
  fmtMoney: (n: number | null | undefined) => string;
  /** Optional read-only auto-computed row pinned to the top (e.g. room revenue). */
  pinnedRow?: { label: string; amount: number } | null;
}) {
  const annualTotal =
    rows.reduce((s, r) => s + r.amount * FREQUENCY_FACTORS[r.frequency], 0) + (pinnedRow?.amount ?? 0);
  const { currency } = useCurrency();

  // Resizable columns (shared across the income & expense tables).
  const { widths, startResize } = useColumnWidths("recurring", { label: 220, amount: 144, freq: 176, annual: 128 });
  const tableWidth = 40 + widths.label + widths.amount + widths.freq + widths.annual + 40;

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);

  const drag = useDragReorder((from, to) => {
    const draggedId = rows[from]?.id;
    const newRows =
      draggedId && selected.has(draggedId) && selected.size > 1
        ? moveItemsBefore(rows, selected, to)
        : moveItem(rows, from, to);
    onReorderIds(newRows.map((r) => r.id));
    return draggedId ? newRows.findIndex((r) => r.id === draggedId) : to;
  });

  function toggleRow(id: string) {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }
  function toggleAll() {
    setSelected((s) => (s.size === rows.length ? new Set() : new Set(rows.map((r) => r.id))));
  }

  async function copyTable() {
    const sym = currency === "VND" ? "VND" : "USD";
    const money = (n: number) => (currency === "VND" ? Math.round(n) : Math.round(n * 100) / 100);
    const header = [labelHeader, `Amount (${sym})`, "Frequency", `Annual Total (${sym})`];
    const body = rows.map((r) => [
      r.label,
      money(r.amount),
      FREQUENCY_LABELS[r.frequency],
      money(r.amount * FREQUENCY_FACTORS[r.frequency]),
    ]);
    if (await copyRowsAsTSV([header, ...body])) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }

  // Spreadsheet-style Enter navigation: move to the same column in the row
  // below, creating a new row when at the bottom.
  const tableRef = useRef<HTMLTableElement>(null);
  const [pendingCol, setPendingCol] = useState<number | null>(null);
  useEffect(() => {
    if (pendingCol == null) return;
    focusColumnInLastRow(tableRef.current, pendingCol);
    setPendingCol(null);
  }, [pendingCol, rows]);

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

  return (
    <>
      <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
        <div className="text-sm text-ink-muted">
          {selected.size > 0
            ? `${selected.size} selected — drag any selected row to move them together`
            : "Tick rows to move several at once."}
        </div>
        <button onClick={copyTable} className="btn inline-flex items-center gap-1.5 shrink-0">
          {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? "Copied!" : "Copy for Sheets"}
        </button>
      </div>
      <div className="panel overflow-x-auto">
        <table ref={tableRef} className="border-collapse" style={{ tableLayout: "fixed", width: tableWidth }}>
          <colgroup>
            <col style={{ width: 40 }} />
            <col style={{ width: widths.label }} />
            <col style={{ width: widths.amount }} />
            <col style={{ width: widths.freq }} />
            <col style={{ width: widths.annual }} />
            <col style={{ width: 40 }} />
          </colgroup>
          <thead>
            <tr className="border-b-[1.5px] border-ink">
              <th className="p-2.5">
                <input
                  type="checkbox"
                  aria-label="Select all rows"
                  checked={rows.length > 0 && selected.size === rows.length}
                  onChange={toggleAll}
                />
              </th>
              <ResizableTh label={labelHeader} col="label" startResize={startResize} />
              <ResizableTh label="Amount" col="amount" startResize={startResize} />
              <ResizableTh label="Frequency" col="freq" startResize={startResize} />
              <ResizableTh label="Annual Total" col="annual" startResize={startResize} align="right" />
              <th />
            </tr>
          </thead>
          <tbody>
            {pinnedRow && (
              <tr className="border-b border-hair bg-paper/70">
                <td className="p-1.5" />
                <td className="p-2.5">
                  <span className="font-semibold">{pinnedRow.label}</span>
                  <span className="label-mono ml-2">auto</span>
                </td>
                <td className="p-2.5 font-mono text-right text-ink-muted">{fmtMoney(pinnedRow.amount)}</td>
                <td className="p-2.5 text-sm text-ink-muted">Annual</td>
                <td className="p-2.5 font-mono font-semibold text-right text-green">{fmtMoney(pinnedRow.amount)}</td>
                <td />
              </tr>
            )}
            {rows.map((row, idx) => (
              <tr
                key={row.id}
                {...drag.rowProps(idx)}
                className={`group border-b border-hair last:border-0 transition-colors ${drag.dragIndex === idx ? "" : "hover:bg-[var(--accent-soft)]"} ${selected.has(row.id) && drag.dragIndex !== idx ? "bg-paper" : ""}`}
                style={drag.dragIndex === idx
                  ? { background: "var(--surface-solid)", outline: "2px solid var(--accent)", outlineOffset: "-2px", position: "relative", zIndex: 1 }
                  : undefined}
              >
                <td className="p-1.5">
                  <div className="flex items-center justify-center gap-1.5">
                    <input
                      type="checkbox"
                      aria-label="Select row"
                      checked={selected.has(row.id)}
                      onChange={() => toggleRow(row.id)}
                      className={`transition-opacity ${selected.has(row.id) ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus-visible:opacity-100"}`}
                    />
                    <DragHandle handleProps={drag.handleProps(idx)} />
                  </div>
                </td>
                <td className="p-1.5">
                  <input
                    value={row.label}
                    placeholder="Description"
                    onChange={(e) => onChange(row.id, "label", capitalizeFirst(e.target.value))}
                    onKeyDown={onCellEnter}
                    className="cell-input"
                  />
                </td>
                <td className="p-1.5">
                  <div className="flex items-center">
                    <span className="font-mono text-ink-muted text-xs">{currencySymbol(currency)}</span>
                    <MoneyInput
                      value={row.amount}
                      min={0}
                      onChange={(v) => onChange(row.id, "amount", v)}
                      onKeyDown={onCellEnter}
                      className="cell-input font-mono text-right"
                    />
                  </div>
                </td>
                <td className="p-1.5">
                  <select
                    value={row.frequency}
                    onChange={(e) => onChange(row.id, "frequency", e.target.value)}
                    onKeyDown={onCellEnter}
                    className="cell-input"
                  >
                    {FREQUENCIES.map((f) => (
                      <option key={f} value={f}>{FREQUENCY_LABELS[f]}</option>
                    ))}
                  </select>
                </td>
                <td className="p-2.5 font-mono text-right text-sm text-ink-muted">
                  {row.frequency === "once"
                    ? fmtMoney(row.amount)
                    : fmtMoney(row.amount * FREQUENCY_FACTORS[row.frequency])}
                </td>
                <td className="p-1.5 text-center">
                  <button onClick={() => onRemove(row.id)} className="icon-btn" aria-label="Remove row"><X size={13} /></button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-[1.5px] border-ink">
              <td className="p-2.5 label-mono font-semibold" colSpan={4}>Annual Total</td>
              <td className="p-2.5 font-mono font-bold text-right">{fmtMoney(annualTotal)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
      <button
        onClick={() => {
          onAdd();
          setPendingCol(1);
        }}
        className="btn btn-blue mt-3 inline-flex items-center gap-1.5"
      >
        <Plus size={14} /> {addLabel}
      </button>
    </>
  );
}
