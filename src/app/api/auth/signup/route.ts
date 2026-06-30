import { NextResponse } from "next/server";
import { getUserRepository, ensureSeeded } from "@/lib/storage";
import { setSession, toPublicUser } from "@/lib/session";
import { hashSecret, normalizeTag } from "@/lib/auth/secret";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  await ensureSeeded();
  const body = await request.json().catch(() => ({}));
  const tag = normalizeTag(String(body.tag ?? ""));
  const username = String(body.username ?? "").trim();
  const password = String(body.password ?? "");
  const pin = String(body.pin ?? "");

  if (!/^[a-z0-9_]{2,20}$/.test(tag)) {
    return NextResponse.json({ error: "Tag must be 2–20 letters, numbers, or underscores." }, { status: 400 });
  }
  if (username.length < 3) {
    return NextResponse.json({ error: "Username must be at least 3 characters." }, { status: 400 });
  }
  if (password.length < 4) {
    return NextResponse.json({ error: "Password must be at least 4 characters." }, { status: 400 });
  }
  if (!/^\d{6}$/.test(pin)) {
    return NextResponse.json({ error: "Recovery PIN must be exactly 6 digits." }, { status: 400 });
  }

  const users = getUserRepository();
  if (await users.getByTag(tag)) {
    return NextResponse.json({ error: `@${tag} is already taken.` }, { status: 409 });
  }
  if (await users.getByUsername(username)) {
    return NextResponse.json({ error: "That username is already in use." }, { status: 409 });
  }

  const user = await users.create({
    tag,
    username,
    password: hashSecret(password),
    pin: hashSecret(pin),
    role: "user",
    avatar: "",
  });
  await setSession(user.id);
  return NextResponse.json(toPublicUser(user));
}
