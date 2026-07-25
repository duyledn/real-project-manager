"use client";

import { useEffect, useId, useState } from "react";
import { Search } from "lucide-react";
import type { CatalogCard } from "@/lib/inventory/types";

type CatalogCardSearchProps = {
  game: "pokemon" | "mtg" | "other";
  onSelect: (card: CatalogCard) => void;
};

export function CatalogCardSearch({ game, onSelect }: CatalogCardSearchProps) {
  const inputId = useId();
  const [query, setQuery] = useState("");
  const [cards, setCards] = useState<CatalogCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setCards([]);
    setError("");
    if (game === "other" || query.trim().length < 3) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/inventory/catalog/search?game=${game}&q=${encodeURIComponent(query.trim())}`,
          { signal: controller.signal },
        );
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? "Catalog search failed");
        setCards(body.cards);
      } catch (caught) {
        if (!controller.signal.aborted) {
          setError(caught instanceof Error ? caught.message : "Catalog search failed");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 350);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [game, query]);

  if (game === "other") return null;

  return (
    <div className="relative">
      <label className="label-mono mb-1.5 block" htmlFor={inputId}>
        Catalog search
      </label>
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
        <input
          id={inputId}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="field-input pl-9"
          placeholder={game === "pokemon" ? "Charizard 151" : "Lightning Bolt"}
          autoComplete="off"
        />
      </div>
      {loading && <div className="mt-2 text-xs text-ink-muted">Searching catalog…</div>}
      {error && <div className="mt-2 text-xs text-red">{error}</div>}
      {cards.length > 0 && (
        <div
          className="absolute z-40 mt-2 max-h-72 w-full overflow-auto rounded-[14px] p-1.5"
          style={{ background: "var(--surface-solid)", border: "1px solid var(--border)", boxShadow: "var(--shadow)" }}
        >
          {cards.map((card) => (
            <button
              key={card.id}
              type="button"
              onClick={() => {
                onSelect(card);
                setQuery(`${card.name} · ${card.setCode} ${card.collectorNumber}`);
                setCards([]);
              }}
              className="flex w-full items-center gap-3 rounded-[10px] p-2 text-left transition-colors hover:bg-[var(--accent-soft)]"
            >
              {card.imageUrl ? (
                // Arbitrary catalog hosts cannot be declared in Next image config.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={card.imageUrl} alt="" className="h-14 w-10 rounded object-cover" />
              ) : (
                <div className="h-14 w-10 rounded bg-[var(--glass-2)]" />
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold">{card.name}</span>
                <span className="block truncate text-xs text-ink-muted">
                  {card.setName} · {card.setCode} #{card.collectorNumber}
                </span>
              </span>
              <span className="font-mono text-xs font-bold text-accent">
                {card.marketPriceCents === null
                  ? "—"
                  : `$${(card.marketPriceCents / 100).toFixed(2)}`}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
