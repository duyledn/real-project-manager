import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { createAcquisition } from "@/lib/inventory/repo";
import { acquisitionInputSchema } from "@/lib/inventory/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const parsed = acquisitionInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  try {
    return NextResponse.json(await createAcquisition(user.id, parsed.data), { status: 201 });
  } catch (error) {
    console.error("Inventory acquisition failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not commit acquisition" },
      { status: 400 },
    );
  }
}

