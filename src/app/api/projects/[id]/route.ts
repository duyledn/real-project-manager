import { NextResponse } from "next/server";
import { getRepository, getCompanyRepository } from "@/lib/storage";
import { getCurrentUser } from "@/lib/session";
import { canViewProject, canEditProject, canDeleteProject } from "@/lib/access";
import { projectInputSchema } from "@/lib/defaults";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const project = await getRepository().get(id);
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  const company = await getCompanyRepository().getById(project.companyId);
  if (!canViewProject(user, project, company)) {
    return NextResponse.json({ error: "You don't have access to this project" }, { status: 403 });
  }
  return NextResponse.json(project);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const existing = await getRepository().get(id);
  if (!existing) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  const company = await getCompanyRepository().getById(existing.companyId);
  if (!canEditProject(user, existing, company)) {
    return NextResponse.json({ error: "You can't edit this project" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = projectInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  // Ownership fields can't be reassigned through the autosave PUT; preserve the
  // server's source of truth for companyId + memberIds.
  const updated = await getRepository().update(id, {
    ...parsed.data,
    companyId: existing.companyId,
    memberIds: existing.memberIds,
  });
  if (!updated) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const project = await getRepository().get(id);
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  const company = await getCompanyRepository().getById(project.companyId);
  if (!canDeleteProject(user, project, company)) {
    return NextResponse.json({ error: "Only the company owner can delete this project" }, { status: 403 });
  }

  await getRepository().remove(id);
  return NextResponse.json({ ok: true });
}
