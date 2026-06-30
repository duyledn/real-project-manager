# Context — Postgres Storage Driver

## Background
The app is deployed on Vercel (serverless, ephemeral filesystem) but currently
persists everything to `data/*.json` on disk. That works locally but silently
loses data in production. `src/lib/storage.ts` was deliberately built with a
`ProjectRepository`-style interface per entity so a database driver can be
swapped in with no page/API changes — this feature implements that swap.

## Decision (made with the user, 2026-06-30)
- **Provider:** Managed serverless Postgres — **Neon** — not the user's
  Hostinger database. Reasoning: Vercel serverless functions have no fixed
  outbound IP, so Hostinger's IP-allowlisted remote-MySQL/Postgres access
  doesn't reliably work, and traditional connection limits collide with
  serverless's many-short-lived-connections pattern. Neon is what the
  storage layer's comments/README already pointed at, has a generous free
  tier, and a native Vercel integration.
- **Driver:** `@neondatabase/serverless` (HTTP-based, no connection pool to
  manage, designed for serverless/edge). Not `pg`+PgBouncer — unnecessary
  complexity for this app's query patterns (no transactions needed across
  the existing repository methods).
- **Schema shape:** Hybrid relational + JSONB, not full normalization.
  `Project` has several nested arrays (`jobs`, `items`, `itemGroups`,
  `expenses`, `incomes`, `files`, `importedItemIds`) that are only ever
  read/written as a whole object in the app (see `src/lib/types.ts`,
  `src/lib/calculations.ts::analyzeProject`). Normalizing those into child
  tables would be a much larger rewrite for no benefit — nothing queries
  inside them in SQL. Store the full `Project` as one `jsonb` column, with a
  few scalar columns promoted alongside it purely for indexing/sorting
  (`id`, `company_id`, `member_ids`, `updated_at`). `User`, `Company`, and
  `Subcontractor` are flat already — those get ordinary typed columns.

## Schema

```sql
create table if not exists companies (
  id text primary key,
  name text not null,
  owner_id text not null,
  member_ids jsonb not null default '[]',
  created_at timestamptz not null
);

create table if not exists users (
  id text primary key,
  tag text not null unique,
  username text not null unique,
  password text not null,
  pin text not null,
  role text not null,
  avatar text not null default '',
  created_at timestamptz not null
);

create table if not exists subcontractors (
  id text primary key,
  company_name text not null,
  representative_name text not null,
  phone text not null,
  email text not null,
  workers_comp text not null default '',
  w9 text not null default '',
  business_license text not null default '',
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create table if not exists job_categories (
  id int primary key default 1,
  categories jsonb not null default '[]',
  constraint job_categories_single_row check (id = 1)
);

create table if not exists projects (
  id text primary key,
  company_id text not null default '',
  member_ids jsonb not null default '[]',
  updated_at timestamptz not null,
  data jsonb not null
);
create index if not exists projects_company_id_idx on projects (company_id);
```

`data` holds the full serialized `Project` (including its own `id`,
`createdAt`, `updatedAt`, `companyId`, `memberIds` — duplicated into the
promoted columns on every write so SQL can filter/sort without parsing
JSONB). On read, parse `data` and run it through the existing
`normalizeProject()` for backfill safety, same as `JsonFileRepository` does
today.

## Two bugs to fix while doing this (currently bypass the abstraction)
`doSeed()` and `relatedJobsBySubcontractor()` in `storage.ts` both read the
JSON file directly via `readJsonArray<Project>(DATA_FILE)` instead of going
through `getRepository()`. Under `STORAGE_DRIVER=postgres` this would silently
read stale/empty data. Both must be changed to call `getRepository().all()`
(and `doSeed`'s write-back of `companyId`/`memberIds` backfill must go through
`getRepository().update()` per project, not a raw file write).

## Environment variables
- `DATABASE_URL` — Neon's **pooled** connection string (the one with
  `-pooler` in the hostname), `sslmode=require`.
- `STORAGE_DRIVER` — `"postgres"` to use the DB; unset/anything else keeps
  today's zero-config JSON file behavior for local dev.

## Migration path (one-time, run by the user after schema + env are set)
A script reads existing `data/*.json` and upserts every row into the new
tables (idempotent via `ON CONFLICT (id) DO UPDATE`, safe to re-run). Order
matters: `companies` and `users` before `projects` (no FK enforced, but
logically dependent) — actually no FK constraints are defined above
(keeps the migration script simple and tolerant of the legacy data's loose
referential integrity); insert order is companies → users → subcontractors →
job_categories → projects.

## Out of scope
- No change to any API route or page — they only ever call
  `getRepository()` / `getSubcontractorRepository()` / etc.
- No removal of `JsonFileRepository` — it stays the default so local dev
  and `npm run test:api`/`test:calcs` keep working with zero config.
- Connecting the existing Hostinger website's database is explicitly NOT
  part of this — out of scope per the provider decision above.
