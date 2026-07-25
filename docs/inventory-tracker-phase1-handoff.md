# Phase 1 Handoff — Inventory Tracker: Core Ledger

**For:** Coding LLM
**From:** Orchestrator
**Spec:** `docs/inventory-tracker-proposal.md` (APPROVED 2026-07-24). Read it first; this document is the implementation brief for Phase 1 only.

---

## Mission

Build the core inventory ledger inside the existing `real-project-manager` Next.js app: Postgres schema, intake flows for four item classes (sealed, slabs, singles, bulk), a master inventory table built for 10k+ rows, and card-catalog autocomplete with market prices for **Pokémon and MTG**.

**Out of scope for Phase 1** (do not build): channel allocation pools, TCGplayer CSV bridge, eBay/Manapool APIs, reports suite, pricing rules. Design the schema so those bolt on later (the ledger and per-channel listing tables come in Phase 2).

## Repo conventions — follow these exactly

- Next.js App Router + TypeScript + Tailwind. New pages under `src/app/inventory/…`, API routes under `src/app/api/inventory/…`.
- Postgres via `sql()` from `@/lib/db` (Neon, tagged-template queries). Use `create table if not exists` migration-on-boot like `src/app/api/mail-tracker/route.ts`, but put DDL in one shared `src/lib/inventory/schema.ts` with an `ensureInventoryTables()` called by the routes.
- Auth: gate every API route with `getCurrentUser()` from `@/lib/session`; return 401 when null.
- Validate all route input defensively (Zod is available; the repo uses it in `src/lib/defaults.ts`).
- UI wraps in the existing `AppShell` / theme / i18n patterns — copy the structure of `src/app/mail-tracker/page.tsx` and `src/app/subcontractors/page.tsx`. Add "Inventory" to the top nav (`src/components/TopNav.tsx`).
- **Do not modify existing modules** beyond the nav entry.

## Data model (Postgres)

`inventory_items`
- `id` uuid pk, `owner_id` text (user id), `class` enum: `sealed | slab | single | bulk`, `game` enum: `pokemon | mtg | other`
- `sku` text unique per owner (generate: class prefix + short id), `name` text, `set_code` text, `collector_number` text, `finish` text (normal/holo/reverse/etched…), `condition` enum: `NM | LP | MP | HP | DMG | null` (null for sealed/slabs/bulk), `language` text default `en`
- Slab fields: `grader` text, `cert_number` text, `grade` text — required when class = slab; slabs always quantity 1
- Sealed fields: `upc` text, `product_type` text
- Bulk fields: `lot_type` text, `estimated_count` int
- `catalog_ref` jsonb (provider id, image url, cached market price + fetched_at)
- `quantity_on_hand` int not null default 0 (denormalized; must always equal ledger sum — enforce in code)
- `unit_cost_cents` int (allocated cost basis), `status` enum: `active | sold_out | archived`, `notes` text, `created_at`, `updated_at`

`inventory_ledger` (append-only; no updates or deletes ever)
- `id` uuid pk, `item_id` fk, `owner_id`, `type` enum: `intake | sale | return | break_consume | break_produce | grade_out | grade_in | adjustment`
- `quantity_delta` int (signed), `unit_cost_cents` int, `acquisition_id` fk nullable, `note` text, `created_at`

`acquisitions` (intake events)
- `id` uuid pk, `owner_id`, `type` enum: `distributor | collection_buy | box_break | grading_return | other`
- `total_cost_cents` int, `source` text, `date` date, `notes`, `created_at`

Indexes: `(owner_id, class)`, `(owner_id, game, set_code)`, trigram or `ILIKE`-friendly index on `name`, `(item_id)` on ledger.

## Cost-basis allocation (implement precisely — this is the heart)

- **Distributor / direct**: unit cost as entered.
- **Collection buy**: user enters total paid, then itemizes extracted items; each gets `market_price` from catalog lookup (manual override allowed). Allocate: `item_cost = total_paid × (item_market_value / Σ market_values)`, integer cents, largest-remainder rounding so the sum equals total paid exactly. Remainder items go into one bulk lot whose basis is the unallocated residue (if user assigns a residue share).
- **Box break**: consumes N sealed units (`break_consume` ledger entry), produces singles/bulk (`break_produce`) with the consumed cost allocated by market value, same rounding rule.
- **Grading return**: converts a single (qty −1, `grade_out`) into a new slab item (`grade_in`); slab basis = single's basis + grading fee + shipping share.

