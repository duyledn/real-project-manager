# Commands Reference

<!-- 
Document all user-facing commands, routes, or API endpoints here.
Updated by the Orchestrator after each audit.

Use this format per feature section:
-->

## Postgres storage migration (one-time, manual)
**Handled in:** `scripts/migrate-to-postgres.ts`
**Permissions:** Run locally by the project owner, not exposed to end users.

### `npm run migrate:postgres`
**Syntax:** `DATABASE_URL=<neon-pooled-connection-string> npm run migrate:postgres`
**Behaviour:** Idempotent one-time copy of `data/*.json` into the Postgres tables defined in `scripts/schema.sql` (apply the schema first). Safe to re-run — upserts by id. Skips any table whose JSON file doesn't exist, with a log line. Run this once after setting `DATABASE_URL`/`STORAGE_DRIVER=postgres`, before relying on the app in production.
