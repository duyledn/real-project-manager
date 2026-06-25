import { NextResponse } from "next/server";
import { getSubcontractorRepository } from "@/lib/storage";
import { subcontractorInputSchema } from "@/lib/defaults";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const repo = getSubcontractorRepository();
  const subs = await repo.list();
  return NextResponse.json(subs);
}

export async function POST(request: Request) {
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
  const sub = await repo.create(parsed.data);
  return NextResponse.json(sub, { status: 201 });
}
