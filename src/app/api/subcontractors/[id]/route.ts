import { NextResponse } from "next/server";
import { getSubcontractorRepository } from "@/lib/storage";
import { subcontractorInputSchema } from "@/lib/defaults";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const repo = getSubcontractorRepository();
  const sub = await repo.get(id);
  if (!sub) {
    return NextResponse.json({ error: "Subcontractor not found" }, { status: 404 });
  }
  return NextResponse.json(sub);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = subcontractorInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const repo = getSubcontractorRepository();
  const updated = await repo.update(id, parsed.data);
  if (!updated) {
    return NextResponse.json({ error: "Subcontractor not found" }, { status: 404 });
  }
  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const repo = getSubcontractorRepository();
  const ok = await repo.remove(id);
  if (!ok) {
    return NextResponse.json({ error: "Subcontractor not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
