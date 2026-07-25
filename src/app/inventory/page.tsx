"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowDownUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  PackageOpen,
  Plus,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import type { InventoryItem, InventoryLedgerEntry } from "@/lib/inventory/types";

type Summary = {
  byClass: Array<{
    class: string;
    skuCount: number;
    quantity: number;
    costValueCents: number;
    marketValueCents: number;
  }>;
  totals: {
    skuCount: number;
    quantity: number;
    costValueCents: number;
    marketValueCents: number;
  };
};

type ListResponse = {
  items: InventoryItem[];
  page: number;
  pageSize: number;
  total: number;
};

const emptySummary: Summary = {
  byClass: [],
  totals: { skuCount: 0, quantity: 0, costValueCents: 0, marketValueCents: 0 },
};

function money(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

export default function InventoryPage() {
  const { t } = useI18n();
  const [summary, setSummary] = useState<Summary>(emptySummary);
  const [data, setData] = useState<ListResponse>({ items: [], page: 1, pageSize: 50, total: 0 });
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ q: "", class: "", game: "", status: "active" });
  const [sort, setSort] = useState({ by: "updated", direction: "desc" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [ledgerByItem, setLedgerByItem] = useState<Record<string, InventoryLedgerEntry[]>>({});

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      setError("");
      const params = new URLSearchParams({
        page: String(page),
        pageSize: "50",
        sortBy: sort.by,
        sortDir: sort.direction,
      });
      Object.entries(filters).forEach(([key, value]) => value && params.set(key, value));
      try {
        const [itemsResponse, summaryResponse] = await Promise.all([
          fetch(`/api/inventory/items?${params}`, { signal: controller.signal }),
          fetch("/api/inventory/summary", { signal: controller.signal }),
        ]);
        const [itemsBody, summaryBody] = await Promise.all([
          itemsResponse.json(),
          summaryResponse.json(),
        ]);
        if (!itemsResponse.ok) throw new Error(itemsBody.error ?? "Could not load inventory");
        if (!summaryResponse.ok) throw new Error(summaryBody.error ?? "Could not load summary");
        setData(itemsBody);
        setSummary(summaryBody);
      } catch (caught) {
        if (!controller.signal.aborted) {
          setError(caught instanceof Error ? caught.message : "Could not load inventory");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 180);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [filters, page, sort]);

  async function toggleLedger(id: string) {
    if (expanded === id) {
      setExpanded(null);
      return;
    }
    setExpanded(id);
    if (ledgerByItem[id]) return;
    const response = await fetch(`/api/inventory/items/${id}`);
    if (!response.ok) return;
    const body = await response.json();
    setLedgerByItem((current) => ({ ...current, [id]: body.ledger }));
  }

  function changeFilter(key: keyof typeof filters, value: string) {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  }

  function changeSort(by: string) {
    setSort((current) => ({
      by,
      direction: current.by === by && current.direction === "asc" ? "desc" : "asc",
    }));
  }

  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));

  return (
    <main className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6">
      <header className="panel mb-6 flex flex-col gap-5 p-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="label-mono mb-2 text-accent">{t("Core inventory ledger")}</div>
          <h1 className="font-display text-4xl font-extrabold">{t("Inventory")}</h1>
          <p className="mt-2 max-w-2xl text-sm text-ink-muted">
            {t("Sealed products, slabs, singles, and bulk with an auditable quantity history.")}
          </p>
        </div>
        <Link href="/inventory/intake" className="btn btn-blue gap-2">
          <Plus size={15} /> {t("New intake")}
        </Link>
      </header>

      <section className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label={t("Inventory summary")}>
        <Metric label={t("SKUs")} value={summary.totals.skuCount.toLocaleString()} />
        <Metric label={t("Units on hand")} value={summary.totals.quantity.toLocaleString()} />
        <Metric label={t("Cost value")} value={money(summary.totals.costValueCents)} />
        <Metric label={t("Catalog market value")} value={money(summary.totals.marketValueCents)} />
      </section>

      <section className="panel overflow-hidden">
        <div className="grid gap-3 border-b border-hair p-4 sm:grid-cols-2 lg:grid-cols-5">
          <input
            value={filters.q}
            onChange={(event) => changeFilter("q", event.target.value)}
            className="field-input lg:col-span-2"
            placeholder={t("Search name, SKU, or certificate")}
            aria-label={t("Search inventory")}
          />
          <select value={filters.class} onChange={(event) => changeFilter("class", event.target.value)} className="field-input" aria-label={t("Filter by class")}>
            <option value="">{t("All classes")}</option>
            <option value="sealed">{t("Sealed")}</option>
            <option value="slab">{t("Slabs")}</option>
            <option value="single">{t("Singles")}</option>
            <option value="bulk">{t("Bulk")}</option>
          </select>
          <select value={filters.game} onChange={(event) => changeFilter("game", event.target.value)} className="field-input" aria-label={t("Filter by game")}>
            <option value="">{t("All games")}</option>
            <option value="pokemon">{t("Pokémon")}</option>
            <option value="mtg">{t("MTG")}</option>
            <option value="other">{t("Other")}</option>
          </select>
          <select value={filters.status} onChange={(event) => changeFilter("status", event.target.value)} className="field-input" aria-label={t("Filter by status")}>
            <option value="">{t("All statuses")}</option>
            <option value="active">{t("Active")}</option>
            <option value="sold_out">{t("Sold out")}</option>
            <option value="archived">{t("Archived")}</option>
          </select>
        </div>

        {error && <div className="border-b border-hair p-4 text-sm text-red">{error}</div>}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-hair">
                <th className="w-10 p-3" />
                <Sortable label={t("SKU")} field="sku" onSort={changeSort} />
                <Sortable label={t("Item")} field="name" onSort={changeSort} />
                <Sortable label={t("Class")} field="class" onSort={changeSort} />
                <Sortable label={t("Game")} field="game" onSort={changeSort} />
                <th className="label-mono p-3 text-left">{t("Set / #")}</th>
                <Sortable label={t("Qty")} field="quantity" onSort={changeSort} />
                <Sortable label={t("Unit cost")} field="cost" onSort={changeSort} />
                <th className="label-mono p-3 text-left">{t("Status")}</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => (
                <ItemRows
                  key={item.id}
                  item={item}
                  open={expanded === item.id}
                  ledger={ledgerByItem[item.id]}
                  onToggle={() => void toggleLedger(item.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
        {!loading && data.items.length === 0 && (
          <div className="p-12 text-center text-ink-muted">
            <PackageOpen size={32} className="mx-auto mb-3" />
            {t("No inventory matches these filters.")}
          </div>
        )}
        {loading && <div className="p-8 text-center text-sm text-ink-muted">{t("Loading inventory…")}</div>}
        <footer className="flex items-center justify-between border-t border-hair px-4 py-3 text-xs text-ink-muted">
          <span>{t("{count} items", { count: data.total })}</span>
          <div className="flex items-center gap-2">
            <button type="button" className="icon-btn" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} aria-label={t("Previous page")}>
              <ChevronLeft size={15} />
            </button>
            <span className="font-mono">{page} / {totalPages}</span>
            <button type="button" className="icon-btn" disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)} aria-label={t("Next page")}>
              <ChevronRight size={15} />
            </button>
          </div>
        </footer>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="panel p-4">
      <div className="label-mono mb-2">{label}</div>
      <div className="font-mono text-2xl font-extrabold">{value}</div>
    </div>
  );
}

