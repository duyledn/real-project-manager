import type { CatalogCard, ItemCreateInput } from "./types";

export type InventoryItemDraft = {
  clientId: string;
  class: "sealed" | "slab" | "single" | "bulk";
  game: "pokemon" | "mtg" | "other";
  name: string;
  setCode: string;
  collectorNumber: string;
  finish: string;
  condition: "NM" | "LP" | "MP" | "HP" | "DMG";
  language: string;
  quantity: string;
  unitCost: string;
  marketValue: string;
  grader: string;
  certNumber: string;
  grade: string;
  upc: string;
  productType: string;
  lotType: string;
  estimatedCount: string;
  notes: string;
  catalogCard: CatalogCard | null;
};

export function newItemDraft(itemClass: InventoryItemDraft["class"] = "single"): InventoryItemDraft {
  return {
    clientId: crypto.randomUUID(),
    class: itemClass,
    game: "pokemon",
    name: "",
    setCode: "",
    collectorNumber: "",
    finish: "normal",
    condition: "NM",
    language: "en",
    quantity: "1",
    unitCost: "0",
    marketValue: "0",
    grader: "",
    certNumber: "",
    grade: "",
    upc: "",
    productType: "",
    lotType: "Mixed cards",
    estimatedCount: "0",
    notes: "",
    catalogCard: null,
  };
}

export function toCents(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed * 100)) : 0;
}

export function draftToItem(draft: InventoryItemDraft): ItemCreateInput {
  const quantity = Math.max(1, Math.trunc(Number(draft.quantity) || 1));
  const common = {
    game: draft.game,
    name: draft.name.trim(),
    setCode: draft.setCode.trim(),
    collectorNumber: draft.collectorNumber.trim(),
    finish: draft.finish.trim() || "normal",
    language: draft.language.trim() || "en",
    catalogRef: draft.catalogCard
      ? {
          provider: draft.catalogCard.provider,
          id: draft.catalogCard.id,
          imageUrl: draft.catalogCard.imageUrl,
          marketPriceCents: draft.catalogCard.marketPriceCents,
          fetchedAt: new Date().toISOString(),
        }
      : null,
    unitCostCents: toCents(draft.unitCost),
    notes: draft.notes,
  };
  if (draft.class === "sealed") {
    return {
      ...common,
      class: "sealed",
      condition: null,
      quantity,
      upc: draft.upc.trim(),
      productType: draft.productType.trim(),
    };
  }
  if (draft.class === "slab") {
    return {
      ...common,
      class: "slab",
      condition: null,
      quantity: 1,
      grader: draft.grader.trim(),
      certNumber: draft.certNumber.trim(),
      grade: draft.grade.trim(),
    };
  }
  if (draft.class === "bulk") {
    return {
      ...common,
      class: "bulk",
      condition: null,
      quantity,
      lotType: draft.lotType.trim(),
      estimatedCount: Math.max(0, Math.trunc(Number(draft.estimatedCount) || 0)),
    };
  }
  return {
    ...common,
    class: "single",
    condition: draft.condition,
    quantity,
  };
}

