# Inventory Tracker — Workflow & Functionality Proposal

**Status:** APPROVED by Duy, 2026-07-24
**Date:** 2026-07-24

**Approved decisions (§9):** (1) TCGplayer CSV bridge accepted. (2) MTG inventory confirmed in scope — MTG is a first-class game (Scryfall catalog), Manapool stays in scope. (3) Split allocation to start; shared-pool deferred to Phase 3. (4) Free catalog sources to start. (5) Phase order as proposed.
**Module:** New top-level app inside `real-project-manager` (same pattern as Mail Tracker / Subcontractors)

---

## 1. What this is

A single source of truth for your Pokémon / card store inventory — sealed product, graded slabs, singles, and bulk — with channel-level control over what's listed on TCGplayer, eBay, and Manapool. The app tracks every item from intake to sale, allocates quantities across marketplaces, catches oversells, and reports profit per item and per channel.

Your requirements, confirmed:

- API sync from day one (see the caveat in §2 — TCGplayer forces a CSV bridge)
- Card catalog + market price lookup to minimize data entry
- Built for 10,000+ items
- V1 scope: listing control per marketplace, profit tracking, intake workflow

---

## 2. Marketplace reality check (research findings)

This is the part that changes the plan, so it goes first.

| Channel | API status | Sync strategy |
|---|---|---|
| **eBay** | Open developer program. Sell APIs (Inventory, Fulfillment) support full listing CRUD and order pull. | **True API sync** — quantities, prices, and sold orders flow automatically. |
| **Manapool** | Open seller API (`manapool.com/api/docs/v1`) for inventory and orders. **But Manapool is Magic: The Gathering only** — no Pokémon. | **True API sync** for whatever MTG inventory you sell there. |
| **TCGplayer** | API is **closed to new developers** (eBay acquired TCGplayer; new API applications stopped in late 2024 and remain closed). | **CSV bridge**: the app generates TCGplayer-format CSVs for upload, and imports your Seller Portal export to reconcile quantities and sales. One manual step per sync cycle. |

Two things I need you to confirm in §9: (a) accepting the CSV bridge for TCGplayer, and (b) whether Manapool means you also carry MTG inventory — if so, the app supports MTG cards as a first-class game alongside Pokémon.

**Card catalog & pricing:** no single free API does everything. Proposed combo: **TCGdex or pokemontcg.io** (free) for Pokémon card catalog + images and autocomplete at intake, plus market prices (pokemontcg.io includes TCGplayer/Cardmarket price averages). Scryfall (free) covers MTG catalog + prices if Manapool/MTG is in scope. A paid tier (Scrydex, JustTCG, PriceCharting) can be swapped in later behind the same interface if you want fresher prices or slab (graded) comps.

---

## 3. Inventory model

Everything is an **Inventory Item** belonging to one of four classes. Shared fields: SKU, acquisition cost, acquisition date/source, status, notes, photos. Class-specific fields:

| Class | Identity | Quantity model | Key fields |
|---|---|---|---|
| **Sealed** | Product (set, type: booster box / ETB / tin…) | Quantity per SKU | UPC, print run/wave, MSRP |
| **Slabs** | One unique item per cert | Always qty 1, serialized | Grader (PSA/BGS/CGC), cert #, grade, card ref |
| **Singles** | Card (set + number + finish) + condition | Quantity per SKU | Catalog ref, condition (NM/LP/MP/HP/DMG), language, 1st ed./holo variants |
| **Bulk** | Lot | Count or weight | Lot type (commons/holos/energy), est. count, per-lot cost basis |

**Cost basis rules** (drives profit tracking):

- Direct purchase → cost as entered.
- **Collection buy / lot**: total paid is allocated across extracted items proportionally to market value at intake (standard for card stores). Remainder rolls into a bulk lot.
- **Box break**: sealed item is consumed; its cost allocates across pulled singles by market value; residue becomes bulk.
- **Grading submission**: raw single converts to a slab; grading + shipping fees add to that item's basis.

Every quantity change is an append-only **ledger entry** (intake, list, sale, return, break, grade-out/in, adjustment) — so any count can be audited back to events, and shrink shows up as explicit adjustments.

---

## 4. Channel control model

Per item, quantity is split into **pools**:

```
On Hand = Unlisted + Allocated(TCGplayer) + Allocated(eBay) + Allocated(Manapool) + Reserved(pending orders)
```

Two allocation modes, chosen per item or per rule:

- **Split allocation** — hard quantities per channel; a sale only decrements that channel's pool.
- **Shared pool** — the same copies are listed on multiple channels; a sale anywhere triggers immediate delist/decrement pushes on the others. Higher exposure, oversell risk if a sync lags — the app flags any item where `sum(listed) > on hand` on its **Oversell alert** panel.

Per-channel listing record: listed qty, price, fees model, listing ID/URL, last-synced timestamp, sync health.

---

## 5. The workflow

**Intake → Catalog → Price → Allocate → List → Sell → Reconcile → Report**

