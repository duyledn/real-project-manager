import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/session";
import { catalogProvider } from "@/lib/inventory/catalog";
import { getCatalogCache } from "@/lib/inventory/repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const querySchema = z.object({
  game: z.enum(["pokemon", "mtg"]),
  q: z.string().trim().min(3).max(120),
});

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const parsed = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Enter at least 3 characters and choose Pokémon or MTG" },
      { status: 400 },
    );
  }
  const provider = parsed.data.game === "pokemon" ? "pokemontcg" : "scryfall";
  const key = `search:${parsed.data.game}:${parsed.data.q.toLowerCase()}`;
  try {
    const wasCached = Boolean(await getCatalogCache(provider, key));
    const cards = await catalogProvider.searchCards(parsed.data.game, parsed.data.q);
    return NextResponse.json({ cards, cacheStatus: wasCached ? "hit" : "miss" });
  } catch (error) {
    console.error("Catalog search failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Catalog search failed" },
      { status: 502 },
    );
  }
}

