"use client";

import { useState } from "react";
import { Plus, X, Copy, Check, Table2, LayoutGrid, Trash2 } from "lucide-react";
import { useProjectContext } from "@/lib/projectContext";
import { makeId } from "@/lib/defaults";
import { totalRenovationCost } from "@/lib/calculations";
import { useCurrency } from "@/lib/currency";
import { useI18n } from "@/lib/i18n";
import { SectionHeader } from "@/components/fields";
import { copyRowsAsTSV } from "@/lib/clipboard";
import { ItemsTable } from "@/components/ItemsTable";
import { ColorPicker, tint } from "@/components/ColorPicker";
import type { Project, ItemGroup } from "@/lib/types";

const ITEM_CATEGORIES = ["Materials", "Labor", "Permits & Fees", "Contingency", "Other"];

/** Construction Estimate — the itemized scope of work (renovation line items).
 *  These line items also auto-fill the Jobs section under Jobs & Bids. */
export default function ConstructionPage() {
  const { project, setProject, loading, error } = useProjectContext();
  const { fmtMoney, currency } = useCurrency();
  const { t } = useI18n();

  const [itemsView, setItemsView] = useState<"table" | "grouped">("table");
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [itemsCopied, setItemsCopied] = useState(false);

  if (loading) return <div className="font-mono text-ink-muted text-sm uppercase">{t("Loading…")}</div>;
  if (error) return <div className="panel border-red text-red p-4 font-mono text-sm">{t(error)}</div>;
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
    const header = [t("Item"), t("Category"), t("Group"), t("Qty"), t("Unit Cost ({currency})", { currency: sym }), t("Total ({currency})", { currency: sym })];
    const rows = project!.items.map((i) => [i.description, i.category, groupName(i.groupId), i.qty, money(i.unitCost), money(i.qty * i.unitCost)]);
    if (await copyRowsAsTSV([header, ...rows])) {
      setItemsCopied(true);
      setTimeout(() => setItemsCopied(false), 1500);
    }
  }

  const ungroupedItems = project.items.filter((i) => !i.groupId);

  return (
    <div className="space-y-8">
      {/* Intro + save status (no project-name heading — it lives in the shell header) */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display font-extrabold text-2xl leading-none">{t("Construction Estimate")}</h1>
          <p className="text-sm text-ink-muted mt-1.5 max-w-2xl">{t("Line items here auto-fill the Jobs section under Jobs & Bids.")}</p>
        </div>
      </div>

      {/* Itemized remodel costs */}
      <section>
        <SectionHeader num="01" title={t("Itemized Remodel Costs")} caption={t("Color any row to tell items apart, or switch to Grouped view to organize them into colored boxes.")} />

        {/* Toolbar: view toggle, total, selection actions, copy */}
        <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="inline-flex gap-1 p-1 rounded-[13px]" style={{ background: "var(--glass-2)", border: "1px solid var(--border)" }}>
              {([
                { key: "table", label: "Table", Icon: Table2 },
                { key: "grouped", label: "Grouped", Icon: LayoutGrid },
              ] as const).map((viewOption) => (
                <button
                  key={viewOption.key}
                  onClick={() => setItemsView(viewOption.key)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] text-[12.5px] font-bold transition-colors"
                  style={itemsView === viewOption.key
                    ? { background: "var(--seg-active)", color: "var(--text)", boxShadow: "var(--shadow)" }
                    : { color: "var(--muted)" }}
                >
                  <viewOption.Icon size={14} /> {t(viewOption.label)}
                </button>
              ))}
            </div>
            <span className="font-mono text-xs text-ink-muted">{t("Total {amount}", { amount: fmtMoney(renoTotal) })}</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {selectedItems.size > 0 && (
              <select
                value=""
                onChange={(e) => {
                  if (e.target.value) moveSelectedToGroup(e.target.value === "__none" ? "" : e.target.value);
                }}
                className="field-input !py-1.5 text-xs"
                aria-label={t("Move selected to group")}
              >
                <option value="">{t("Move {n} to…", { n: selectedItems.size })}</option>
                {project.itemGroups.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
                <option value="__none">{t("Ungrouped")}</option>
              </select>
            )}
            <button onClick={copyItems} className="btn inline-flex items-center gap-1.5 shrink-0">
              {itemsCopied ? <Check size={14} /> : <Copy size={14} />} {itemsCopied ? t("Copied!") : t("Copy for Sheets")}
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
                    <ColorPicker value={g.color} onChange={(c) => updateGroup(g.id, { color: c })} size={18} title={t("Group color")} />
                    <input
                      value={g.name}
                      onChange={(e) => updateGroup(g.id, { name: e.target.value })}
                      className="font-display font-bold text-lg bg-transparent outline-none border-b-[1.5px] border-transparent focus:border-blueprint"
                      aria-label={t("Group name")}
                    />
                    <span className="font-mono text-[11px] text-ink-muted">
                      {t("{n} item(s) · {amount}", { n: groupItems.length, amount: fmtMoney(groupItems.reduce((s, i) => s + i.qty * i.unitCost, 0)) })}
                    </span>
                    <button onClick={() => removeGroup(g.id)} className="icon-btn ml-auto flex items-center justify-center" aria-label={t("Delete group")}>
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
                    addLabel={t("Add item to {name}", { name: g.name })}
                  />
                </div>
              );
            })}

            {/* Ungrouped items */}
            <div className="border-[1.5px] border-hair p-4 rounded-[18px]">
              <div className="flex items-center gap-2 mb-3">
                <span className="label-mono">{t("Ungrouped")}</span>
                <span className="font-mono text-[11px] text-ink-muted">{t("{n} item(s)", { n: ungroupedItems.length })}</span>
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
                addLabel={t("Add ungrouped item")}
              />
            </div>

            <button onClick={addGroup} className="btn btn-blue inline-flex items-center gap-1.5">
              <Plus size={14} /> {t("Add group")}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
