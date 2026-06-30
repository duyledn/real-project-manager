import { promises as fs } from "fs";
import path from "path";
import { neon } from "@neondatabase/serverless";
import type { NeonQueryFunction } from "@neondatabase/serverless";
import type { Company, Project, Subcontractor, User } from "../src/lib/types";

const DATA_DIR = path.join(process.cwd(), "data");
type Db = NeonQueryFunction<false, false>;

type LegacyRead<T> = {
  exists: boolean;
  rows: T[];
};

function jsonColumn(value: unknown): string {
  return JSON.stringify(value);
}

async function readLegacyArray<T>(fileName: string, tableName: string): Promise<LegacyRead<T>> {
  const file = path.join(DATA_DIR, fileName);
  try {
    const raw = await fs.readFile(file, "utf8");
    const parsed = JSON.parse(raw);
    return { exists: true, rows: Array.isArray(parsed) ? (parsed as T[]) : [] };
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException)?.code === "ENOENT") {
      console.log(`${tableName}: migrated 0 rows (skipped missing data/${fileName})`);
      return { exists: false, rows: [] };
    }
    throw err;
  }
}

async function migrateCompanies(db: Db): Promise<void> {
  const { exists, rows } = await readLegacyArray<Company>("companies.json", "companies");
  if (!exists) return;

  for (const company of rows) {
    await db`insert into companies (id, name, owner_id, member_ids, created_at)
      values (
        ${company.id},
        ${company.name},
        ${company.ownerId},
        ${jsonColumn(Array.isArray(company.memberIds) ? company.memberIds : [])}::jsonb,
        ${company.createdAt}
      )
      on conflict (id) do update
      set name = excluded.name,
          owner_id = excluded.owner_id,
          member_ids = excluded.member_ids,
          created_at = excluded.created_at`;
  }
  console.log(`companies: migrated ${rows.length} rows`);
}

async function migrateUsers(db: Db): Promise<void> {
  const { exists, rows } = await readLegacyArray<User>("users.json", "users");
  if (!exists) return;

  for (const user of rows) {
    await db`insert into users (id, tag, username, password, pin, role, avatar, created_at)
      values (
        ${user.id},
        ${user.tag},
        ${user.username},
        ${user.password},
        ${user.pin},
        ${user.role},
        ${user.avatar ?? ""},
        ${user.createdAt}
      )
      on conflict (id) do update
      set tag = excluded.tag,
          username = excluded.username,
          password = excluded.password,
          pin = excluded.pin,
          role = excluded.role,
          avatar = excluded.avatar,
          created_at = excluded.created_at`;
  }
  console.log(`users: migrated ${rows.length} rows`);
}

async function migrateSubcontractors(db: Db): Promise<void> {
  const { exists, rows } = await readLegacyArray<Subcontractor>("subcontractors.json", "subcontractors");
  if (!exists) return;

  for (const sub of rows) {
    await db`insert into subcontractors (
        id,
        company_name,
        representative_name,
        phone,
        email,
        workers_comp,
        w9,
        business_license,
        created_at,
        updated_at
      )
      values (
        ${sub.id},
        ${sub.companyName},
        ${sub.representativeName},
        ${sub.phone},
        ${sub.email},
        ${sub.workersComp ?? ""},
        ${sub.w9 ?? ""},
        ${sub.businessLicense ?? ""},
        ${sub.createdAt},
        ${sub.updatedAt}
      )
      on conflict (id) do update
      set company_name = excluded.company_name,
          representative_name = excluded.representative_name,
          phone = excluded.phone,
          email = excluded.email,
          workers_comp = excluded.workers_comp,
          w9 = excluded.w9,
          business_license = excluded.business_license,
          created_at = excluded.created_at,
          updated_at = excluded.updated_at`;
  }
  console.log(`subcontractors: migrated ${rows.length} rows`);
}

async function migrateJobCategories(db: Db): Promise<void> {
  const { exists, rows } = await readLegacyArray<string>("job-categories.json", "job_categories");
  if (!exists) return;

  await db`insert into job_categories (id, categories)
    values (1, ${jsonColumn(rows)}::jsonb)
    on conflict (id) do update set categories = excluded.categories`;
  console.log("job_categories: migrated 1 row");
}

async function migrateProjects(db: Db): Promise<void> {
  const { exists, rows } = await readLegacyArray<Project>("projects.json", "projects");
  if (!exists) return;

  for (const project of rows) {
    await db`insert into projects (id, company_id, member_ids, updated_at, data)
      values (
        ${project.id},
        ${project.companyId ?? ""},
        ${jsonColumn(Array.isArray(project.memberIds) ? project.memberIds : [])}::jsonb,
        ${project.updatedAt},
        ${jsonColumn(project)}::jsonb
      )
      on conflict (id) do update
      set company_id = excluded.company_id,
          member_ids = excluded.member_ids,
          updated_at = excluded.updated_at,
          data = excluded.data`;
  }
  console.log(`projects: migrated ${rows.length} rows`);
}

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required to migrate to Postgres");

  const db: Db = neon(databaseUrl);
  await migrateCompanies(db);
  await migrateUsers(db);
  await migrateSubcontractors(db);
  await migrateJobCategories(db);
  await migrateProjects(db);
}

main().catch((err) => {
  console.error("Migration failed", err);
  process.exit(1);
});