function Sortable({ label, field, onSort }: { label: string; field: string; onSort: (field: string) => void }) {
  return (
    <th className="p-3 text-left">
      <button type="button" onClick={() => onSort(field)} className="label-mono inline-flex items-center gap-1">
        {label} <ArrowDownUp size={11} />
      </button>
    </th>
  );
}

function ItemRows({
  item,
  open,
  ledger,
  onToggle,
}: {
  item: InventoryItem;
  open: boolean;
  ledger?: InventoryLedgerEntry[];
  onToggle: () => void;
}) {
  return (
    <>
      <tr className="border-b border-hair transition-colors hover:bg-[var(--glass-2)]">
        <td className="p-2 text-center">
          <button type="button" onClick={onToggle} className="icon-btn" aria-label="Toggle ledger">
            <ChevronDown size={14} className={`transition-transform ${open ? "" : "-rotate-90"}`} />
          </button>
        </td>
        <td className="p-3 font-mono text-xs text-ink-muted">{item.sku}</td>
        <td className="p-3">
          <Link href={`/inventory/items/${item.id}`} className="font-bold text-accent hover:underline">{item.name}</Link>
          <div className="mt-0.5 text-xs text-ink-muted">{item.finish}{item.condition ? ` · ${item.condition}` : ""}</div>
        </td>
        <td className="p-3 capitalize">{item.class}</td>
        <td className="p-3 uppercase">{item.game}</td>
        <td className="p-3">{item.setCode || "—"} {item.collectorNumber ? `#${item.collectorNumber}` : ""}</td>
        <td className="p-3 font-mono font-bold">{item.quantityOnHand}</td>
        <td className="p-3 font-mono">{money(item.unitCostCents)}</td>
        <td className="p-3"><span className="pill capitalize">{item.status.replace("_", " ")}</span></td>
      </tr>
      {open && (
        <tr className="border-b border-hair" style={{ background: "var(--glass-2)" }}>
          <td />
          <td colSpan={8} className="p-4">
            {!ledger ? (
              <div className="text-xs text-ink-muted">Loading ledger…</div>
            ) : (
              <div className="grid gap-2">
                {ledger.map((entry) => (
                  <div key={entry.id} className="grid grid-cols-[110px_130px_80px_1fr] gap-3 rounded-[10px] px-3 py-2 text-xs" style={{ background: "var(--surface-solid)" }}>
                    <span className="font-mono">{new Date(entry.createdAt).toLocaleDateString()}</span>
                    <span className="font-bold capitalize">{entry.type.replace("_", " ")}</span>
                    <span className={`font-mono font-bold ${entry.quantityDelta > 0 ? "text-green" : "text-red"}`}>
                      {entry.quantityDelta > 0 ? "+" : ""}{entry.quantityDelta}
                    </span>
                    <span className="text-ink-muted">{entry.note || "—"}</span>
                  </div>
                ))}
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}
