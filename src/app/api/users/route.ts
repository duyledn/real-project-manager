import { NextResponse } from "next/server";
import { getUserRepository } from "@/lib/storage";
import { getCurrentUser, toPublicUser } from "@/lib/session";
import { normalizeTag } from "@/lib/auth/secret";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Look up a single user by ?tag=, or (god only) list everyone. */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const tag = new URL(request.url).searchParams.get("tag");
  if (tag) {
    const found = await getUserRepository().getByTag(normalizeTag(tag));
    if (!found) return NextResponse.json({ error: "No user with that @tag" }, { status: 404 });
    return NextResponse.json(toPublicUser(found));
  }

  if (user.role !== "god") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const all = await getUserRepository().list();
  return NextResponse.json(all.map(toPublicUser));
}
