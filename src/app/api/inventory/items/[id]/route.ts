import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getItem, patchItem } from "@/lib/inventory/repo";
import { itemPatchSchema } from "@/lib/inventory/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { id } = await params;
  try {
    const result = await getItem(user.id, id);
    return result
      ? NextResponse.json(result)
      : NextResponse.json({ error: "Inventory item not found" }, { status: 404 });
  } catch (error) {
    console.error("Inventory item lookup failed", error);
    return NextResponse.json({ error: "Could not load inventory item" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { id } = await params;
  const parsed = itemPatchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  try {
    const item = await patchItem(user.id, id, parsed.data);
    return item
      ? NextResponse.json(item)
      : NextResponse.json({ error: "Inventory item not found" }, { status: 404 });
  } catch (error) {
    console.error("Inventory item update failed", error);
    return NextResponse.json({ error: "Could not update inventory item" }, { status: 400 });
  }
}

