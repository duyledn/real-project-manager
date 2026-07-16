import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

type Shipment = {
  date: string;
  serial: string;
  name: string;
  zip: string;
  ref: string;
  digits: string;
  daft: string;
};

type MailTrackerState = {
  mid: string;
  bcid: string;
  stid: string;
  serial: string;
  returnAddr: string;
  log: Shipment[];
};

async function ensureTable(): Promise<void> {
  await sql()`create table if not exists mail_tracker_state (
    id text primary key,
    data jsonb not null,
    updated_at timestamptz not null default now()
  )`;
}

function text(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.slice(0, maxLength) : "";
}

function cleanState(value: unknown): MailTrackerState {
  const input = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const rawLog = Array.isArray(input.log) ? input.log.slice(0, 5000) : [];

  return {
    mid: text(input.mid, 9).replace(/\D/g, ""),
    bcid: text(input.bcid, 2).replace(/\D/g, "") || "00",
    stid: text(input.stid, 3).replace(/\D/g, "") || "310",
    serial: text(input.serial, 9).replace(/\D/g, "") || "1",
    returnAddr: text(input.returnAddr, 1000),
    log: rawLog.map((row) => {
      const item = row && typeof row === "object" ? (row as Record<string, unknown>) : {};
      return {
        date: text(item.date, 10),
        serial: text(item.serial, 9),
        name: text(item.name, 200),
        zip: text(item.zip, 20),
        ref: text(item.ref, 300),
        digits: text(item.digits, 31),
        daft: text(item.daft, 65),
      };
    }),
  };
}

function databaseError(error: unknown): NextResponse {
  console.error("Mail tracker database error", error);
  return NextResponse.json(
    { error: "Live storage is unavailable. Check DATABASE_URL on the deployment." },
    { status: 503 },
  );
}

export async function GET() {
  try {
    await ensureTable();
    const rows = (await sql()`select data from mail_tracker_state where id = 'default'`) as {
      data: unknown;
    }[];
    return NextResponse.json({ state: rows[0] ? cleanState(rows[0].data) : null });
  } catch (error) {
    return databaseError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const state = cleanState(await request.json());
    await ensureTable();
    await sql()`insert into mail_tracker_state (id, data, updated_at)
      values ('default', ${JSON.stringify(state)}::jsonb, now())
      on conflict (id) do update
      set data = excluded.data,
          updated_at = excluded.updated_at`;
    return NextResponse.json({ state });
  } catch (error) {
    return databaseError(error);
  }
}
