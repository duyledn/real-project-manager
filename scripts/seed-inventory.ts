import { sql } from "../src/lib/db";
import { ensureInventoryTables } from "../src/lib/inventory/schema";

const requested = Number(process.argv[2] ?? "10000");
const count = Number.isInteger(requested) && requested > 0 ? requested : 10_000;
const ownerId = process.env.INVENTORY_SEED_OWNER_ID ?? "inventory-seed";
const classes = ["sealed", "slab", "single", "bulk"] as const;
const games = ["pokemon", "mtg"] as const;
const batchSize = 200;

await ensureInventoryTables();
const db = sql();

for (let start = 0; start < count; start += batchSize) {
  const queries: ReturnType<typeof db>[] = [];
  const end = Math.min(count, start + batchSize);
  for (let index = start; index < end; index += 1) {
    const id = crypto.randomUUID();
    const itemClass = classes[index % classes.length];
    const game = games[index % games.length];
    const quantity = itemClass === "slab" ? 1 : (index % 20) + 1;
    const unitCost = 50 + (index * 97) % 25_000;
    const grader = itemClass === "slab" ? "PSA" : null;
    const cert = itemClass === "slab" ? `SEED-${index}` : null;
    const grade = itemClass === "slab" ? String((index % 4) + 7) : null;
    const condition = itemClass === "single" ? ["NM", "LP", "MP"][index % 3] : null;
    const sku = `SEED-${itemClass.slice(0, 3).toUpperCase()}-${id.replaceAll("-", "").slice(0, 10)}`;
    queries.push(db`insert into inventory_items (
      id, owner_id, class, game, sku, name, set_code, collector_number, finish,
      condition, language, grader, cert_number, grade, upc, product_type,
      lot_type, estimated_count, catalog_ref, unit_cost_cents, notes
    ) values (
      ${id}::uuid, ${ownerId}, ${itemClass}::inventory_class, ${game}::inventory_game,
      ${sku}, ${`Synthetic ${itemClass} ${index + 1}`}, ${`S${index % 200}`},
      ${String(index % 300)}, 'normal', ${condition}::inventory_condition, 'en',
      ${grader}, ${cert}, ${grade}, ${itemClass === "sealed" ? `000${index}` : null},
      ${itemClass === "sealed" ? "Booster box" : null},
      ${itemClass === "bulk" ? "Mixed cards" : null},
      ${itemClass === "bulk" ? quantity * 100 : null},
      ${JSON.stringify({
        provider: game === "pokemon" ? "pokemontcg" : "scryfall",
        id: `synthetic-${index}`,
        imageUrl: "",
        marketPriceCents: Math.round(unitCost * 1.35),
        fetchedAt: new Date().toISOString(),
      })}::jsonb,
      ${unitCost}, 'Synthetic performance seed'
    )`);
    queries.push(db`insert into inventory_ledger (
      id, item_id, owner_id, type, quantity_delta, unit_cost_cents, note
    ) values (
      ${crypto.randomUUID()}::uuid, ${id}::uuid, ${ownerId}, 'intake',
      ${quantity}, ${unitCost}, 'Synthetic performance seed'
    )`);
  }
  await db.transaction(queries);
  console.log(`Seeded ${end.toLocaleString()} / ${count.toLocaleString()}`);
}

console.log(`Seed complete for owner "${ownerId}".`);
