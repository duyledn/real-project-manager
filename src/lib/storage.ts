// ---------------------------------------------------------------------------
// STORAGE LAYER  —  read this for the "how should I store data" recommendation.
//
// RECOMMENDATION (given your stack: Next.js + Tailwind, Hostinger, Vercel):
//
//   Use a managed Postgres database for the real deployment, and this
//   file-based JSON store for local development. Both sit behind the same
//   ProjectRepository interface below, so the rest of the app never changes.
//
// WHY NOT "just write files on the server" in production:
//   Vercel runs your Next.js API routes as serverless functions on an
//   EPHEMERAL filesystem. Anything you write to disk there vanishes between
//   requests and is wiped on every deploy. So a JSON/SQLite file on Vercel
//   would silently lose your data. A Hostinger VPS (a real always-on Node
//   process) CAN keep a file on disk — but then you are not really using
//   Vercel for the backend, only for static hosting.
//
// THE CLEAN ANSWER for "push with Vercel, hold projects for years":
//   Put the data in a managed Postgres instance (Neon, Supabase, or Vercel
//   Postgres — all have free tiers). Your Vercel functions AND a Hostinger
//   box can both reach it over the network, it survives deploys, and it backs
//   up automatically. To switch, implement the same ProjectRepository
//   interface with `pg`/Prisma and set process.env.STORAGE_DRIVER=postgres.
//
// WHAT THIS FILE GIVES YOU TODAY:
//   A fully working JSON-file repository (data/projects.json). Perfect for
//   local dev and for a single-user Hostinger VPS. Swapping to Postgres later
//   means writing one new class — no page or API changes.
// ---------------------------------------------------------------------------

import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import type {
  Project,
  ProjectInput,
  ProjectSummary,
  Subcontractor,
  SubcontractorInput,
  SubcontractorWithJobs,
  RelatedJob,
  User,
  Company,
} from "./types";
import { totalRenovationCost } from "./calculations";
import { analyzeProject } from "./calculations";
import { DEFAULT_JOB_CATEGORIES } from "./jobs";
import { hashSecret } from "./auth/secret";
import { isPostgres, sql } from "./db";

export interface ProjectRepository {
  list(): Promise<ProjectSummary[]>;
  all(): Promise<Project[]>;
  get(id: string): Promise<Project | null>;
  create(input: ProjectInput): Promise<Project>;
  update(id: string, input: ProjectInput): Promise<Project | null>;
  remove(id: string): Promise<boolean>;
}

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "projects.json");
const SUBCONTRACTORS_FILE = path.join(DATA_DIR, "subcontractors.json");
const JOB_CATEGORIES_FILE = path.join(DATA_DIR, "job-categories.json");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const COMPANIES_FILE = path.join(DATA_DIR, "companies.json");

function nowIso(): string {
  return new Date().toISOString();
}

function newId(): string {
  return crypto.randomUUID();
}

/** Backfill Phase 2 fields on projects saved before they existed, so every
 *  read returns a fully-shaped Project. Persisted on the next save. */
function normalizeProject(p: Project): Project {
  return {
    ...p,
    currency: p.currency ?? "USD",
    companyId: p.companyId ?? "",
    memberIds: Array.isArray(p.memberIds) ? p.memberIds : [],
    investmentStrategy: p.investmentStrategy ?? "Buy-Rehab-Hold Rental",
    profileImage: p.profileImage ?? "",
    startDate: p.startDate ?? "",
    projectAddress: p.projectAddress ?? "",
    projectManager: p.projectManager ?? "",
    owner: p.owner ?? "",
    generalContractor: p.generalContractor ?? "",
    companyName: p.companyName ?? "",
    senderName: p.senderName ?? "",
    plansLink: p.plansLink ?? "",
    jobs: Array.isArray(p.jobs)
      ? p.jobs.map((j) => ({ ...j, estimatedCost: j.estimatedCost ?? 0, sourceItemId: j.sourceItemId ?? "" }))
      : [],
    importedItemIds: Array.isArray(p.importedItemIds) ? p.importedItemIds : [],
    rooms: p.rooms ?? 0,
    adr: p.adr ?? 0,
    recaptureTaxRate: p.recaptureTaxRate ?? 25,
    itemGroups: Array.isArray(p.itemGroups) ? p.itemGroups : [],
    items: Array.isArray(p.items)
      ? p.items.map((i) => ({ ...i, color: i.color ?? "", groupId: i.groupId ?? "" }))
      : [],
  };
}

