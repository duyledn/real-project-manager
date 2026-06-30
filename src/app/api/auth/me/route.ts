import { NextResponse } from "next/server";
import { getCurrentUser, toPublicUser } from "@/lib/session";
import { getUserRepository } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ user: null }, { status: 200 });
  return NextResponse.json({ user: toPublicUser(user) });
}

/** Update the signed-in user's editable profile fields (avatar for now). */
export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const patch: Record<string, string> = {};
  if (typeof body.avatar === "string") patch.avatar = body.avatar;
  const updated = await getUserRepository().update(user.id, patch);
  return NextResponse.json(updated ? toPublicUser(updated) : { error: "Failed" });
}
