import { NextResponse } from "next/server";
import { getRepository, getCompanyRepository } from "@/lib/storage";
import { getCurrentUser } from "@/lib/session";
import { canManageCompany } from "@/lib/access";
import type { Project } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toInput(p: Project) {
  const { id: _i, createdAt: _c, updatedAt: _u, ...input } = p;
  return input;
}

/** Assign a company member to a project (owner/god only). */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const project = await getRepository().get(id);
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  const company = await getCompanyRepository().getById(project.companyId);
  if (!company || !canManageCompany(user, company)) {
    return NextResponse.json({ error: "Only the company owner can assign people" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const userId = String(body.userId ?? "");
  if (!company.memberIds.includes(userId)) {
    return NextResponse.json({ error: "Add them to the company first" }, { status: 400 });
  }
  if (project.memberIds.includes(userId)) {
    return NextResponse.json({ ok: true });
  }
  await getRepository().update(id, { ...toInput(project), memberIds: [...project.memberIds, userId] });
  return NextResponse.json({ ok: true });
}

/** Unassign a member from a project (owner/god only). */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const project = await getRepository().get(id);
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  const company = await getCompanyRepository().getById(project.companyId);
  if (!company || !canManageCompany(user, company)) {
    return NextResponse.json({ error: "Only the company owner can unassign people" }, { status: 403 });
  }

  const userId = new URL(request.url).searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  await getRepository().update(id, {
    ...toInput(project),
    memberIds: project.memberIds.filter((m) => m !== userId),
  });
  return NextResponse.json({ ok: true });
}
