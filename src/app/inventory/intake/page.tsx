"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Plus } from "lucide-react";
import { ItemEditor } from "@/components/inventory/ItemEditor";
import {
  draftToItem,
  newItemDraft,
  toCents,
  type InventoryItemDraft,
} from "@/lib/inventory/client";
import { allocateBoxBreak, allocateCollectionBuy } from "@/lib/inventory/costBasis";
import type { InventoryItem } from "@/lib/inventory/types";

type Flow = "distributor" | "collection_buy" | "box_break" | "grading_return";

const flowLabels: Record<Flow, { title: string; description: string }> = {
  distributor: { title: "Distributor / direct", description: "Enter received products at their direct unit cost." },
  collection_buy: { title: "Collection buy", description: "Allocate total paid across extracted cards by market value, with optional bulk residue." },
  box_break: { title: "Box break", description: "Consume sealed inventory and move its basis into pulled singles or bulk." },
  grading_return: { title: "Grading return", description: "Convert one raw single into a serialized slab and add grading costs." },
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function money(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function InventoryIntakePage() {
  const [flow, setFlow] = useState<Flow>("distributor");
  const [source, setSource] = useState("");
  const [date, setDate] = useState(today());
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<InventoryItemDraft[]>([newItemDraft("sealed")]);
  const [totalPaid, setTotalPaid] = useState("0");
  const [residueCost, setResidueCost] = useState("0");
  const [bulkResidue, setBulkResidue] = useState<InventoryItemDraft>(newItemDraft("bulk"));
  const [sourceItemId, setSourceItemId] = useState("");
  const [consumeQuantity, setConsumeQuantity] = useState("1");
  const [gradingFee, setGradingFee] = useState("0");
  const [shippingShare, setShippingShare] = useState("0");
  const [sourceItems, setSourceItems] = useState<InventoryItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<{ id: string; count: number } | null>(null);

  useEffect(() => {
    if (flow !== "box_break" && flow !== "grading_return") return;
    const controller = new AbortController();
    const itemClass = flow === "box_break" ? "sealed" : "single";
    fetch(`/api/inventory/items?class=${itemClass}&status=active&pageSize=100&sortBy=name&sortDir=asc`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? "Could not load source inventory");
        setSourceItems(body.items);
        setSourceItemId((current) => current || body.items[0]?.id || "");
      })
      .catch((caught) => {
        if (!controller.signal.aborted) {
          setError(caught instanceof Error ? caught.message : "Could not load source inventory");
        }
      });
    return () => controller.abort();
  }, [flow]);

  const collectionPreview = useMemo(() => {
    if (flow !== "collection_buy") return [];
    try {
      return allocateCollectionBuy(
        toCents(totalPaid),
        items.map((item) => ({ id: item.clientId, marketValueCents: toCents(item.marketValue) })),
        toCents(residueCost),
      ).items;
    } catch {
      return [];
    }
  }, [flow, items, residueCost, totalPaid]);

  const selectedSource = sourceItems.find((item) => item.id === sourceItemId);
  const boxPreview = useMemo(() => {
    if (flow !== "box_break" || !selectedSource) return [];
    try {
      return allocateBoxBreak(
        selectedSource.unitCostCents * Math.max(1, Number(consumeQuantity) || 1),
        items.map((item) => ({ id: item.clientId, marketValueCents: toCents(item.marketValue) })),
      );
    } catch {
      return [];
    }
  }, [consumeQuantity, flow, items, selectedSource]);

  function chooseFlow(next: Flow) {
    setFlow(next);
    setError("");
    setSuccess(null);
    setSourceItemId("");
    if (next === "distributor") setItems([newItemDraft("sealed")]);
    if (next === "collection_buy") setItems([newItemDraft("single")]);
    if (next === "box_break") setItems([newItemDraft("single")]);
    if (next === "grading_return") setItems([newItemDraft("slab")]);
  }

  function patchItem(clientId: string, next: InventoryItemDraft) {
    setItems((current) => current.map((item) => item.clientId === clientId ? next : item));
  }

  function removeItem(clientId: string) {
    setItems((current) => current.filter((item) => item.clientId !== clientId));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess(null);
    try {
      const common = { type: flow, source, date, notes };
      let body: unknown;
      if (flow === "distributor") {
        body = { ...common, items: items.map(draftToItem) };
      } else if (flow === "collection_buy") {
        body = {
          ...common,
          totalCostCents: toCents(totalPaid),
          items: items.map((item) => ({
            item: draftToItem(item),
            marketValueCents: toCents(item.marketValue),
          })),
          residueCostCents: toCents(residueCost),
          bulkResidue: toCents(residueCost) > 0 ? draftToItem(bulkResidue) : undefined,
        };
      } else if (flow === "box_break") {
        body = {
          ...common,
          sourceItemId,
          quantity: Math.max(1, Math.trunc(Number(consumeQuantity) || 1)),
          outputs: items.map((item) => ({
            item: draftToItem(item),
            marketValueCents: toCents(item.marketValue),
          })),
        };
      } else {
        body = {
          ...common,
          sourceItemId,
          gradingFeeCents: toCents(gradingFee),
          shippingShareCents: toCents(shippingShare),
          slab: draftToItem(items[0]),
        };
      }
      const response = await fetch("/api/inventory/acquisitions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const responseBody = await response.json();
      if (!response.ok) {
        const details = responseBody.details?.formErrors?.join(", ");
        throw new Error(details || responseBody.error || "Could not commit intake");
      }
      setSuccess({ id: responseBody.acquisitionId, count: responseBody.items.length });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not commit intake");
    } finally {
      setSubmitting(false);
    }
  }

  const preview = flow === "collection_buy" ? collectionPreview : boxPreview;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <Link href="/inventory" className="btn mb-5 gap-2">
        <ArrowLeft size={14} /> Back to inventory
      </Link>

      <header className="panel mb-6 p-6">
        <div className="label-mono mb-2 text-accent">Guided acquisition</div>
        <h1 className="font-display text-4xl font-extrabold">Inventory intake</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Every committed quantity becomes an append-only ledger entry.
        </p>
      </header>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" role="tablist" aria-label="Intake type">
        {(Object.keys(flowLabels) as Flow[]).map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={flow === key}
            onClick={() => chooseFlow(key)}
            className="panel p-4 text-left transition-transform hover:-translate-y-0.5"
            style={{ borderColor: flow === key ? "var(--accent)" : undefined }}
          >
            <span className="block text-sm font-extrabold">{flowLabels[key].title}</span>
            <span className="mt-1 block text-xs leading-relaxed text-ink-muted">{flowLabels[key].description}</span>
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="panel p-5 sm:p-6">
        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          <label>
            <span className="label-mono mb-1.5 block">Source</span>
            <input value={source} onChange={(event) => setSource(event.target.value)} className="field-input" placeholder="Vendor, seller, or event" />
          </label>
          <label>
            <span className="label-mono mb-1.5 block">Date</span>
            <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="field-input" required />
          </label>
          <label>
            <span className="label-mono mb-1.5 block">Acquisition notes</span>
            <input value={notes} onChange={(event) => setNotes(event.target.value)} className="field-input" />
          </label>
        </div>

        {flow === "collection_buy" && (
          <div className="mb-6 grid gap-3 sm:grid-cols-2">
            <label>
              <span className="label-mono mb-1.5 block">Total paid ($)</span>
              <input type="number" min="0.01" step="0.01" value={totalPaid} onChange={(event) => setTotalPaid(event.target.value)} className="field-input" required />
            </label>
            <label>
              <span className="label-mono mb-1.5 block">Bulk residue basis ($)</span>
              <input type="number" min="0" step="0.01" value={residueCost} onChange={(event) => setResidueCost(event.target.value)} className="field-input" />
            </label>
          </div>
        )}

        {(flow === "box_break" || flow === "grading_return") && (
          <div className="mb-6 grid gap-3 sm:grid-cols-2">
            <label>
              <span className="label-mono mb-1.5 block">{flow === "box_break" ? "Sealed source" : "Raw single source"}</span>
              <select value={sourceItemId} onChange={(event) => setSourceItemId(event.target.value)} className="field-input" required>
                <option value="">Choose inventory item</option>
                {sourceItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.sku} · {item.name} · qty {item.quantityOnHand} · {money(item.unitCostCents)}
                  </option>
                ))}
              </select>
            </label>
            {flow === "box_break" ? (
              <label>
                <span className="label-mono mb-1.5 block">Quantity to consume</span>
                <input type="number" min="1" max={selectedSource?.quantityOnHand} value={consumeQuantity} onChange={(event) => setConsumeQuantity(event.target.value)} className="field-input" required />
              </label>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <label>
                  <span className="label-mono mb-1.5 block">Grading fee ($)</span>
                  <input type="number" min="0" step="0.01" value={gradingFee} onChange={(event) => setGradingFee(event.target.value)} className="field-input" />
                </label>
                <label>
                  <span className="label-mono mb-1.5 block">Shipping share ($)</span>
                  <input type="number" min="0" step="0.01" value={shippingShare} onChange={(event) => setShippingShare(event.target.value)} className="field-input" />
                </label>
              </div>
            )}
          </div>
        )}

        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-lg font-extrabold">
            {flow === "grading_return" ? "Returned slab" : flow === "box_break" ? "Break outputs" : "Items"}
          </h2>
          {flow !== "grading_return" && (
            <button
              type="button"
              className="btn gap-2"
              onClick={() => setItems((current) => [...current, newItemDraft(flow === "distributor" ? "sealed" : "single")])}
            >
              <Plus size={14} /> Add row
            </button>
          )}
        </div>

        <div className="grid gap-4">
          {items.map((item, index) => (
            <div key={item.clientId}>
              <ItemEditor
                draft={item}
                onChange={(next) => patchItem(item.clientId, next)}
                onRemove={items.length > 1 ? () => removeItem(item.clientId) : undefined}
                allowClassChange={flow !== "grading_return"}
                showMarketValue={flow === "collection_buy" || flow === "box_break"}
              />
              {preview[index] && (
                <div className="mt-2 text-right text-xs font-bold text-accent">
                  Allocated basis: {money(preview[index].costCents)}
                </div>
              )}
            </div>
          ))}
        </div>

        {flow === "collection_buy" && toCents(residueCost) > 0 && (
          <div className="mt-6">
            <h2 className="mb-3 text-lg font-extrabold">Bulk residue</h2>
            <ItemEditor draft={bulkResidue} onChange={setBulkResidue} allowClassChange={false} />
            <div className="mt-2 text-right text-xs font-bold text-accent">
              Assigned basis: {money(toCents(residueCost))}
            </div>
          </div>
        )}

        {flow === "collection_buy" && (
          <div className="mt-5 rounded-[14px] p-4 text-sm" style={{ background: "var(--accent-soft)", border: "1px solid var(--border)" }}>
            Allocation check: cards {money(collectionPreview.reduce((sum, row) => sum + row.costCents, 0))}
            {" + "}residue {money(toCents(residueCost))}
            {" = "}<strong>{money(collectionPreview.reduce((sum, row) => sum + row.costCents, 0) + toCents(residueCost))}</strong>
          </div>
        )}

        {error && <div className="mt-5 rounded-[12px] border border-red p-3 text-sm text-red">{error}</div>}
        {success && (
          <div className="mt-5 flex items-center gap-2 rounded-[12px] p-3 text-sm text-green" style={{ background: "rgba(90,161,94,0.12)" }}>
            <CheckCircle2 size={16} /> Acquisition committed with {success.count} new item{success.count === 1 ? "" : "s"}.
          </div>
        )}
        <div className="mt-6 flex justify-end">
          <button type="submit" disabled={submitting || items.length === 0} className="btn btn-blue px-5">
            {submitting ? "Committing…" : "Commit intake"}
          </button>
        </div>
      </form>
    </main>
  );
}
