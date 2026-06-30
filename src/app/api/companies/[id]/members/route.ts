import { NextResponse } from "next/server";
import { getCompanyRepository, getUserRepository, getRepository } from "@/lib/storage";
import { getCurrentUser, toPublicUser } from "@/lib/session";
import { canManageCompany } from "@/lib/access";
import { normalizeTag } from "@/lib/auth/secret";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Add a member to a company by their @tag. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const company = await getCompanyRepository().getById(id);
  if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });
  if (!canManageCompany(user, company)) {
    return NextResponse.json({ error: "Only the company owner can add members" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const tag = normalizeTag(String(body.tag ?? ""));
  if (!tag) return NextResponse.json({ error: "Enter a @tag" }, { status: 400 });

  const target = await getUserRepository().getByTag(tag);
  if (!target) {
    return NextResponse.json({ error: `No user found with @${tag}` }, { status: 404 });
  }
  if (target.id === company.ownerId) {
    return NextResponse.json({ error: "That user already owns this company" }, { status: 409 });
  }
  if (company.memberIds.includes(target.id)) {
    return NextResponse.json({ error: `@${tag} is already a member` }, { status: 409 });
  }

  await getCompanyRepository().update(id, { memberIds: [...company.memberIds, target.id] });
  return NextResponse.json({ ok: true, member: toPublicUser(target) });
}

/** Remove a member (and strip them from this company's project assignments). */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const company = await getCompanyRepository().getById(id);
  if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });
  if (!canManageCompany(user, company)) {
    return NextResponse.json({ error: "Only the company owner can remove members" }, { status: 403 });
  }

  const userId = new URL(request.url).searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });

  await getCompanyRepository().update(id, { memberIds: company.memberIds.filter((m) => m !== userId) });

  // Also revoke their access to every project in this company.
  const repo = getRepository();
  const projects = await repo.all();
  for (const p of projects) {
    if (p.companyId === id && p.memberIds.includes(userId)) {
      const { id: _i, createdAt: _c, updatedAt: _u, ...input } = p;
      await repo.update(p.id, { ...input, memberIds: p.memberIds.filter((m) => m !== userId) });
    }
  }
  return NextResponse.json({ ok: true });
}
