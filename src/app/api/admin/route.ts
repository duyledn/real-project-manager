import { NextResponse } from "next/server";
import { getCompanyRepository, getUserRepository, getRepository } from "@/lib/storage";
import { getCurrentUser, toPublicUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** God-only workspace overview: every company, its people, and every project
 *  with each person's access level. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (user.role !== "god") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [companies, users, projects] = await Promise.all([
    getCompanyRepository().list(),
    getUserRepository().list(),
    getRepository().all(),
  ]);
  const byId = (id: string) => users.find((u) => u.id === id);

  const overview = companies.map((c) => {
    const owner = byId(c.ownerId);
    const companyProjects = projects.filter((p) => p.companyId === c.id);
    return {
      id: c.id,
      name: c.name,
      owner: owner ? toPublicUser(owner) : null,
      members: c.memberIds.map(byId).filter(Boolean).map((u) => toPublicUser(u!)),
      memberCount: c.memberIds.length,
      projects: companyProjects.map((p) => ({
        id: p.id,
        name: p.name,
        // Access list: owner + each assigned member, with their level.
        access: [
          ...(owner ? [{ user: toPublicUser(owner), level: "Owner" as const }] : []),
          ...p.memberIds
            .map(byId)
            .filter(Boolean)
            .map((u) => ({ user: toPublicUser(u!), level: "Member" as const })),
        ],
      })),
    };
  });

  return NextResponse.json({
    totalUsers: users.length,
    totalCompanies: companies.length,
    totalProjects: projects.length,
    companies: overview,
  });
}
