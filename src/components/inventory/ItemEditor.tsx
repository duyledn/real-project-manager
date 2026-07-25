"use client";

import { Trash2 } from "lucide-react";
import { CatalogCardSearch } from "./CatalogCardSearch";
import type { InventoryItemDraft } from "@/lib/inventory/client";

type ItemEditorProps = {
  draft: InventoryItemDraft;
  onChange: (draft: InventoryItemDraft) => void;
  onRemove?: () => void;
  allowClassChange?: boolean;
  showMarketValue?: boolean;
};

const fieldClass = "field-input";

export function ItemEditor({
  draft,
  onChange,
  onRemove,
  allowClassChange = true,
  showMarketValue = false,
}: ItemEditorProps) {
  const patch = <Key extends keyof InventoryItemDraft>(
    key: Key,
    value: InventoryItemDraft[Key],
  ) => onChange({ ...draft, [key]: value });

  return (
    <section className="rounded-[16px] p-4" style={{ border: "1px solid var(--border)", background: "var(--glass-2)" }}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="grid flex-1 gap-3 sm:grid-cols-3">
          <label>
            <span className="label-mono mb-1.5 block">Class</span>
            <select
              value={draft.class}
              disabled={!allowClassChange}
              onChange={(event) => patch("class", event.target.value as InventoryItemDraft["class"])}
              className={fieldClass}
            >
              <option value="sealed">Sealed</option>
              <option value="slab">Slab</option>
              <option value="single">Single</option>
              <option value="bulk">Bulk</option>
            </select>
          </label>
          <label>
            <span className="label-mono mb-1.5 block">Game</span>
            <select
              value={draft.game}
              onChange={(event) => patch("game", event.target.value as InventoryItemDraft["game"])}
              className={fieldClass}
            >
              <option value="pokemon">Pokémon</option>
              <option value="mtg">MTG</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label>
            <span className="label-mono mb-1.5 block">Quantity</span>
            <input
              type="number"
              min="1"
              value={draft.class === "slab" ? "1" : draft.quantity}
              disabled={draft.class === "slab"}
              onChange={(event) => patch("quantity", event.target.value)}
              className={fieldClass}
            />
          </label>
        </div>
        {onRemove && (
          <button type="button" className="icon-btn mt-5" onClick={onRemove} aria-label="Remove item">
            <Trash2 size={15} />
          </button>
        )}
      </div>

      {(draft.class === "single" || draft.class === "slab") && (
        <div className="mb-4">
          <CatalogCardSearch
            game={draft.game}
            onSelect={(card) =>
              onChange({
                ...draft,
                catalogCard: card,
                name: card.name,
                setCode: card.setCode,
                collectorNumber: card.collectorNumber,
                finish: card.finishes[0] ?? "normal",
                marketValue: card.marketPriceCents === null
                  ? draft.marketValue
                  : (card.marketPriceCents / 100).toFixed(2),
              })
            }
          />
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="sm:col-span-2">
          <span className="label-mono mb-1.5 block">Name</span>
          <input value={draft.name} onChange={(event) => patch("name", event.target.value)} className={fieldClass} required />
        </label>
        <label>
          <span className="label-mono mb-1.5 block">Set code</span>
          <input value={draft.setCode} onChange={(event) => patch("setCode", event.target.value)} className={fieldClass} />
        </label>
        <label>
          <span className="label-mono mb-1.5 block">Collector #</span>
          <input value={draft.collectorNumber} onChange={(event) => patch("collectorNumber", event.target.value)} className={fieldClass} />
        </label>
        <label>
          <span className="label-mono mb-1.5 block">Finish</span>
          <input value={draft.finish} onChange={(event) => patch("finish", event.target.value)} className={fieldClass} />
        </label>
        {draft.class === "single" && (
          <label>
            <span className="label-mono mb-1.5 block">Condition</span>
            <select value={draft.condition} onChange={(event) => patch("condition", event.target.value as InventoryItemDraft["condition"])} className={fieldClass}>
              {["NM", "LP", "MP", "HP", "DMG"].map((condition) => <option key={condition}>{condition}</option>)}
            </select>
          </label>
        )}
        <label>
          <span className="label-mono mb-1.5 block">Language</span>
          <input value={draft.language} onChange={(event) => patch("language", event.target.value)} className={fieldClass} />
        </label>
        <label>
          <span className="label-mono mb-1.5 block">Unit cost ($)</span>
          <input type="number" min="0" step="0.01" value={draft.unitCost} onChange={(event) => patch("unitCost", event.target.value)} className={fieldClass} />
        </label>
        {showMarketValue && (
          <label>
            <span className="label-mono mb-1.5 block">Market value ($)</span>
            <input type="number" min="0" step="0.01" value={draft.marketValue} onChange={(event) => patch("marketValue", event.target.value)} className={fieldClass} />
          </label>
        )}
        {draft.class === "sealed" && (
          <>
            <label>
              <span className="label-mono mb-1.5 block">UPC</span>
              <input value={draft.upc} onChange={(event) => patch("upc", event.target.value)} className={fieldClass} />
            </label>
            <label>
              <span className="label-mono mb-1.5 block">Product type</span>
              <input value={draft.productType} onChange={(event) => patch("productType", event.target.value)} className={fieldClass} required />
            </label>
          </>
        )}
        {draft.class === "slab" && (
          <>
            <label>
              <span className="label-mono mb-1.5 block">Grader</span>
              <input value={draft.grader} onChange={(event) => patch("grader", event.target.value)} className={fieldClass} required />
            </label>
            <label>
              <span className="label-mono mb-1.5 block">Cert number</span>
              <input value={draft.certNumber} onChange={(event) => patch("certNumber", event.target.value)} className={fieldClass} required />
            </label>
            <label>
              <span className="label-mono mb-1.5 block">Grade</span>
              <input value={draft.grade} onChange={(event) => patch("grade", event.target.value)} className={fieldClass} required />
            </label>
          </>
        )}
        {draft.class === "bulk" && (
          <>
            <label>
              <span className="label-mono mb-1.5 block">Lot type</span>
              <input value={draft.lotType} onChange={(event) => patch("lotType", event.target.value)} className={fieldClass} required />
            </label>
            <label>
              <span className="label-mono mb-1.5 block">Estimated count</span>
              <input type="number" min="0" value={draft.estimatedCount} onChange={(event) => patch("estimatedCount", event.target.value)} className={fieldClass} />
            </label>
          </>
        )}
        <label className="sm:col-span-2">
          <span className="label-mono mb-1.5 block">Notes</span>
          <input value={draft.notes} onChange={(event) => patch("notes", event.target.value)} className={fieldClass} />
        </label>
      </div>
    </section>
  );
}
