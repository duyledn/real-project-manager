import { NextResponse } from "next/server";
import { getUserRepository, ensureSeeded } from "@/lib/storage";
import { setSession, toPublicUser } from "@/lib/session";
import { verifySecret } from "@/lib/auth/secret";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  await ensureSeeded();
  const { username, password } = await request.json().catch(() => ({}));
  if (!username || !password) {
    return NextResponse.json({ error: "Username and password are required" }, { status: 400 });
  }
  const user = await getUserRepository().getByUsername(String(username).trim());
  if (!user || !verifySecret(String(password), user.password)) {
    return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
  }
  await setSession(user.id);
  return NextResponse.json(toPublicUser(user));
}