1. **Intake** — structured entry flows for: distributor order (sealed), collection buy (guided triage: pull singles worth listing, weigh the rest as bulk, auto-allocate cost), box break, grading submission out/in. Catalog autocomplete (type "Charizard 151" → pick card, set, number; image and market price auto-fill). Barcode scan for sealed UPCs.
2. **Price** — app shows market price next to your cost and margin at list price. You set the price; optional rules like "floor = 110% of cost," "match TCG market −2%." No auto-repricing without your approval in v1.
3. **Allocate & list** — pick channels per item or apply defaults by class (e.g., slabs → eBay only; singles > $5 → TCGplayer + eBay shared pool; MTG → Manapool). eBay/Manapool push via API; TCGplayer generates an upload CSV.
4. **Sell & reconcile** — eBay/Manapool orders pull automatically and decrement pools; TCGplayer sales reconcile from the Seller Portal CSV import (daily habit, ~2 minutes). Shared-pool sales fan out delists to other channels. Discrepancies land in a **reconciliation queue**, never silently overwritten.
5. **Report** — realized profit per sale (price − allocated cost − channel fees − shipping estimate), by item/class/channel/period; unrealized (market vs cost) on current holdings; sell-through and aging (dead stock > N days); channel fee comparison for the same item class.

---

## 6. App functionality (screens)

- **Dashboard** — inventory value (cost & market), on-hand counts by class, oversell alerts, sync health per channel, reconciliation queue size, 30-day realized profit.
- **Inventory** — the master table: server-side search/filter/sort/pagination (built for 10k+), filters by class/set/condition/channel/status, bulk actions (allocate, price, export CSV). Row expands to ledger history + channel listings.
- **Intake** — the four guided flows from §5.1.
- **Channels** — per-marketplace view: what's listed, price drift vs market, sync status, TCGplayer CSV generate/import buttons, credentials management.
- **Sales** — unified order list across channels; each sale shows fee breakdown and realized profit.
- **Reports** — profit, aging, sell-through, channel comparison; CSV export.
- **Settings** — fee schedules per channel (editable, since fees change), allocation default rules, price-source config.

---

## 7. Architecture (fits the existing repo)

- New route group `src/app/inventory/…` + `src/app/api/inventory/…`, same AppShell/auth/theme as Mail Tracker — no changes to existing modules.
- **Storage: Postgres from day one** for this module (10k+ items rules out the JSON store). The repo already has Neon wired via `src/lib/db.ts` + `STORAGE_DRIVER`; inventory tables ride the same connection. Repository-interface pattern kept, consistent with the rest of the app.
- Integrations behind interfaces: `ChannelAdapter` (eBay API, Manapool API, TCGplayer CSV all implement the same contract — a future TCGplayer API key drops in without redesign) and `CatalogProvider` (TCGdex/pokemontcg.io/Scryfall now, paid source later).
- eBay OAuth tokens and API keys in env vars; never in the database in plaintext.
- Sync engine: scheduled pull (orders/quantities) + event push (on sale in shared pool). All mutations go through the ledger.

---

## 8. Phased delivery

| Phase | Delivers | You get |
|---|---|---|
| **1 — Core ledger** | Data model, Postgres schema, inventory table UI, manual intake for all 4 classes, catalog autocomplete + market price | Full inventory visibility, profit-on-paper |
| **2 — Channel control** | Allocation pools, channel listings, TCGplayer CSV generate/import + reconciliation queue, oversell alerts | Control over all three channels (TCGplayer manual-bridge) |
| **3 — Live sync** | eBay API integration (listings + orders), Manapool API, shared-pool fan-out | True automation on eBay/Manapool |
| **4 — Intelligence** | Reports suite, aging/dead-stock, pricing rules, collection-buy cost allocator refinements | Profit optimization |

Each phase ends with a working, testable increment. After your approval I'll write the Phase 1 handoff prompt for the Coding LLM, then audit its implementation before Phase 2 begins.

---

## 9. Decisions needed from you

1. **TCGplayer CSV bridge** — acceptable given their API is closed? (Alternative: paid third-party middleware, adds cost + dependency.)
2. **Manapool / MTG** — do you carry MTG inventory? If yes, MTG becomes a first-class game (Scryfall catalog). If no, Manapool drops out of scope.
3. **Allocation default** — start with split allocation (safe) and add shared-pool in Phase 3, or shared-pool from Phase 2?
4. **Catalog source** — start free (TCGdex/pokemontcg.io) and upgrade later if price freshness disappoints?
5. **Phase order** — as proposed, or pull eBay API sync (Phase 3) ahead of TCGplayer CSV (Phase 2)?

---

*Research sources: TCGplayer API status ([CardGrader](https://cardgrader.ai/blog/tcgplayer-api-alternatives), [TCG API](https://tcgapi.dev/blog/tcgplayer-api-alternative/)); [Manapool seller info](https://manapool.com/seller-info) and [API docs](https://manapool.com/api/docs/v1); Pokémon catalog/pricing API landscape ([ScrapingBee](https://www.scrapingbee.com/blog/pokemon-card-api/), [CardGrader](https://cardgrader.ai/blog/pokemon-card-api)).*
