import { cookies } from "next/headers";
import type { User, PublicUser } from "./types";
import { getUserRepository, ensureSeeded } from "./storage";

const COOKIE = "rpm_session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

/** Strip secrets before sending a user to the client. */
export function toPublicUser(u: User): PublicUser {
  return { id: u.id, tag: u.tag, username: u.username, role: u.role, avatar: u.avatar };
}

export async function getSessionUserId(): Promise<string | null> {
  const store = await cookies();
  return store.get(COOKIE)?.value ?? null;
}

/** The full current user (or null). Triggers one-time seeding of @god. */
export async function getCurrentUser(): Promise<User | null> {
  await ensureSeeded();
  const id = await getSessionUserId();
  if (!id) return null;
  return (await getUserRepository().getById(id)) ?? null;
}

export async function setSession(userId: string): Promise<void> {
  const store = await cookies();
  store.set(COOKIE, userId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE);
}
