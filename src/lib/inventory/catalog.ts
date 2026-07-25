import { getCatalogCache, setCatalogCache } from "./repo";
import type { CatalogCard, InventoryGame } from "./types";

export interface CatalogProvider {
  searchCards(game: InventoryGame, query: string): Promise<CatalogCard[]>;
  getCard(game: InventoryGame, providerId: string): Promise<CatalogCard>;
}

function dollarsToCents(value: unknown): number | null {
  const amount = typeof value === "string" ? Number(value) : value;
  return typeof amount === "number" && Number.isFinite(amount)
    ? Math.round(amount * 100)
    : null;
}

function firstPrice(values: unknown[]): number | null {
  for (const value of values) {
    const cents = dollarsToCents(value);
    if (cents !== null) return cents;
  }
  return null;
}

function pokemonCard(raw: Record<string, any>): CatalogCard {
  const prices = raw.tcgplayer?.prices ?? {};
  const marketPriceCents = firstPrice([
    prices.holofoil?.market,
    prices.reverseHolofoil?.market,
    prices.normal?.market,
    raw.cardmarket?.prices?.averageSellPrice,
    raw.cardmarket?.prices?.trendPrice,
  ]);
  return {
    provider: "pokemontcg",
    id: String(raw.id),
    game: "pokemon",
    name: String(raw.name ?? ""),
    setCode: String(raw.set?.ptcgoCode ?? raw.set?.id ?? ""),
    setName: String(raw.set?.name ?? ""),
    collectorNumber: String(raw.number ?? ""),
    finishes: [
      prices.normal && "normal",
      prices.holofoil && "holo",
      prices.reverseHolofoil && "reverse",
    ].filter(Boolean) as string[],
    imageUrl: String(raw.images?.small ?? raw.images?.large ?? ""),
    marketPriceCents,
    prices: {
      normal: dollarsToCents(prices.normal?.market),
      holo: dollarsToCents(prices.holofoil?.market),
      reverse: dollarsToCents(prices.reverseHolofoil?.market),
      cardmarket: dollarsToCents(raw.cardmarket?.prices?.averageSellPrice),
    },
  };
}

function scryfallCard(raw: Record<string, any>): CatalogCard {
  const faces = Array.isArray(raw.card_faces) ? raw.card_faces : [];
  const imageUrl = raw.image_uris?.normal ?? faces[0]?.image_uris?.normal ?? "";
  const finishes = Array.isArray(raw.finishes) ? raw.finishes : ["normal"];
  return {
    provider: "scryfall",
    id: String(raw.id),
    game: "mtg",
    name: String(raw.name ?? ""),
    setCode: String(raw.set ?? ""),
    setName: String(raw.set_name ?? ""),
    collectorNumber: String(raw.collector_number ?? ""),
    finishes,
    imageUrl: String(imageUrl),
    marketPriceCents: firstPrice([raw.prices?.usd, raw.prices?.usd_foil, raw.prices?.usd_etched]),
    prices: {
      normal: dollarsToCents(raw.prices?.usd),
      foil: dollarsToCents(raw.prices?.usd_foil),
      etched: dollarsToCents(raw.prices?.usd_etched),
    },
  };
}

async function pokemonFetch(path: string): Promise<any> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (process.env.POKEMONTCG_API_KEY) {
    headers["X-Api-Key"] = process.env.POKEMONTCG_API_KEY;
  }
  const response = await fetch(`https://api.pokemontcg.io/v2${path}`, {
    headers,
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Pokémon catalog returned ${response.status}`);
  return response.json();
}

let scryfallQueue: Promise<void> = Promise.resolve();
let lastScryfallRequest = 0;

async function scryfallFetch(path: string): Promise<any> {
  let release!: () => void;
  const previous = scryfallQueue;
  scryfallQueue = new Promise<void>((resolve) => {
    release = resolve;
  });
  await previous;
  try {
    const wait = Math.max(0, 75 - (Date.now() - lastScryfallRequest));
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
    const response = await fetch(`https://api.scryfall.com${path}`, {
      headers: {
        Accept: "application/json",
        "User-Agent": process.env.CATALOG_USER_AGENT ?? "RealProjectManager/1.0 inventory-catalog",
      },
      cache: "no-store",
    });
    lastScryfallRequest = Date.now();
    if (!response.ok) throw new Error(`Scryfall catalog returned ${response.status}`);
    return response.json();
  } finally {
    release();
  }
}

class LiveCatalogProvider implements CatalogProvider {
  async searchCards(game: InventoryGame, query: string): Promise<CatalogCard[]> {
    if (game !== "pokemon" && game !== "mtg") {
      throw new Error("Catalog search supports Pokémon and MTG");
    }
    const normalized = query.trim().toLowerCase();
    const provider = game === "pokemon" ? "pokemontcg" : "scryfall";
    const key = `search:${game}:${normalized}`;
    const cached = await getCatalogCache(provider, key);
    if (Array.isArray(cached)) return cached as CatalogCard[];

    let cards: CatalogCard[];
    if (game === "pokemon") {
      const escaped = query.trim().replaceAll('"', '\\"');
      const result = await pokemonFetch(
        `/cards?q=${encodeURIComponent(`name:"${escaped}*"`)}&pageSize=20&orderBy=name`,
      );
      cards = (Array.isArray(result.data) ? result.data : []).map(pokemonCard);
    } else {
      const result = await scryfallFetch(
        `/cards/search?q=${encodeURIComponent(query.trim())}&unique=prints&order=name`,
      );
      cards = (Array.isArray(result.data) ? result.data : []).slice(0, 20).map(scryfallCard);
    }
    await setCatalogCache(provider, key, cards);
    await Promise.all(cards.map((card) => setCatalogCache(provider, `card:${card.id}`, card)));
    return cards;
  }

  async getCard(game: InventoryGame, providerId: string): Promise<CatalogCard> {
    if (game !== "pokemon" && game !== "mtg") {
      throw new Error("Catalog lookup supports Pokémon and MTG");
    }
    const provider = game === "pokemon" ? "pokemontcg" : "scryfall";
    const key = `card:${providerId}`;
    const cached = await getCatalogCache(provider, key);
    if (cached) return cached as CatalogCard;
    const raw =
      game === "pokemon"
        ? (await pokemonFetch(`/cards/${encodeURIComponent(providerId)}`)).data
        : await scryfallFetch(`/cards/${encodeURIComponent(providerId)}`);
    const card = game === "pokemon" ? pokemonCard(raw) : scryfallCard(raw);
    await setCatalogCache(provider, key, card);
    return card;
  }
}

export const catalogProvider: CatalogProvider = new LiveCatalogProvider();
