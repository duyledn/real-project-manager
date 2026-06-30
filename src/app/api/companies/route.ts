import { NextResponse } from "next/server";
import { getCompanyRepository, getUserRepository, getRepository } from "@/lib/storage";
import { getCurrentUser, toPublicUser } from "@/lib/session";
import type { Company, User } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Enriched company shape returned to the client. */
function enrich(c: Company, users: User[], projectCount: number, viewerId: string, isGod: boolean) {
  const byId = (id: string) => users.find((u) => u.id === id);
  const owner = byId(c.ownerId);
  return {
    id: c.id,
    name: c.name,
    ownerId: c.ownerId,
    owner: owner ? toPublicUser(owner) : null,
    members: c.memberIds.map(byId).filter(Boolean).map((u) => toPublicUser(u!)),
    projectCount,
    canManage: isGod || c.ownerId === viewerId,
  };
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const [companies, users, projects] = await Promise.all([
    getCompanyRepository().list(),
    getUserRepository().list(),
    getRepository().all(),
  ]);
  const isGod = user.role === "god";
  const visible = isGod
    ? companies
    : companies.filter((c) => c.ownerId === user.id || c.memberIds.includes(user.id));

  const out = visible.map((c) =>
    enrich(c, users, projects.filter((p) => p.companyId === c.id).length, user.id, isGod),
  );
  return NextResponse.json(out);
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const name = String(body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "Company name is required" }, { status: 400 });

  const created = await getCompanyRepository().create(name, user.id);
  const users = await getUserRepository().list();
  return NextResponse.json(enrich(created, users, 0, user.id, user.role === "god"));
}
