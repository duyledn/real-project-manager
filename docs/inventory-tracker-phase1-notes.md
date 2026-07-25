# Inventory Tracker Phase 1 Notes

## What was built

- Postgres inventory schema with four item classes, acquisitions, a shared catalog cache, and an append-only ledger.
- Database triggers make the ledger the only path that can change `quantity_on_hand`; negative stock is rejected and item status follows the resulting balance.
- Pure largest-remainder cost allocation for collection buys and box breaks, plus grading-return basis calculation.
- Authenticated, owner-scoped inventory APIs for listing, creation, detail/edit, adjustments, acquisitions, catalog search, and dashboard summaries.
- Pokémon catalog lookup through pokemontcg.io and MTG lookup through Scryfall. Both are proxied server-side and cached for 24 hours.
- `/inventory`, `/inventory/intake`, and `/inventory/items/[id]` screens, plus the Inventory top-nav entry.
- Inventory unit/validation tests and a configurable synthetic seed script for the 10,000-row performance check.

## Environment variables

- `DATABASE_URL` is required for the inventory module.
- `POKEMONTCG_API_KEY` is optional; pokemontcg.io works keyless at lower rate limits.
- `CATALOG_USER_AGENT` is optional and identifies Scryfall requests.
- `INVENTORY_SEED_OWNER_ID` is optional and selects the owner for synthetic seed rows.

## Commands

```text
npm run test:inventory
npm run seed:inventory -- 10000
```

## Deviations from the Phase 1 brief

- No functional scope deviations.
- The optional seed owner defaults to `inventory-seed`; set `INVENTORY_SEED_OWNER_ID` to a real user ID when generated rows should appear in that user's UI.
