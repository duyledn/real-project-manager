import { NextResponse } from "next/server";
import { getUserRepository, ensureSeeded } from "@/lib/storage";
import { hashSecret, verifySecret } from "@/lib/auth/secret";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Reset a password using the 6-digit recovery PIN. */
export async function POST(request: Request) {
  await ensureSeeded();
  const body = await request.json().catch(() => ({}));
  const username = String(body.username ?? "").trim();
  const pin = String(body.pin ?? "");
  const newPassword = String(body.newPassword ?? "");

  if (newPassword.length < 4) {
    return NextResponse.json({ error: "New password must be at least 4 characters." }, { status: 400 });
  }
  const users = getUserRepository();
  const user = await users.getByUsername(username);
  if (!user || !verifySecret(pin, user.pin)) {
    return NextResponse.json({ error: "Username and PIN do not match." }, { status: 401 });
  }
  await users.update(user.id, { password: hashSecret(newPassword) });
  return NextResponse.json({ ok: true });
}
