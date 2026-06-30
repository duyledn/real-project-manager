# Coding LLM Handoff — Postgres Storage Driver

## Context
You are adding a Postgres-backed storage driver to **Real Project Manager**
(`C:\Users\lehoa\OneDrive\Documents\Work\real-project-manager`), a Next.js
15.5 / TypeScript (strict) / ESM app. Today all persistence goes through
`src/lib/storage.ts`, which exposes five repository interfaces
(`ProjectRepository`, `SubcontractorRepository`, `JobCategoryRepository`,
`UserRepository`, `CompanyRepository`), each currently backed only by a
JSON-file implementation. Every API route calls the `getXRepository()`
singleton getters — never the file constants directly — so adding a second
implementation behind the same interfaces requires no page or API route
changes.

Full rationale/schema design: read `LLM/context/postgres-storage.md` first —
it explains *why* this schema shape (JSONB-heavy, not fully normalized) and
*why* Neon/`@neondatabase/serverless` were chosen. Don't re-derive these
decisions; implement them.

## Read These Files First
1. `LLM/context/postgres-storage.md` — schema, env vars, design rationale (read in full before writing code)
2. `src/lib/storage.ts` — all five repository interfaces + the JSON implementations you're adding a sibling to
3. `src/lib/types.ts` — `Project`, `User`, `Company`, `Subcontractor` shapes

Start with the listed files; you may explore others if needed, but log every
extra file and why in your completion report, and STOP to ask the user if the
task scope expands. Do NOT modify any file under `src/app/` — this task is
fully contained in `src/lib/storage.ts`, one new `src/lib/db.ts`, and the
`scripts/` directory.

## Changes Required

### 1. `package.json`
Add dependency `@neondatabase/serverless` (latest). Add script:
`"migrate:postgres": "tsx scripts/migrate-to-postgres.ts"`.

### 2. `src/lib/db.ts` (NEW)
Export a singleton query function backed by `@neondatabase/serverless`'s
`neon()`:
```ts
import { neon } from "@neondatabase/serverless";

let sqlFn: ReturnType<typeof neon> | null = null;

export function sql() {
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
```
(Adjust the exact `neon()` usage to match the installed package's actual
API — check its README/type defs after `npm install`, since tagged-template
vs. function-call usage varies by version.)

### 3. `scripts/schema.sql` (NEW)
Copy the five `create table if not exists` statements verbatim from
`LLM/context/postgres-storage.md`'s "Schema" section.

### 4. `src/lib/storage.ts` (MODIFY)
For each of the five entities, add a `Postgres*Repository` class
implementing the same interface as its JSON sibling, using `sql()` from
`./db`. Then change each `getXRepository()` singleton getter to branch:
```ts
export function getRepository(): ProjectRepository {
  if (!repo) repo = isPostgres() ? new PostgresProjectRepository() : new JsonFileRepository();
  return repo;
}
```
(same pattern for the other four getters).

