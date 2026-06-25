import { NextResponse } from "next/server";
import { z } from "zod";
import { getJobCategoryRepository } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({ categories: z.array(z.string()) });

export async function GET() {
  const repo = getJobCategoryRepository();
  const categories = await repo.get();
  return NextResponse.json(categories);
}

// Replace the whole shared list. The client sends the full desired set after
// an add/remove, and every project reads from this same list (global sync).
export async function PUT(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const repo = getJobCategoryRepository();
  const saved = await repo.replace(parsed.data.categories);
  return NextResponse.json(saved);
}
