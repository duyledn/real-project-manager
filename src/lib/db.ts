import { neon } from "@neondatabase/serverless";

let sqlFn: ReturnType<typeof neon> | null = null;

export function sql(): ReturnType<typeof neon> {
  if (!sqlFn) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set but STORAGE_DRIVER=postgres");
    sqlFn = neon(url);
  }
  return sqlFn;
}

export function isPostgres(): boolean {
  return process.env.STORAGE_DRIVER === "postgres";
}
