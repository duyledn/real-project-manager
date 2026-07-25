import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/session";
import { createItem, listItems } from "@/lib/inventory/repo";
import {
  inventoryClasses,
  inventoryConditions,
  inventoryGames,
  inventoryStatuses,
  itemCreateSchema,
} from "@/lib/inventory/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
  class: z.enum(inventoryClasses).optional(),
  game: z.enum(inventoryGames).optional(),
  set: z.string().trim().max(80).optional(),
  condition: z.enum(inventoryConditions).optional(),
  status: z.enum(inventoryStatuses).optional(),
  q: z.string().trim().max(200).optional(),
  sortBy: z.enum(["name", "sku", "class", "game", "quantity", "cost", "updated"]).optional(),
  sortDir: z.enum(["asc", "desc"]).optional(),
});

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const url = new URL(request.url);
  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid inventory query", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  try {
    return NextResponse.json(await listItems(user.id, parsed.data));
  } catch (error) {
    console.error("Inventory list failed", error);
    return NextResponse.json({ error: "Inventory storage is unavailable" }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const body = await request.json().catch(() => null);
  const parsed = itemCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  try {
    return NextResponse.json(await createItem(user.id, parsed.data), { status: 201 });
  } catch (error) {
    console.error("Inventory item creation failed", error);
    return NextResponse.json({ error: "Could not create inventory item" }, { status: 500 });
  }
}