function toSummary(p: Project): ProjectSummary {
  const analysis = analyzeProject(p);
  return {
    id: p.id,
    name: p.name,
    updatedAt: p.updatedAt,
    currency: p.currency ?? "USD",
    holdYears: p.holdYears,
    totalRenovationCost: totalRenovationCost(p),
    netProfit: analysis.returns.totalProfit,
    companyId: p.companyId ?? "",
    memberIds: Array.isArray(p.memberIds) ? p.memberIds : [],
    // +1 for the company owner; canDelete is filled in per-viewer by the API.
    memberCount: new Set(Array.isArray(p.memberIds) ? p.memberIds : []).size + 1,
    canDelete: false,
  };
}

function parseJsonColumn<T>(value: unknown): T {
  if (typeof value === "string") return JSON.parse(value) as T;
  return value as T;
}

function jsonColumn(value: unknown): string {
  return JSON.stringify(value);
}

function dbString(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

type ProjectRow = {
  data: unknown;
};

type SubcontractorRow = {
  id: string;
  company_name: string;
  representative_name: string;
  phone: string;
  email: string;
  workers_comp: string;
  w9: string;
  business_license: string;
  created_at: unknown;
  updated_at: unknown;
};

type JobCategoriesRow = {
  categories: unknown;
};

type UserRow = {
  id: string;
  tag: string;
  username: string;
  password: string;
  pin: string;
  role: User["role"];
  avatar: string;
  created_at: unknown;
};

type CompanyRow = {
  id: string;
  name: string;
  owner_id: string;
  member_ids: unknown;
  created_at: unknown;
};

function fromSubcontractorRow(row: SubcontractorRow): Subcontractor {
  return {
    id: row.id,
    companyName: row.company_name,
    representativeName: row.representative_name,
    phone: row.phone,
    email: row.email,
    workersComp: row.workers_comp,
    w9: row.w9,
    businessLicense: row.business_license,
    createdAt: dbString(row.created_at),
    updatedAt: dbString(row.updated_at),
  };
}

function fromUserRow(row: UserRow): User {
  return {
    id: row.id,
    tag: row.tag,
    username: row.username,
    password: row.password,
    pin: row.pin,
    role: row.role,
    avatar: row.avatar,
    createdAt: dbString(row.created_at),
  };
}

function fromCompanyRow(row: CompanyRow): Company {
  return {
    id: row.id,
    name: row.name,
    ownerId: row.owner_id,
    memberIds: parseJsonColumn<string[]>(row.member_ids),
    createdAt: dbString(row.created_at),
  };
}

/** File-backed repository. Concurrency-safe enough for a single-user tool:
 *  reads/writes the whole file atomically via a temp-file rename. */
class JsonFileRepository implements ProjectRepository {
  private async readAll(): Promise<Project[]> {
    try {
      const raw = await fs.readFile(DATA_FILE, "utf8");
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as Project[]).map(normalizeProject) : [];
    } catch (err: unknown) {
      // First run: no file yet.
      if ((err as NodeJS.ErrnoException)?.code === "ENOENT") return [];
      throw err;
    }
  }

  private async writeAll(projects: Project[]): Promise<void> {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const tmp = `${DATA_FILE}.${process.pid}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(projects, null, 2), "utf8");
    await fs.rename(tmp, DATA_FILE); // atomic on POSIX filesystems
  }

  async list(): Promise<ProjectSummary[]> {
    const all = await this.readAll();
    return all
      .map(toSummary)
      .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  }

  async all(): Promise<Project[]> {
    return this.readAll();
  }

  async get(id: string): Promise<Project | null> {
    const all = await this.readAll();
    return all.find((p) => p.id === id) ?? null;
  }

  async create(input: ProjectInput): Promise<Project> {
    const all = await this.readAll();
    const project: Project = {
      ...input,
      id: newId(),
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    all.push(project);
    await this.writeAll(all);
    return project;
  }

  async update(id: string, input: ProjectInput): Promise<Project | null> {
    const all = await this.readAll();
    const idx = all.findIndex((p) => p.id === id);
    if (idx === -1) return null;
    const updated: Project = {
      ...input,
      id,
      createdAt: all[idx].createdAt,
      updatedAt: nowIso(),
    };
    all[idx] = updated;
    await this.writeAll(all);
    return updated;
  }

  async remove(id: string): Promise<boolean> {
    const all = await this.readAll();
    const next = all.filter((p) => p.id !== id);
    if (next.length === all.length) return false;
    await this.writeAll(next);
    return true;
  }
}

class PostgresProjectRepository implements ProjectRepository {
  private rowToProject(row: ProjectRow): Project {
    return normalizeProject(parseJsonColumn<Project>(row.data));
  }

  async list(): Promise<ProjectSummary[]> {
    const rows = (await sql()`select data from projects order by updated_at desc`) as ProjectRow[];
    return rows.map((row) => toSummary(this.rowToProject(row)));
  }

  async all(): Promise<Project[]> {
    const rows = (await sql()`select data from projects order by data->>'createdAt' asc`) as ProjectRow[];
    return rows.map((row) => this.rowToProject(row));
  }

  async get(id: string): Promise<Project | null> {
    const rows = (await sql()`select data from projects where id = ${id}`) as ProjectRow[];
    return rows[0] ? this.rowToProject(rows[0]) : null;
  }

  async create(input: ProjectInput): Promise<Project> {
    const project: Project = {
      ...input,
      id: newId(),
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    await sql()`insert into projects (id, company_id, member_ids, updated_at, data)
      values (
        ${project.id},
        ${project.companyId ?? ""},
        ${jsonColumn(project.memberIds ?? [])}::jsonb,
        ${project.updatedAt},
        ${jsonColumn(project)}::jsonb
      )`;
    return project;
  }

  async update(id: string, input: ProjectInput): Promise<Project | null> {
    const existing = await this.get(id);
    if (!existing) return null;
    const updated: Project = {
      ...input,
      id,
      createdAt: existing.createdAt,
      updatedAt: nowIso(),
    };
    await sql()`update projects
      set company_id = ${updated.companyId ?? ""},
          member_ids = ${jsonColumn(updated.memberIds ?? [])}::jsonb,
          updated_at = ${updated.updatedAt},
          data = ${jsonColumn(updated)}::jsonb
      where id = ${id}`;
    return updated;
  }

  async remove(id: string): Promise<boolean> {
    const rows = (await sql()`delete from projects where id = ${id} returning id`) as { id: string }[];
    return rows.length > 0;
  }
}

// Single shared instance. To switch to Postgres later, branch on
// process.env.STORAGE_DRIVER here and return a PostgresRepository instead.
let repo: ProjectRepository | null = null;

export function getRepository(): ProjectRepository {
  if (!repo) {
    repo = isPostgres() ? new PostgresProjectRepository() : new JsonFileRepository();
  }
  return repo;
}

// ---------------------------------------------------------------------------
// PHASE 2 — global, cross-project stores
// ---------------------------------------------------------------------------

async function writeJsonAtomic(file: string, data: unknown): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), "utf8");
  await fs.rename(tmp, file);
}

async function readJsonArray<T>(file: string): Promise<T[]> {
  try {
    const raw = await fs.readFile(file, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException)?.code === "ENOENT") return [];
    throw err;
  }
}

export interface SubcontractorRepository {
  list(): Promise<SubcontractorWithJobs[]>;
  get(id: string): Promise<Subcontractor | null>;
  create(input: SubcontractorInput): Promise<Subcontractor>;
  update(id: string, input: SubcontractorInput): Promise<Subcontractor | null>;
  remove(id: string): Promise<boolean>;
}

/**
 * Cross-references every project's jobs/bidders to find where a subcontractor
 * is engaged. Derived on read — never stored — so it always reflects current
 * project state (feature #2: "related jobs with active statuses").
 */
async function relatedJobsBySubcontractor(): Promise<Map<string, RelatedJob[]>> {
  const list = await getRepository().all();
  const map = new Map<string, RelatedJob[]>();
  for (const p of list) {
    for (const job of p.jobs ?? []) {
      for (const bidder of job.bidders ?? []) {
        if (!bidder.subcontractorId) continue;
        const entry: RelatedJob = {
          projectId: p.id,
          projectName: p.name,
          jobCategory: job.category,
          status: bidder.status,
        };
        const arr = map.get(bidder.subcontractorId) ?? [];
        arr.push(entry);
        map.set(bidder.subcontractorId, arr);
      }
    }
  }
  return map;
}

class JsonSubcontractorRepository implements SubcontractorRepository {
  private read(): Promise<Subcontractor[]> {
    return readJsonArray<Subcontractor>(SUBCONTRACTORS_FILE);
  }
  private write(rows: Subcontractor[]): Promise<void> {
    return writeJsonAtomic(SUBCONTRACTORS_FILE, rows);
  }

  async list(): Promise<SubcontractorWithJobs[]> {
    const [rows, related] = await Promise.all([this.read(), relatedJobsBySubcontractor()]);
    return rows
      .map((s) => ({ ...s, relatedJobs: related.get(s.id) ?? [] }))
      .sort((a, b) => a.companyName.localeCompare(b.companyName));
  }

  async get(id: string): Promise<Subcontractor | null> {
    const rows = await this.read();
    return rows.find((s) => s.id === id) ?? null;
  }

  async create(input: SubcontractorInput): Promise<Subcontractor> {
    const rows = await this.read();
    const now = nowIso();
    const sub: Subcontractor = { ...input, id: newId(), createdAt: now, updatedAt: now };
    rows.push(sub);
    await this.write(rows);
    return sub;
  }

  async update(id: string, input: SubcontractorInput): Promise<Subcontractor | null> {
    const rows = await this.read();
    const idx = rows.findIndex((s) => s.id === id);
    if (idx === -1) return null;
    const updated: Subcontractor = {
      ...input,
      id,
      createdAt: rows[idx].createdAt,
      updatedAt: nowIso(),
    };
    rows[idx] = updated;
    await this.write(rows);
    return updated;
  }

  async remove(id: string): Promise<boolean> {
    const rows = await this.read();
    const next = rows.filter((s) => s.id !== id);
    if (next.length === rows.length) return false;
    await this.write(next);
    return true;
  }
}

class PostgresSubcontractorRepository implements SubcontractorRepository {
  private async read(): Promise<Subcontractor[]> {
    const rows = (await sql()`select * from subcontractors`) as SubcontractorRow[];
    return rows.map(fromSubcontractorRow);
  }

  async list(): Promise<SubcontractorWithJobs[]> {
    const [rows, related] = await Promise.all([this.read(), relatedJobsBySubcontractor()]);
    return rows
      .map((s) => ({ ...s, relatedJobs: related.get(s.id) ?? [] }))
      .sort((a, b) => a.companyName.localeCompare(b.companyName));
  }

  async get(id: string): Promise<Subcontractor | null> {
    const rows = (await sql()`select * from subcontractors where id = ${id}`) as SubcontractorRow[];
    return rows[0] ? fromSubcontractorRow(rows[0]) : null;
  }

  async create(input: SubcontractorInput): Promise<Subcontractor> {
    const now = nowIso();
    const sub: Subcontractor = { ...input, id: newId(), createdAt: now, updatedAt: now };
    await sql()`insert into subcontractors (
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
        ${sub.workersComp},
        ${sub.w9},
        ${sub.businessLicense},
        ${sub.createdAt},
        ${sub.updatedAt}
      )`;
    return sub;
  }

  async update(id: string, input: SubcontractorInput): Promise<Subcontractor | null> {
    const existing = await this.get(id);
    if (!existing) return null;
    const updated: Subcontractor = {
      ...input,
      id,
      createdAt: existing.createdAt,
      updatedAt: nowIso(),
    };
    await sql()`update subcontractors
      set company_name = ${updated.companyName},
          representative_name = ${updated.representativeName},
          phone = ${updated.phone},
          email = ${updated.email},
          workers_comp = ${updated.workersComp},
          w9 = ${updated.w9},
          business_license = ${updated.businessLicense},
          updated_at = ${updated.updatedAt}
      where id = ${id}`;
    return updated;
  }

  async remove(id: string): Promise<boolean> {
    const rows = (await sql()`delete from subcontractors where id = ${id} returning id`) as { id: string }[];
    return rows.length > 0;
  }
}

let subRepo: SubcontractorRepository | null = null;
export function getSubcontractorRepository(): SubcontractorRepository {
  if (!subRepo) subRepo = isPostgres() ? new PostgresSubcontractorRepository() : new JsonSubcontractorRepository();
  return subRepo;
}

// --- Job categories (a single globally-shared list) ------------------------

export interface JobCategoryRepository {
  get(): Promise<string[]>;
  replace(categories: string[]): Promise<string[]>;
}

function cleanJobCategories(categories: string[]): string[] {
  // De-dupe (case-insensitive), drop blanks, preserve order.
  const seen = new Set<string>();
  const clean: string[] = [];
  for (const c of categories) {
    const t = c.trim();
    if (!t) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    clean.push(t);
  }
  return clean;
}

class JsonJobCategoryRepository implements JobCategoryRepository {
  async get(): Promise<string[]> {
    try {
      const raw = await fs.readFile(JOB_CATEGORIES_FILE, "utf8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length) return parsed as string[];
      return [...DEFAULT_JOB_CATEGORIES];
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException)?.code === "ENOENT") {
        // Seed defaults on first use so the dropdown is never empty.
        await writeJsonAtomic(JOB_CATEGORIES_FILE, DEFAULT_JOB_CATEGORIES);
        return [...DEFAULT_JOB_CATEGORIES];
      }
      throw err;
    }
  }

  async replace(categories: string[]): Promise<string[]> {
    const clean = cleanJobCategories(categories);
    await writeJsonAtomic(JOB_CATEGORIES_FILE, clean);
    return clean;
  }
}

class PostgresJobCategoryRepository implements JobCategoryRepository {
  async get(): Promise<string[]> {
    const rows = (await sql()`select categories from job_categories where id = 1`) as JobCategoriesRow[];
    if (rows[0]) return parseJsonColumn<string[]>(rows[0].categories);

    await sql()`insert into job_categories (id, categories)
      values (1, ${jsonColumn(DEFAULT_JOB_CATEGORIES)}::jsonb)
      on conflict (id) do update set categories = excluded.categories`;
    return [...DEFAULT_JOB_CATEGORIES];
  }

  async replace(categories: string[]): Promise<string[]> {
    const clean = cleanJobCategories(categories);
    await sql()`insert into job_categories (id, categories)
      values (1, ${jsonColumn(clean)}::jsonb)
      on conflict (id) do update set categories = excluded.categories`;
    return clean;
  }
}

let catRepo: JobCategoryRepository | null = null;
export function getJobCategoryRepository(): JobCategoryRepository {
  if (!catRepo) catRepo = isPostgres() ? new PostgresJobCategoryRepository() : new JsonJobCategoryRepository();
  return catRepo;
}

// ---------------------------------------------------------------------------
// USERS & COMPANIES — accounts and collaboration
// ---------------------------------------------------------------------------

export interface UserRepository {
  list(): Promise<User[]>;
  getById(id: string): Promise<User | null>;
  getByTag(tag: string): Promise<User | null>;
  getByUsername(username: string): Promise<User | null>;
  create(input: Omit<User, "id" | "createdAt">): Promise<User>;
  update(id: string, patch: Partial<User>): Promise<User | null>;
}

class JsonUserRepository implements UserRepository {
  private read(): Promise<User[]> {
    return readJsonArray<User>(USERS_FILE);
  }
  private write(rows: User[]): Promise<void> {
    return writeJsonAtomic(USERS_FILE, rows);
  }
  async list(): Promise<User[]> {
    return this.read();
  }
  async getById(id: string): Promise<User | null> {
    return (await this.read()).find((u) => u.id === id) ?? null;
  }
  async getByTag(tag: string): Promise<User | null> {
    const t = tag.toLowerCase();
    return (await this.read()).find((u) => u.tag.toLowerCase() === t) ?? null;
  }
  async getByUsername(username: string): Promise<User | null> {
    const u = username.toLowerCase();
    return (await this.read()).find((x) => x.username.toLowerCase() === u) ?? null;
  }
  async create(input: Omit<User, "id" | "createdAt">): Promise<User> {
    const rows = await this.read();
    const user: User = { ...input, id: newId(), createdAt: nowIso() };
    rows.push(user);
    await this.write(rows);
    return user;
  }
  async update(id: string, patch: Partial<User>): Promise<User | null> {
    const rows = await this.read();
    const idx = rows.findIndex((u) => u.id === id);
    if (idx === -1) return null;
    rows[idx] = { ...rows[idx], ...patch, id, createdAt: rows[idx].createdAt };
    await this.write(rows);
    return rows[idx];
  }
}

class PostgresUserRepository implements UserRepository {
  async list(): Promise<User[]> {
    const rows = (await sql()`select * from users order by created_at asc`) as UserRow[];
    return rows.map(fromUserRow);
  }

  async getById(id: string): Promise<User | null> {
    const rows = (await sql()`select * from users where id = ${id}`) as UserRow[];
    return rows[0] ? fromUserRow(rows[0]) : null;
  }

  async getByTag(tag: string): Promise<User | null> {
    const rows = (await sql()`select * from users where lower(tag) = lower(${tag})`) as UserRow[];
    return rows[0] ? fromUserRow(rows[0]) : null;
  }

  async getByUsername(username: string): Promise<User | null> {
    const rows = (await sql()`select * from users where lower(username) = lower(${username})`) as UserRow[];
    return rows[0] ? fromUserRow(rows[0]) : null;
  }

  async create(input: Omit<User, "id" | "createdAt">): Promise<User> {
    const user: User = { ...input, id: newId(), createdAt: nowIso() };
    await sql()`insert into users (id, tag, username, password, pin, role, avatar, created_at)
      values (
        ${user.id},
        ${user.tag},
        ${user.username},
        ${user.password},
        ${user.pin},
        ${user.role},
        ${user.avatar},
        ${user.createdAt}
      )`;
    return user;
  }

  async update(id: string, patch: Partial<User>): Promise<User | null> {
    const existing = await this.getById(id);
    if (!existing) return null;
    const updated: User = { ...existing, ...patch, id, createdAt: existing.createdAt };
    await sql()`update users
      set tag = ${updated.tag},
          username = ${updated.username},
          password = ${updated.password},
          pin = ${updated.pin},
          role = ${updated.role},
          avatar = ${updated.avatar}
      where id = ${id}`;
    return updated;
  }
}

let userRepo: UserRepository | null = null;
export function getUserRepository(): UserRepository {
  if (!userRepo) userRepo = isPostgres() ? new PostgresUserRepository() : new JsonUserRepository();
  return userRepo;
}

export interface CompanyRepository {
  list(): Promise<Company[]>;
  getById(id: string): Promise<Company | null>;
  create(name: string, ownerId: string): Promise<Company>;
  update(id: string, patch: Partial<Company>): Promise<Company | null>;
  remove(id: string): Promise<boolean>;
}

class JsonCompanyRepository implements CompanyRepository {
  private read(): Promise<Company[]> {
    return readJsonArray<Company>(COMPANIES_FILE);
  }
  private write(rows: Company[]): Promise<void> {
    return writeJsonAtomic(COMPANIES_FILE, rows);
  }
  async list(): Promise<Company[]> {
    return this.read();
  }
  async getById(id: string): Promise<Company | null> {
    return (await this.read()).find((c) => c.id === id) ?? null;
  }
  async create(name: string, ownerId: string): Promise<Company> {
    const rows = await this.read();
    const company: Company = { id: newId(), name, ownerId, memberIds: [], createdAt: nowIso() };
    rows.push(company);
    await this.write(rows);
    return company;
  }
  async update(id: string, patch: Partial<Company>): Promise<Company | null> {
    const rows = await this.read();
    const idx = rows.findIndex((c) => c.id === id);
    if (idx === -1) return null;
    rows[idx] = { ...rows[idx], ...patch, id, createdAt: rows[idx].createdAt };
    await this.write(rows);
    return rows[idx];
  }
  async remove(id: string): Promise<boolean> {
    const rows = await this.read();
    const next = rows.filter((c) => c.id !== id);
    if (next.length === rows.length) return false;
    await this.write(next);
    return true;
  }
}

class PostgresCompanyRepository implements CompanyRepository {
  async list(): Promise<Company[]> {
    const rows = (await sql()`select * from companies order by created_at asc`) as CompanyRow[];
    return rows.map(fromCompanyRow);
  }

  async getById(id: string): Promise<Company | null> {
    const rows = (await sql()`select * from companies where id = ${id}`) as CompanyRow[];
    return rows[0] ? fromCompanyRow(rows[0]) : null;
  }

  async create(name: string, ownerId: string): Promise<Company> {
    const company: Company = { id: newId(), name, ownerId, memberIds: [], createdAt: nowIso() };
    await sql()`insert into companies (id, name, owner_id, member_ids, created_at)
      values (
        ${company.id},
        ${company.name},
        ${company.ownerId},
        ${jsonColumn(company.memberIds)}::jsonb,
        ${company.createdAt}
      )`;
    return company;
  }

  async update(id: string, patch: Partial<Company>): Promise<Company | null> {
    const existing = await this.getById(id);
    if (!existing) return null;
    const updated: Company = { ...existing, ...patch, id, createdAt: existing.createdAt };
    await sql()`update companies
      set name = ${updated.name},
          owner_id = ${updated.ownerId},
          member_ids = ${jsonColumn(updated.memberIds)}::jsonb
      where id = ${id}`;
    return updated;
  }

  async remove(id: string): Promise<boolean> {
    const rows = (await sql()`delete from companies where id = ${id} returning id`) as { id: string }[];
    return rows.length > 0;
  }
}

let companyRepo: CompanyRepository | null = null;
export function getCompanyRepository(): CompanyRepository {
  if (!companyRepo) companyRepo = isPostgres() ? new PostgresCompanyRepository() : new JsonCompanyRepository();
  return companyRepo;
}

/**
 * One-time bootstrap: seed the @god admin account, ensure a default company
 * exists, and migrate any legacy projects that predate companies into it.
 * Idempotent and memoized so it can be awaited freely from API routes.
 */
let seedPromise: Promise<void> | null = null;
export function ensureSeeded(): Promise<void> {
  if (!seedPromise) seedPromise = doSeed();
  return seedPromise;
}

async function doSeed(): Promise<void> {
  const users = getUserRepository();
  let god = await users.getByTag("god");
  if (!god) {
    god = await users.create({
      tag: "god",
      username: "leducduy42",
      password: hashSecret("Kiemtien@0312"),
      pin: hashSecret("031299"),
      role: "god",
      avatar: "",
    });
  }

  const companies = getCompanyRepository();
  const all = await companies.list();
  let home = all.find((c) => c.ownerId === god!.id);
  if (!home) {
    home = await companies.create("HQ", god.id);
  }

  // Migrate legacy projects with no company into the god's HQ company.
  const projects = getRepository();
  const raw = await projects.all();
  for (const p of raw) {
    let changed = false;
    if (!p.companyId) {
      p.companyId = home.id;
      changed = true;
    }
    if (!Array.isArray(p.memberIds)) {
      p.memberIds = [];
      changed = true;
    }
    if (changed) await projects.update(p.id, p);
  }
}
