import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { inventorySummary } from "@/lib/inventory/repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  try {
    return NextResponse.json(await inventorySummary(user.id));
  } catch (error) {
    console.error("Inventory summary failed", error);
    return NextResponse.json({ error: "Could not load inventory summary" }, { status: 503 });
  }
}
