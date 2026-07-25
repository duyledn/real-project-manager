"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import type { InventoryItem, InventoryLedgerEntry } from "@/lib/inventory/types";

function money(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function InventoryItemPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [item, setItem] = useState<InventoryItem | null>(null);
  const [ledger, setLedger] = useState<InventoryLedgerEntry[]>([]);
  const [notes, setNotes] = useState("");
  const [unitCost, setUnitCost] = useState("0");
  const [adjustment, setAdjustment] = useState("0");
  const [adjustmentNote, setAdjustmentNote] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    const response = await fetch(`/api/inventory/items/${id}`);
    const body = await response.json();
    if (!response.ok) throw new Error(body.error ?? "Could not load item");
    setItem(body.item);
    setLedger(body.ledger);
    setNotes(body.item.notes);
    setUnitCost((body.item.unitCostCents / 100).toFixed(2));
  }

  useEffect(() => {
    let active = true;
    fetch(`/api/inventory/items/${id}`)
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? "Could not load item");
        if (!active) return;
        setItem(body.item);
        setLedger(body.ledger);
        setNotes(body.item.notes);
        setUnitCost((body.item.unitCostCents / 100).toFixed(2));
      })
      .catch((caught) => {
        if (active) setError(caught instanceof Error ? caught.message : "Could not load item");
      });
    return () => {
      active = false;
    };
  }, [id]);

  async function saveDetails(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    const response = await fetch(`/api/inventory/items/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        notes,
        unitCostCents: Math.max(0, Math.round((Number(unitCost) || 0) * 100)),
      }),
    });
    const body = await response.json();
    if (!response.ok) {
      setError(body.error ?? "Could not save item");
      return;
    }
    setItem(body);
    setMessage("Item details saved.");
  }

  async function adjust(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    const response = await fetch(`/api/inventory/items/${id}/adjust`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        quantityDelta: Math.trunc(Number(adjustment)),
        note: adjustmentNote,
      }),
    });
    const body = await response.json();
    if (!response.ok) {
      setError(body.error ?? "Could not adjust quantity");
      return;
    }
    await load();
    setAdjustment("0");
    setAdjustmentNote("");
    setMessage("Adjustment appended to the ledger.");
  }

  if (!item) {
    return (
      <main className="mx-auto max-w-5xl px-5 py-8">
        <Link href="/inventory" className="btn mb-5 gap-2"><ArrowLeft size={14} /> Back to inventory</Link>
        <div className="panel p-8 text-sm text-ink-muted">{error || "Loading item…"}</div>
      </main>
    );
  }

  const fields = [
    ["SKU", item.sku],
    ["Class", item.class],
    ["Game", item.game],
    ["Name", item.name],
    ["Set code", item.setCode || "—"],
    ["Collector number", item.collectorNumber || "—"],
    ["Finish", item.finish || "—"],
    ["Condition", item.condition || "—"],
    ["Language", item.language],
    ["Quantity on hand", String(item.quantityOnHand)],
    ["Status", item.status.replace("_", " ")],
    ["Grader", item.grader || "—"],
    ["Certificate", item.certNumber || "—"],
    ["Grade", item.grade || "—"],
    ["UPC", item.upc || "—"],
    ["Product type", item.productType || "—"],
    ["Lot type", item.lotType || "—"],
    ["Estimated count", item.estimatedCount === null ? "—" : String(item.estimatedCount)],
    ["Created", new Date(item.createdAt).toLocaleString()],
    ["Updated", new Date(item.updatedAt).toLocaleString()],
  ];

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <Link href="/inventory" className="btn mb-5 gap-2"><ArrowLeft size={14} /> Back to inventory</Link>
      <header className="panel mb-6 p-6">
        <div className="label-mono mb-2 text-accent">{item.sku}</div>
        <h1 className="font-display text-3xl font-extrabold">{item.name}</h1>
        <p className="mt-2 text-sm text-ink-muted">
          {item.class.toUpperCase()} · {item.game.toUpperCase()} · {item.quantityOnHand} on hand · {money(item.unitCostCents)} basis
        </p>
      </header>

      {error && <div className="mb-5 rounded-[12px] border border-red p-3 text-sm text-red">{error}</div>}
      {message && <div className="mb-5 rounded-[12px] p-3 text-sm text-green" style={{ background: "rgba(90,161,94,0.12)" }}>{message}</div>}

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <section className="panel p-5">
          <h2 className="mb-4 text-lg font-extrabold">Item fields</h2>
          <dl className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
            {fields.map(([label, value]) => (
              <div key={label}>
                <dt className="label-mono mb-1">{label}</dt>
                <dd className={`text-sm ${label === "SKU" ? "font-mono" : ""}`}>{value}</dd>
              </div>
            ))}
          </dl>
          {item.catalogRef && (
            <div className="mt-5 rounded-[12px] p-3 text-xs" style={{ background: "var(--glass-2)" }}>
              Catalog: <span className="font-mono">{item.catalogRef.provider}:{item.catalogRef.id}</span>
              {" · "}market {item.catalogRef.marketPriceCents === null ? "—" : money(item.catalogRef.marketPriceCents)}
            </div>
          )}
        </section>

        <div className="grid content-start gap-6">
          <form onSubmit={saveDetails} className="panel p-5">
            <h2 className="mb-4 text-lg font-extrabold">Editable details</h2>
            <label className="mb-4 block">
              <span className="label-mono mb-1.5 block">Unit cost basis ($)</span>
              <input type="number" min="0" step="0.01" value={unitCost} onChange={(event) => setUnitCost(event.target.value)} className="field-input" />
            </label>
            <label className="mb-4 block">
              <span className="label-mono mb-1.5 block">Notes</span>
              <textarea value={notes} onChange={(event) => setNotes(event.target.value)} className="field-input min-h-28" />
            </label>
            <button type="submit" className="btn btn-blue gap-2"><Save size={14} /> Save details</button>
          </form>

          <form onSubmit={adjust} className="panel p-5">
            <h2 className="mb-2 text-lg font-extrabold">Manual adjustment</h2>
            <p className="mb-4 text-xs text-ink-muted">Use a signed quantity. A reason is required and the result cannot be negative.</p>
            <label className="mb-3 block">
              <span className="label-mono mb-1.5 block">Quantity delta</span>
              <input type="number" step="1" value={adjustment} onChange={(event) => setAdjustment(event.target.value)} className="field-input" required />
            </label>
            <label className="mb-4 block">
              <span className="label-mono mb-1.5 block">Reason</span>
              <input value={adjustmentNote} onChange={(event) => setAdjustmentNote(event.target.value)} className="field-input" required />
            </label>
            <button type="submit" className="btn">Append adjustment</button>
          </form>
        </div>
      </div>

      <section className="panel mt-6 overflow-hidden">
        <div className="border-b border-hair p-5">
          <h2 className="text-lg font-extrabold">Ledger history</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-hair">
                {["Date", "Type", "Quantity", "Unit cost", "Acquisition", "Note"].map((label) => (
                  <th key={label} className="label-mono p-3 text-left">{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ledger.map((entry) => (
                <tr key={entry.id} className="border-b border-hair last:border-0">
                  <td className="p-3 font-mono text-xs">{new Date(entry.createdAt).toLocaleString()}</td>
                  <td className="p-3 capitalize">{entry.type.replace("_", " ")}</td>
                  <td className={`p-3 font-mono font-bold ${entry.quantityDelta > 0 ? "text-green" : "text-red"}`}>{entry.quantityDelta > 0 ? "+" : ""}{entry.quantityDelta}</td>
                  <td className="p-3 font-mono">{money(entry.unitCostCents)}</td>
                  <td className="p-3 font-mono text-xs">{entry.acquisitionId?.slice(0, 8) ?? "—"}</td>
                  <td className="p-3 text-ink-muted">{entry.note || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
