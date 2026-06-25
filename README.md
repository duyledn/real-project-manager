# Remodel Estimator

A Next.js + Tailwind application for estimating **buy-rehab-hold** rental
remodels and analyzing their multi-year investment returns. Built to be reused
across future projects, not just one deal.

It has three views per project:

1. **Inputs** — itemized rehab costs, financing, operating expenses, revenue
   sources, and acquisition/hold/exit assumptions. Everything autosaves.
2. **Analysis** — the finance analysis section: IRR, equity multiple,
   cash-on-cash, cap rate, DSCR, plus a full year-by-year pro forma
   (Gross Income → NOI/EBITDA → EBIT → EBT → Net Income → levered cash flow)
   and an exit summary, with charts.
3. **Math Check** — every formula shown with your actual numbers substituted
   in, so you can audit each calculation and adjust inputs to see them update.
   Includes the full amortization schedule.

---

## How project data is stored (the recommendation)

**Short answer: file-based JSON now, managed Postgres when you deploy on Vercel.**

The whole data layer sits behind one interface, `ProjectRepository`
(`src/lib/storage.ts`). The app ships with a `JsonFileRepository` that writes to
`data/projects.json`.

- **Local dev / Hostinger VPS:** the JSON file store works as-is. A Hostinger
  VPS is an always-on Node process with a real, persistent disk, so the file
  survives restarts. This is the simplest setup and needs zero configuration.

- **Vercel:** Vercel runs your API routes as **serverless functions on an
  ephemeral filesystem** — anything written to disk is wiped between requests
  and on every deploy. A JSON or SQLite file there would silently lose data.
  For a Vercel-hosted backend, move the data into a **managed Postgres**
  instance (Neon, Supabase, or Vercel Postgres — all have free tiers). It is
  reachable from both Vercel and Hostinger, survives deploys, and backs up
  automatically.

Switching is a one-file change: implement `ProjectRepository` with `pg` or
Prisma, then branch on `process.env.STORAGE_DRIVER` inside `getRepository()`.
No page, component, or API-route code changes, because everything already goes
through the interface.

---

## Running locally

```bash
npm install
npm run dev          # http://localhost:3000
```

Projects are saved to `data/projects.json` (created on first save).

## Verifying the math

The calculation engine is pure and separately testable:

```bash
npm run test:calcs   # 17 checks vs hand-computed values (mortgage payment, IRR, depreciation, pro forma identities…)
npm run test:api     # storage CRUD + validation + analysis pipeline
```

## Production build

```bash
npm run build
npm run start
```

---

## Architecture

```
src/
  app/
    page.tsx                       Project list (home)
    api/projects/route.ts          GET list, POST create
    api/projects/[id]/route.ts     GET, PUT, DELETE
    projects/[id]/
      layout.tsx                   Tab nav (Inputs / Analysis / Math)
      page.tsx                     Inputs tab
      analysis/page.tsx            Analysis tab (KPIs, pro forma, charts, exit)
      math/page.tsx                Math Check tab (formulas + amortization)
  lib/
    types.ts                       Domain + computed-result types
    calculations.ts                Pure financial engine (the heart)
    storage.ts                     ProjectRepository + JSON file impl
    defaults.ts                    Seed project + Zod validation schema
    useProject.ts                  Client hook: load + debounced autosave
    format.ts                      Currency/percent formatters
  components/
    fields.tsx                     Reusable inputs, save indicator
scripts/
    verify-calcs.ts                Math unit checks
    test-api.ts                    Storage/validation/analysis checks
```

### Financial model (summary)

- **Timeline:** months 1..constructionMonths are interest-only rehab (property
  not yet in service); the rest of the hold the property is rented and the loan
  amortizes (or stays interest-only if you choose).
- **Year 1** operating figures are prorated by the in-service fraction.
- **Income statement per year:** Gross Income − Vacancy = EGI; − OpEx = NOI
  (= EBITDA); − Depreciation = EBIT; − Interest = EBT; − Tax = Net Income.
- **Levered cash flow** = Net Income + Depreciation − Principal Paydown.
- **Exit** = projected/overridden sale price − selling costs − loan payoff.
- **Returns:** IRR (bisection over the levered cash-flow timeline), equity
  multiple, cash-on-cash, cap rate, DSCR.

### Documented assumptions (review these with a CPA)

- Depreciable basis = building share of purchase (purchase × (1 − land%)) +
  renovation. Closing costs are not capitalized into the basis here.
- A negative pre-tax year shows a tax *benefit* (shield). Whether rental losses
  are currently deductible depends on passive-activity rules and your income.
- Exit proceeds are shown **before** capital-gains tax and depreciation
  recapture.
- Appreciation is applied to the as-completed value (purchase + renovation)
  unless you set an explicit exit-value override.

---

## Deploying

### Hostinger VPS (file storage, simplest)

```bash
npm run build
npm run start        # behind a reverse proxy / PM2
```

The `data/` directory persists on the VPS disk. Back it up like any file.

### Vercel (push-to-deploy, needs Postgres)

1. Provision a managed Postgres database and set `DATABASE_URL`.
2. Implement `PostgresRepository` (same interface) and wire it into
   `getRepository()` via `STORAGE_DRIVER=postgres`.
3. `git push` — Vercel builds and deploys automatically.

See `.env.example` for the variables involved.