Write these as pure functions in `src/lib/inventory/costBasis.ts` — no I/O — so they're unit-testable.

## Catalog providers

Interface `CatalogProvider` in `src/lib/inventory/catalog.ts`:

```ts
searchCards(game, query): Promise<CatalogCard[]>   // name autocomplete, ≥3 chars, debounced client-side
getCard(game, providerId): Promise<CatalogCard>    // includes image url + market price(s)
```

- Pokémon: **pokemontcg.io** (free; includes TCGplayer/Cardmarket price averages). API key via `POKEMONTCG_API_KEY` env (works keyless at lower rate limits — handle both).
- MTG: **Scryfall** (free, no key; respect their required 50–100ms delay between requests and set a proper User-Agent).
- Cache responses in a `catalog_cache` table (key: provider+id, jsonb, fetched_at) with 24h TTL to respect rate limits.
- All fetches server-side (API routes proxy), never from the browser.

## API routes

- `GET/POST /api/inventory/items` — list (server-side pagination `?page&pageSize≤100`, filters: `class, game, set, condition, status, q` full-text on name/sku/cert) and create.
- `GET/PATCH /api/inventory/items/[id]` — detail (includes ledger history) and edit of non-quantity fields. Quantity changes ONLY via ledger endpoints.
- `POST /api/inventory/acquisitions` — one endpoint, body discriminated by intake `type`, performs allocation + item creation + ledger entries **in one transaction**.
- `POST /api/inventory/items/[id]/adjust` — manual adjustment with required note.
- `GET /api/inventory/catalog/search?game=&q=` — proxy to CatalogProvider.
- `GET /api/inventory/summary` — dashboard counts/values.

## UI (Phase 1 screens)

1. `/inventory` — dashboard header (total items, cost value, market value by class) + master table: server-paginated, sortable, filter bar, row expand → ledger history. Must stay responsive at 10k rows (no client-side full loads).
2. `/inventory/intake` — pick flow: Distributor / Collection buy / Box break / Grading return. Each is a guided form; singles rows use catalog autocomplete (game selector → name search → set/number/finish pick → image + market price autofill). Collection buy shows live allocation preview before commit.
3. Item detail drawer or page — all fields, editable notes/price basis, ledger table, adjustment action.

## Acceptance criteria

1. `npm run build` passes; existing tests (`npm run test:calcs`, `npm run test:api`) still pass untouched.
2. New script `scripts/test-inventory.ts` (`npm run test:inventory`): unit tests for cost allocation (incl. rounding-sums-exactly property, collection buy with 3+ items, box break residue) and ledger invariant (`quantity_on_hand == Σ deltas`) + route validation rejects (negative quantities, slab with qty ≠ 1, missing cert on slab).
3. Every quantity change produces a ledger row; direct writes to `quantity_on_hand` outside the ledger path do not exist in the code.
4. All inventory routes 401 without a session; items are scoped by `owner_id` (no cross-user reads).
5. Catalog autocomplete works for both games with caching (verify a repeat search hits `catalog_cache`).
6. A collection buy of $500 across 4 singles + bulk residue allocates to exact total, visible in the preview and in the committed ledger.
7. Master table paginates server-side; seed script (`scripts/seed-inventory.ts`) can insert 10k synthetic items for a manual perf sanity check.

## Deliverables checklist

- [ ] `src/lib/inventory/{schema,types,costBasis,catalog,repo}.ts`
- [ ] API routes listed above
- [ ] `/inventory` + `/inventory/intake` pages, nav entry
- [ ] `scripts/test-inventory.ts`, `scripts/seed-inventory.ts`, npm scripts
- [ ] Short `docs/inventory-tracker-phase1-notes.md`: what was built, env vars added, any deviations from this brief (deviations must be listed — the Orchestrator audits against this document)
