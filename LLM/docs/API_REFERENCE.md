# API Reference

<!-- 
Document internal function signatures, data schemas, and module exports here.
Updated by the Orchestrator after each audit.
-->

## `src/lib/storage.ts` — repository layer

Every consumer (API routes) calls these singleton getters — never the
underlying file/DB classes directly. Each getter picks the JSON-file
implementation or the Postgres implementation based on
`isPostgres()` (`src/lib/db.ts`, true when `STORAGE_DRIVER=postgres`).

### Exports

| Function | Signature | Description |
|----------|-----------|-------------|
| `getRepository` | `() → ProjectRepository` | Projects: `list, all, get, create, update, remove` |
| `getSubcontractorRepository` | `() → SubcontractorRepository` | Subcontractors: `list, get, create, update, remove` |
| `getJobCategoryRepository` | `() → JobCategoryRepository` | Globally-shared job categories: `get, replace` |
| `getUserRepository` | `() → UserRepository` | Users: `list, getById, getByTag, getByUsername, create, update` |
| `getCompanyRepository` | `() → CompanyRepository` | Companies: `list, getById, create, update, remove` |
| `ensureSeeded` | `() → Promise<void>` | One-time idempotent bootstrap (god user, HQ company, legacy-project backfill). Goes through the repository getters above, so it works under either storage driver. |

## `src/lib/db.ts` — Postgres connection (Neon)

| Function | Signature | Description |
|----------|-----------|-------------|
| `sql` | `() → NeonQueryFunction` | Singleton Neon tagged-template query function. Reads `DATABASE_URL`; throws if unset. |
| `isPostgres` | `() → boolean` | `true` when `process.env.STORAGE_DRIVER === "postgres"`. |

---

## Data Schemas

### Postgres (`scripts/schema.sql`) — only relevant when `STORAGE_DRIVER=postgres`
- `companies(id, name, owner_id, member_ids jsonb, created_at)`
- `users(id, tag, username, password, pin, role, avatar, created_at)`
- `subcontractors(id, company_name, representative_name, phone, email, workers_comp, w9, business_license, created_at, updated_at)`
- `job_categories(id, categories jsonb)` — single row, `id = 1`
- `projects(id, company_id, member_ids jsonb, updated_at, data jsonb)` — `data` holds the full serialized `Project` object (see `src/lib/types.ts`); `company_id`/`member_ids`/`updated_at` are promoted columns kept in sync on every write, used only for filtering/sorting.

### `data/*.json` (default, `STORAGE_DRIVER` unset)
Unchanged — see `src/lib/types.ts` for shapes. `projects.json`, `subcontractors.json`, `job-categories.json`, `users.json`, `companies.json`.
