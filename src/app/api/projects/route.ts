import { NextResponse } from "next/server";
import { getRepository } from "@/lib/storage";
import { projectInputSchema } from "@/lib/defaults";

// File storage requires the Node.js runtime (not Edge).
export const runtime = "nodejs";
// Never cache — project data changes constantly.
export const dynamic = "force-dynamic";

export async function GET() {
  const repo = getRepository();
  const projects = await repo.list();
  return NextResponse.json(projects);
}

export async function POST(request: Request) {
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

  const repo = getRepository();
  const project = await repo.create(parsed.data);
  return NextResponse.json(project, { status: 201 });
}