Implementation notes per entity:
- **Projects**: table has columns `id, company_id, member_ids (jsonb), updated_at, data (jsonb)`. `data` is the full `Project` object as JSON. On every `create`/`update`, write `data = JSON.stringify(project)` and also set `company_id`/`member_ids`/`updated_at` from the same object (kept in sync, used only for filtering/sorting). On every read (`list`/`all`/`get`), `JSON.parse(row.data)` and run through the existing `normalizeProject()` before returning — do not duplicate that backfill logic. `list()` must still sort by `updatedAt` descending, same as the JSON version's behavior (you may do this in SQL via `order by updated_at desc`, or in JS after parsing — match existing output ordering).
- **Subcontractors**: ordinary flat columns, no jsonb body needed. Mirror `JsonSubcontractorRepository`'s methods. `relatedJobsBySubcontractor()` (a free function above the class, not a class method) currently reads the project JSON file directly via `readJsonArray<Project>(DATA_FILE)` — **change it to call `getRepository().all()` instead**, so it works under both drivers. This is a real bug fix, not optional.
- **Job categories**: single row, `id = 1`. `get()` selects it (seed `DEFAULT_JOB_CATEGORIES` via upsert if no row exists yet, mirroring the JSON version's first-run seeding). `replace()` upserts the row with the deduped/cleaned array — keep the same dedupe/trim logic as `JsonJobCategoryRepository.replace()`, don't re-derive it differently.
- **Users / Companies**: ordinary flat columns. Mirror the JSON classes' methods exactly (case-insensitive `tag`/`username` lookups for users — do this comparison in SQL with `lower()` or in JS after fetching; either is fine as long as behavior matches).
- **`doSeed()`** (bottom of `storage.ts`) currently reads/writes the project JSON file directly via `readJsonArray<Project>(DATA_FILE)` / `writeJsonAtomic(DATA_FILE, raw)` for the legacy-project company-id backfill. **Change this to use `getRepository().all()` for the read, and `getRepository().update(p.id, p)` per changed project for the write** — same bug class as `relatedJobsBySubcontractor()`, same fix.

### 5. `scripts/migrate-to-postgres.ts` (NEW)
One-time, idempotent script (run manually by the user, not part of the app's
request path):
- Read `DATABASE_URL` from `process.env` (use `dotenv` if needed, or assume
  it's exported in the shell — check how `scripts/test-api.ts` currently
  loads env, if it does, and match that convention).
- Read `data/companies.json`, `data/users.json`, `data/subcontractors.json`,
  `data/job-categories.json`, `data/projects.json` directly via `fs` (these
  are one-shot reads of the legacy files, not through the repository
  abstraction — that's correct here since the point is migrating *out* of
  them).
- For each row, `insert ... on conflict (id) do update set ...` (or for
  `job_categories`, upsert the single `id = 1` row). Insert order: companies,
  users, subcontractors, job_categories, projects.
- Log a count of rows migrated per table. Exit 0 on success.
- If a `data/*.json` file doesn't exist (`ENOENT`), skip that table with a
  log line — don't fail the whole script.

### 6. `.env.example` (MODIFY)
Replace the commented-out example block with concrete instructions:
```
# To use Postgres (Neon) instead of the local JSON files:
# DATABASE_URL="postgresql://user:password@ep-xxxx-pooler.region.aws.neon.tech/dbname?sslmode=require"
# STORAGE_DRIVER="postgres"
```
Keep the existing explanatory comments about why (ephemeral Vercel
filesystem) — don't delete that context, just update the example connection
string format to Neon's pooled-endpoint shape.

## Rules
- ESM only (`import`/`export`), per `tsconfig` — no `require`.
- Do not touch anything under `src/app/` — every consumer already goes
  through the `getXRepository()` getters, so no route/page should need to
  change. If you find one that bypasses the abstraction, flag it in your
  completion report instead of fixing it silently.
- `JsonFileRepository` and its siblings must keep working exactly as today
  when `STORAGE_DRIVER` is unset — this is the zero-config local-dev path
  and must not regress.
- Do not add `pg`, `prisma`, or any other DB client — `@neondatabase/serverless`
  only, per the context doc's rationale.
- Do not commit a real `DATABASE_URL` anywhere — `.env.example` only gets a
  placeholder.
- Do NOT edit `LLM/docs/RULES.md` or `LLM/skills/*.md` unless explicitly asked.

## Verification
1. `npx tsc --noEmit` — no type errors.
2. `npm run test:api` with `STORAGE_DRIVER` unset — must still pass (regression check on the JSON path).
3. `npm run test:calcs` — must still pass (unaffected by this change, but confirms nothing else broke).
4. If you have no real `DATABASE_URL` to test against, say so explicitly in the completion report under a "Postgres path untested — needs manual verification" note. Do not fabricate a passing Postgres test.

## Completion Report (REQUIRED)
Create `LLM/completions/postgres-storage.md` containing:
- **Pass/Fail Status:** Did it pass all verification checks?
- **Verification Commands Run:** Exact commands you executed.
- **Extra Files Explored:** List any files outside "Read These First" and why.
- **What Was Changed:** Files modified/created and brief summaries.
- **Deviations from Handoff:** Anything implemented differently and why. Write "None" if exact.
- **Postgres Path Tested?:** Yes (how) / No (why not — e.g. no DATABASE_URL available in this environment).

## Final Output to User (REQUIRED)
End your response with:

```
---
## ✅ Implementation Complete

**Summary:** [1-2 sentence summary]

**Files changed:**
- `path/to/file` — description
- ...

**Completion report written to:** `LLM/completions/postgres-storage.md`

---

### 🔁 Next Step — Paste this into your Orchestrator:

> The coding LLM has finished the **Postgres Storage Driver** implementation.
> Read the completion report at `LLM/completions/postgres-storage.md`.
> Perform a code review on the modified files against the handoff spec at `LLM/handoffs/postgres-storage.md` and run syntax checks.
> If there are deviations or issues, provide a follow-up prompt for the Coding LLM to fix them.
> If the review passes, update the project documentation and ask me what I'd like to work on next.
```
