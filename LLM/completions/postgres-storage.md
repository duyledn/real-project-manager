# Postgres Storage Driver Completion

## Pass/Fail Status
Fail for the full requested verification suite because `npx tsc --noEmit` fails in an existing forbidden-scope app file:

- `src/app/projects/[id]/page.tsx(37,25)` / `(55,25)`: duplicate `export default` implementations.
- `src/app/projects/[id]/page.tsx(44,15)`: calls the Neon tagged-template query function as a normal function.

Per the handoff rule, no files under `src/app/` were modified. The new storage/migration files pass a targeted TypeScript check, and both JSON-path regression tests passed.

## Verification Commands Run
- `npm install @neondatabase/serverless@latest` - passed; package was already up to date at `1.1.0`.
- `npx tsc --noEmit` - failed due the existing `src/app/projects/[id]/page.tsx` errors listed above.
- `$env:STORAGE_DRIVER=$null; npm run test:api` - passed.
- `npm run test:calcs` - passed.
- `npx tsc --noEmit --strict --target ES2017 --lib dom,dom.iterable,esnext --module esnext --moduleResolution bundler --esModuleInterop --skipLibCheck --incremental false scripts/migrate-to-postgres.ts src/lib/db.ts src/lib/storage.ts` - passed.

## Extra Files Explored
- `.agents/skills/neon-postgres/SKILL.md` - required Neon skill instructions for `@neondatabase/serverless` work.
- `package.json` - dependency/script update.
- `.env.example` - required env example update.
- `scripts/test-api.ts` - checked existing script/env-loading convention; it does not load dotenv.
- `package-lock.json` - presence checked; no lockfile change was needed after npm reported the Neon dependency up to date.
- `tsconfig.json` - confirmed strict ESM TypeScript settings.
- `node_modules/@neondatabase/serverless/package.json` - confirmed installed version.
- `node_modules/@neondatabase/serverless/README.md` - confirmed `neon()` tagged-template usage.
- `node_modules/@neondatabase/serverless/index.d.ts` - confirmed `neon()` return type/API.
- `src/app/api/projects/route.ts` - checked visible use of `getRepository().all()` ordering.
- `src/app/api/admin/route.ts` - checked visible use of `getRepository().all()` ordering.
- `src/app/api/companies/[id]/members/route.ts` - checked project update usage through repository.
- `src/app/projects/[id]/page.tsx` - inspected only because full TypeScript verification failed there; left unchanged by rule.
- `LLM/completions/README.md` - checked completion-report directory context.
- `data/projects.json` - inspected/restored after `npm run test:api` rewrote it during verification.
- `tsconfig.tsbuildinfo` - inspected/restored after `npx tsc --noEmit` rewrote it during verification.

## What Was Changed
- `package.json` - added `migrate:postgres` script. The `@neondatabase/serverless` dependency was already present and current.
- `src/lib/db.ts` - added the singleton Neon `sql()` wrapper and `isPostgres()` driver switch.
- `scripts/schema.sql` - added the five table definitions and project index from the context schema.
- `src/lib/storage.ts` - added Postgres repository implementations for projects, subcontractors, job categories, users, and companies; switched all singleton getters based on `STORAGE_DRIVER`; fixed `relatedJobsBySubcontractor()` and `doSeed()` to use repository methods instead of direct project JSON file access.
- `scripts/migrate-to-postgres.ts` - added an idempotent one-time JSON-to-Postgres migration script with per-table counts and missing-file skips.
- `.env.example` - updated Postgres instructions with a Neon pooled connection-string placeholder.
- `LLM/completions/postgres-storage.md` - added this completion report.

## Deviations from Handoff
- `@neondatabase/serverless` was already present in `package.json` at `^1.1.0`; `npm install @neondatabase/serverless@latest` reported it was up to date, so no dependency version change was made.
- The migration script assumes `DATABASE_URL` is exported in the shell, matching the existing scripts' convention instead of adding `dotenv`.
- Full `npx tsc --noEmit` could not pass because fixing the failing `src/app/projects/[id]/page.tsx` file is outside the allowed scope.

## Postgres Path Tested?
No. There is no real `DATABASE_URL` available in this environment, so the Postgres runtime path and migration script need manual verification against a Neon database after `scripts/schema.sql` has been applied.
