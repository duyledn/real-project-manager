import { NextResponse } from "next/server";
import { getRepository, getCompanyRepository } from "@/lib/storage";
import { getCurrentUser } from "@/lib/session";
import { canViewProject, canDeleteProject, canManageCompany } from "@/lib/access";
import { projectInputSchema } from "@/lib/defaults";
import { totalRenovationCost, analyzeProject } from "@/lib/calculations";
import type { ProjectSummary } from "@/lib/types";

// File storage requires the Node.js runtime (not Edge).
export const runtime = "nodejs";
// Never cache — project data changes constantly.
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const [projects, companies] = await Promise.all([
    getRepository().all(),
    getCompanyRepository().list(),
  ]);
  const companyById = new Map(companies.map((c) => [c.id, c]));

  const summaries: ProjectSummary[] = projects
    .filter((p) => canViewProject(user, p, companyById.get(p.companyId) ?? null))
    .map((p) => {
      const analysis = analyzeProject(p);
      return {
        id: p.id,
        name: p.name,
        updatedAt: p.updatedAt,
        currency: p.currency ?? "USD",
        holdYears: p.holdYears,
        totalRenovationCost: totalRenovationCost(p),
        netProfit: analysis.returns.totalProfit,
        companyId: p.companyId,
        memberIds: p.memberIds,
        memberCount: new Set(p.memberIds).size + 1,
        canDelete: canDeleteProject(user, p, companyById.get(p.companyId) ?? null),
      };
    })
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));

  return NextResponse.json(summaries);
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

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

  // A project must belong to a company the user owns (or god). Members can't
  // create projects.
  const company = await getCompanyRepository().getById(parsed.data.companyId);
  if (!company || !canManageCompany(user, company)) {
    return NextResponse.json(
      { error: "Pick a company you own to create a project in." },
      { status: 403 },
    );
  }

  const project = await getRepository().create({ ...parsed.data, memberIds: [] });
  return NextResponse.json(project, { status: 201 });
}
