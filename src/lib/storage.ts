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
} from "./types";
import { totalRenovationCost } from "./calculations";
import { analyzeProject } from "./calculations";
import { DEFAULT_JOB_CATEGORIES } from "./jobs";

export interface ProjectRepository {
  list(): Promise<ProjectSummary[]>;
  get(id: string): Promise<Project | null>;
  create(input: ProjectInput): Promise<Project>;
  update(id: string, input: ProjectInput): Promise<Project | null>;
  remove(id: string): Promise<boolean>;
}

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "projects.json");
const SUBCONTRACTORS_FILE = path.join(DATA_DIR, "subcontractors.json");
const JOB_CATEGORIES_FILE = path.join(DATA_DIR, "job-categories.json");

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
    startDate: p.startDate ?? "",
    projectAddress: p.projectAddress ?? "",
    projectManager: p.projectManager ?? "",
    owner: p.owner ?? "",
    generalContractor: p.generalContractor ?? "",
    companyName: p.companyName ?? "",
    senderName: p.senderName ?? "",
    plansLink: p.plansLink ?? "",
    jobs: Array.isArray(p.jobs) ? p.jobs : [],
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
    holdYears: p.holdYears,
    totalRenovationCost: totalRenovationCost(p),
    netProfit: analysis.returns.totalProfit,
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

// Single shared instance. To switch to Postgres later, branch on
// process.env.STORAGE_DRIVER here and return a PostgresRepository instead.
let repo: ProjectRepository | null = null;

export function getRepository(): ProjectRepository {
  if (!repo) {
    repo = new JsonFileRepository();
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
  const list = await readJsonArray<Project>(DATA_FILE);
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

let subRepo: SubcontractorRepository | null = null;
export function getSubcontractorRepository(): SubcontractorRepository {
  if (!subRepo) subRepo = new JsonSubcontractorRepository();
  return subRepo;
}

// --- Job categories (a single globally-shared list) ------------------------

export interface JobCategoryRepository {
  get(): Promise<string[]>;
  replace(categories: string[]): Promise<string[]>;
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
    await writeJsonAtomic(JOB_CATEGORIES_FILE, clean);
    return clean;
  }
}

let catRepo: JobCategoryRepository | null = null;
export function getJobCategoryRepository(): JobCategoryRepository {
  if (!catRepo) catRepo = new JsonJobCategoryRepository();
  return catRepo;
}
