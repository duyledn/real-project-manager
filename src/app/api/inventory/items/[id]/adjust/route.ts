import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { adjustItem } from "@/lib/inventory/repo";
import { adjustItemSchema } from "@/lib/inventory/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { id } = await params;
  const parsed = adjustItemSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  try {
    const item = await adjustItem(
      user.id,
      id,
      parsed.data.quantityDelta,
      parsed.data.note,
    );
    return item
      ? NextResponse.json(item)
      : NextResponse.json({ error: "Inventory item not found" }, { status: 404 });
  } catch (error) {
    console.error("Inventory adjustment failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not adjust inventory" },
      { status: 400 },
    );
  }
}

