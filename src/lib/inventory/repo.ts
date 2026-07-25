import { sql } from "@/lib/db";
import { ensureInventoryTables } from "./schema";
import {
  allocateBoxBreak,
  allocateCollectionBuy,
  gradingReturnBasis,
} from "./costBasis";
import type {
  AcquisitionInput,
  InventoryItem,
  InventoryLedgerEntry,
  ItemCreateInput,
  ItemPatchInput,
} from "./types";

type DbRow = Record<string, unknown>;

function iso(value: unknown): string {
  return value instanceof Date ? value.toISOString() : String(value ?? "");
}

function mapItem(row: DbRow): InventoryItem {
  return {
    id: String(row.id),
    ownerId: String(row.owner_id),
    class: row.class as InventoryItem["class"],
    game: row.game as InventoryItem["game"],
    sku: String(row.sku),
    name: String(row.name),
    setCode: String(row.set_code ?? ""),
    collectorNumber: String(row.collector_number ?? ""),
    finish: String(row.finish ?? ""),
    condition: (row.condition ?? null) as InventoryItem["condition"],
    language: String(row.language ?? "en"),
    grader: row.grader === null ? null : String(row.grader),
    certNumber: row.cert_number === null ? null : String(row.cert_number),
    grade: row.grade === null ? null : String(row.grade),
    upc: row.upc === null ? null : String(row.upc),
    productType: row.product_type === null ? null : String(row.product_type),
    lotType: row.lot_type === null ? null : String(row.lot_type),
    estimatedCount: row.estimated_count === null ? null : Number(row.estimated_count),
    catalogRef: (row.catalog_ref ?? null) as InventoryItem["catalogRef"],
    quantityOnHand: Number(row.quantity_on_hand),
    unitCostCents: Number(row.unit_cost_cents),
    status: row.status as InventoryItem["status"],
    notes: String(row.notes ?? ""),
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  };
}

function mapLedger(row: DbRow): InventoryLedgerEntry {
  return {
    id: String(row.id),
    itemId: String(row.item_id),
    ownerId: String(row.owner_id),
    type: row.type as InventoryLedgerEntry["type"],
    quantityDelta: Number(row.quantity_delta),
    unitCostCents: Number(row.unit_cost_cents),
    acquisitionId: row.acquisition_id === null ? null : String(row.acquisition_id),
    note: String(row.note ?? ""),
    createdAt: iso(row.created_at),
  };
}

function itemFields(item: ItemCreateInput) {
  return {
    grader: item.class === "slab" ? item.grader : null,
    certNumber: item.class === "slab" ? item.certNumber : null,
    grade: item.class === "slab" ? item.grade : null,
    upc: item.class === "sealed" ? item.upc : null,
    productType: item.class === "sealed" ? item.productType : null,
    lotType: item.class === "bulk" ? item.lotType : null,
    estimatedCount: item.class === "bulk" ? item.estimatedCount : null,
  };
}

function skuFor(item: ItemCreateInput, id: string): string {
  const prefix = { sealed: "SEA", slab: "SLB", single: "SIN", bulk: "BLK" }[item.class];
  return `${prefix}-${id.replaceAll("-", "").slice(0, 10).toUpperCase()}`;
}

function itemInsertQuery(
  tx: ReturnType<typeof sql>,
  ownerId: string,
  item: ItemCreateInput,
  id: string,
  unitCostCents: number,
) {
  const classFields = itemFields(item);
  return tx`insert into inventory_items (
      id, owner_id, class, game, sku, name, set_code, collector_number, finish,
      condition, language, grader, cert_number, grade, upc, product_type,
      lot_type, estimated_count, catalog_ref, unit_cost_cents, notes
    ) values (
      ${id}::uuid, ${ownerId}, ${item.class}::inventory_class, ${item.game}::inventory_game,
      ${skuFor(item, id)}, ${item.name}, ${item.setCode}, ${item.collectorNumber},
      ${item.finish}, ${item.condition}::inventory_condition, ${item.language},
      ${classFields.grader}, ${classFields.certNumber}, ${classFields.grade},
      ${classFields.upc}, ${classFields.productType}, ${classFields.lotType},
      ${classFields.estimatedCount}, ${item.catalogRef ? JSON.stringify(item.catalogRef) : null}::jsonb,
      ${unitCostCents}, ${item.notes}
    )`;
}

function ledgerQueriesForTotal(
  tx: ReturnType<typeof sql>,
  values: {
    itemId: string;
    ownerId: string;
    type: InventoryLedgerEntry["type"];
    quantity: number;
    totalCostCents: number;
    acquisitionId: string | null;
    note: string;
  },
) {
  const base = Math.floor(values.totalCostCents / values.quantity);
  const higherCostUnits = values.totalCostCents - base * values.quantity;
  const rows = [
    { quantity: values.quantity - higherCostUnits, unitCostCents: base },
    { quantity: higherCostUnits, unitCostCents: base + 1 },
  ].filter((row) => row.quantity > 0);
  return rows.map((row) => tx`insert into inventory_ledger (
      id, item_id, owner_id, type, quantity_delta, unit_cost_cents, acquisition_id, note
    ) values (
      ${crypto.randomUUID()}::uuid, ${values.itemId}::uuid, ${values.ownerId},
      ${values.type}::inventory_ledger_type, ${row.quantity}, ${row.unitCostCents},
      ${values.acquisitionId}::uuid, ${values.note}
    )`);
}

export type ItemListOptions = {
  page: number;
  pageSize: number;
  class?: string;
  game?: string;
  set?: string;
  condition?: string;
  status?: string;
  q?: string;
  sortBy?: string;
  sortDir?: string;
};

export async function listItems(ownerId: string, options: ItemListOptions) {
  await ensureInventoryTables();
  const where = ["owner_id = $1"];
  const params: unknown[] = [ownerId];
  const add = (sqlClause: string, value: unknown) => {
    params.push(value);
    where.push(sqlClause.replace("?", `$${params.length}`));
  };
  if (options.class) add("class = ?::inventory_class", options.class);
  if (options.game) add("game = ?::inventory_game", options.game);
  if (options.set) add("set_code = ?", options.set);
  if (options.condition) add("condition = ?::inventory_condition", options.condition);
  if (options.status) add("status = ?::inventory_status", options.status);
  if (options.q) {
    params.push(`%${options.q}%`);
    where.push(
      `(name ilike $${params.length} or sku ilike $${params.length} or cert_number ilike $${params.length})`,
    );
  }
  const sortColumns: Record<string, string> = {
    name: "name",
    sku: "sku",
    class: "class",
    game: "game",
    quantity: "quantity_on_hand",
    cost: "unit_cost_cents",
    updated: "updated_at",
  };
  const sort = sortColumns[options.sortBy ?? ""] ?? "updated_at";
  const direction = options.sortDir === "asc" ? "asc" : "desc";
  const whereSql = where.join(" and ");
  const countRows = (await sql().query(`select count(*)::int as count from inventory_items where ${whereSql}`, params)) as DbRow[];
  params.push(options.pageSize);
  const limitPosition = params.length;
  params.push((options.page - 1) * options.pageSize);
  const offsetPosition = params.length;
  const rows = (await sql().query(
    `select * from inventory_items where ${whereSql}
     order by ${sort} ${direction}, id asc limit $${limitPosition} offset $${offsetPosition}`,
    params,
  )) as DbRow[];
  return {
    items: rows.map(mapItem),
    page: options.page,
    pageSize: options.pageSize,
    total: Number(countRows[0]?.count ?? 0),
  };
}

export async function getItem(ownerId: string, id: string) {
  await ensureInventoryTables();
  const rows = (await sql()`select * from inventory_items
    where id = ${id}::uuid and owner_id = ${ownerId}`) as DbRow[];
  if (!rows[0]) return null;
  const ledger = (await sql()`select * from inventory_ledger
    where item_id = ${id}::uuid and owner_id = ${ownerId}
    order by created_at desc, id desc`) as DbRow[];
  return { item: mapItem(rows[0]), ledger: ledger.map(mapLedger) };
}

export async function createItem(ownerId: string, item: ItemCreateInput) {
  await ensureInventoryTables();
  const id = crypto.randomUUID();
  const db = sql();
  await db.transaction([
    itemInsertQuery(db, ownerId, item, id, item.unitCostCents),
    ...ledgerQueriesForTotal(db, {
      itemId: id,
      ownerId,
      type: "intake",
      quantity: item.quantity,
      totalCostCents: item.unitCostCents * item.quantity,
      acquisitionId: null,
      note: "Direct inventory intake",
    }),
  ]);
  return (await getItem(ownerId, id))!.item;
}

export async function patchItem(ownerId: string, id: string, patch: ItemPatchInput) {
  await ensureInventoryTables();
  const columns: Record<string, string> = {
    name: "name",
    game: "game",
    setCode: "set_code",
    collectorNumber: "collector_number",
    finish: "finish",
    condition: "condition",
    language: "language",
    grader: "grader",
    certNumber: "cert_number",
    grade: "grade",
    upc: "upc",
    productType: "product_type",
    lotType: "lot_type",
    estimatedCount: "estimated_count",
    catalogRef: "catalog_ref",
    unitCostCents: "unit_cost_cents",
    status: "status",
    notes: "notes",
  };
  const assignments: string[] = [];
  const params: unknown[] = [];
  for (const [key, value] of Object.entries(patch)) {
    const column = columns[key];
    if (!column) continue;
    params.push(key === "catalogRef" && value ? JSON.stringify(value) : value);
    const cast =
      key === "game" ? "::inventory_game" :
      key === "condition" ? "::inventory_condition" :
      key === "status" ? "::inventory_status" :
      key === "catalogRef" ? "::jsonb" : "";
    assignments.push(`${column} = $${params.length}${cast}`);
  }
  if (assignments.length === 0) return (await getItem(ownerId, id))?.item ?? null;
  params.push(id, ownerId);
  const rows = (await sql().query(
    `update inventory_items set ${assignments.join(", ")}, updated_at = now()
     where id = $${params.length - 1}::uuid and owner_id = $${params.length}
     returning *`,
    params,
  )) as DbRow[];
  return rows[0] ? mapItem(rows[0]) : null;
}

export async function adjustItem(
  ownerId: string,
  id: string,
  quantityDelta: number,
  note: string,
) {
  await ensureInventoryTables();
  const existing = await getItem(ownerId, id);
  if (!existing) return null;
  await sql()`insert into inventory_ledger (
    id, item_id, owner_id, type, quantity_delta, unit_cost_cents, note
  ) values (
    ${crypto.randomUUID()}::uuid, ${id}::uuid, ${ownerId}, 'adjustment',
    ${quantityDelta}, ${existing.item.unitCostCents}, ${note}
  )`;
  return (await getItem(ownerId, id))!;
}

function acquisitionRow(
  db: ReturnType<typeof sql>,
  values: {
    id: string;
    ownerId: string;
    type: AcquisitionInput["type"];
    totalCostCents: number;
    source: string;
    date: string;
    notes: string;
  },
) {
  return db`insert into acquisitions (
    id, owner_id, type, total_cost_cents, source, date, notes
  ) values (
    ${values.id}::uuid, ${values.ownerId}, ${values.type}::acquisition_type,
    ${values.totalCostCents}, ${values.source}, ${values.date}::date, ${values.notes}
  )`;
}

export async function createAcquisition(ownerId: string, input: AcquisitionInput) {
  await ensureInventoryTables();
  const db = sql();
  const acquisitionId = crypto.randomUUID();
  const createdItemIds: string[] = [];
  const queries: ReturnType<typeof db>[] = [];

  if (input.type === "distributor") {
    const total = input.items.reduce(
      (sum, item) => sum + item.unitCostCents * item.quantity,
      0,
    );
    queries.push(acquisitionRow(db, {
      id: acquisitionId,
      ownerId,
      type: input.type,
      totalCostCents: total,
      source: input.source,
      date: input.date,
      notes: input.notes,
    }));
    for (const item of input.items) {
      const id = crypto.randomUUID();
      createdItemIds.push(id);
      queries.push(itemInsertQuery(db, ownerId, item, id, item.unitCostCents));
      queries.push(...ledgerQueriesForTotal(db, {
        itemId: id,
        ownerId,
        type: "intake",
        quantity: item.quantity,
        totalCostCents: item.unitCostCents * item.quantity,
        acquisitionId,
        note: `Distributor intake${input.source ? ` from ${input.source}` : ""}`,
      }));
    }
  } else if (input.type === "collection_buy") {
    const keyed = input.items.map((row) => ({
      id: crypto.randomUUID(),
      marketValueCents: row.marketValueCents,
    }));
    const allocation = allocateCollectionBuy(
      input.totalCostCents,
      keyed,
      input.residueCostCents,
    );
    queries.push(acquisitionRow(db, {
      id: acquisitionId,
      ownerId,
      type: input.type,
      totalCostCents: input.totalCostCents,
      source: input.source,
      date: input.date,
      notes: input.notes,
    }));
    input.items.forEach((row, index) => {
      const id = keyed[index].id;
      const totalCost = allocation.items[index].costCents;
      createdItemIds.push(id);
      queries.push(itemInsertQuery(
        db,
        ownerId,
        row.item,
        id,
        Math.round(totalCost / row.item.quantity),
      ));
      queries.push(...ledgerQueriesForTotal(db, {
        itemId: id,
        ownerId,
        type: "intake",
        quantity: row.item.quantity,
        totalCostCents: totalCost,
        acquisitionId,
        note: "Collection buy allocation",
      }));
    });
    if (input.bulkResidue && input.residueCostCents > 0) {
      const id = crypto.randomUUID();
      createdItemIds.push(id);
      queries.push(itemInsertQuery(
        db,
        ownerId,
        input.bulkResidue,
        id,
        Math.round(input.residueCostCents / input.bulkResidue.quantity),
      ));
      queries.push(...ledgerQueriesForTotal(db, {
        itemId: id,
        ownerId,
        type: "intake",
        quantity: input.bulkResidue.quantity,
        totalCostCents: input.residueCostCents,
        acquisitionId,
        note: "Collection buy bulk residue",
      }));
    }
  } else if (input.type === "box_break") {
    const source = await getItem(ownerId, input.sourceItemId);
    if (!source || source.item.class !== "sealed") {
      throw new Error("Sealed source item not found");
    }
    if (source.item.quantityOnHand < input.quantity) {
      throw new Error("Not enough sealed quantity for this break");
    }
    const total = source.item.unitCostCents * input.quantity;
    const keyed = input.outputs.map((row) => ({
      id: crypto.randomUUID(),
      marketValueCents: row.marketValueCents,
    }));
    const allocation = allocateBoxBreak(total, keyed);
    queries.push(acquisitionRow(db, {
      id: acquisitionId,
      ownerId,
      type: input.type,
      totalCostCents: total,
      source: input.source,
      date: input.date,
      notes: input.notes,
    }));
    queries.push(db`insert into inventory_ledger (
      id, item_id, owner_id, type, quantity_delta, unit_cost_cents, acquisition_id, note
    ) values (
      ${crypto.randomUUID()}::uuid, ${source.item.id}::uuid, ${ownerId},
      'break_consume', ${-input.quantity}, ${source.item.unitCostCents},
      ${acquisitionId}::uuid, 'Consumed for box break'
    )`);
    input.outputs.forEach((row, index) => {
      const id = keyed[index].id;
      const totalCost = allocation[index].costCents;
      createdItemIds.push(id);
      queries.push(itemInsertQuery(
        db,
        ownerId,
        row.item,
        id,
        Math.round(totalCost / row.item.quantity),
      ));
      queries.push(...ledgerQueriesForTotal(db, {
        itemId: id,
        ownerId,
        type: "break_produce",
        quantity: row.item.quantity,
        totalCostCents: totalCost,
        acquisitionId,
        note: "Produced by box break",
      }));
    });
  } else {
    const source = await getItem(ownerId, input.sourceItemId);
    if (!source || source.item.class !== "single") {
      throw new Error("Raw single source item not found");
    }
    if (source.item.quantityOnHand < 1) {
      throw new Error("Raw single is out of stock");
    }
    const slabBasis = gradingReturnBasis(
      source.item.unitCostCents,
      input.gradingFeeCents,
      input.shippingShareCents,
    );
    const slabId = crypto.randomUUID();
    createdItemIds.push(slabId);
    queries.push(acquisitionRow(db, {
      id: acquisitionId,
      ownerId,
      type: input.type,
      totalCostCents: input.gradingFeeCents + input.shippingShareCents,
      source: input.source,
      date: input.date,
      notes: input.notes,
    }));
    queries.push(db`insert into inventory_ledger (
      id, item_id, owner_id, type, quantity_delta, unit_cost_cents, acquisition_id, note
    ) values (
      ${crypto.randomUUID()}::uuid, ${source.item.id}::uuid, ${ownerId},
      'grade_out', -1, ${source.item.unitCostCents}, ${acquisitionId}::uuid,
      'Sent raw single to grading'
    )`);
    queries.push(itemInsertQuery(db, ownerId, input.slab, slabId, slabBasis));
    queries.push(...ledgerQueriesForTotal(db, {
      itemId: slabId,
      ownerId,
      type: "grade_in",
      quantity: 1,
      totalCostCents: slabBasis,
      acquisitionId,
      note: "Returned from grading",
    }));
  }

  await db.transaction(queries);
  const created = await Promise.all(createdItemIds.map((id) => getItem(ownerId, id)));
  return {
    acquisitionId,
    items: created.flatMap((entry) => (entry ? [entry.item] : [])),
  };
}

export async function inventorySummary(ownerId: string) {
  await ensureInventoryTables();
  const rows = (await sql()`select
      class,
      count(*)::int as sku_count,
      coalesce(sum(quantity_on_hand), 0)::int as quantity,
      coalesce(sum(quantity_on_hand * unit_cost_cents), 0)::bigint as cost_value_cents,
      coalesce(sum(
        quantity_on_hand *
        case when jsonb_typeof(catalog_ref->'marketPriceCents') = 'number'
          then (catalog_ref->>'marketPriceCents')::numeric else 0 end
      ), 0)::bigint as market_value_cents
    from inventory_items
    where owner_id = ${ownerId} and status <> 'archived'
    group by class
    order by class`) as DbRow[];
  const byClass = rows.map((row) => ({
    class: String(row.class),
    skuCount: Number(row.sku_count),
    quantity: Number(row.quantity),
    costValueCents: Number(row.cost_value_cents),
    marketValueCents: Number(row.market_value_cents),
  }));
  return {
    byClass,
    totals: byClass.reduce(
      (sum, row) => ({
        skuCount: sum.skuCount + row.skuCount,
        quantity: sum.quantity + row.quantity,
        costValueCents: sum.costValueCents + row.costValueCents,
        marketValueCents: sum.marketValueCents + row.marketValueCents,
      }),
      { skuCount: 0, quantity: 0, costValueCents: 0, marketValueCents: 0 },
    ),
  };
}

export async function getCatalogCache(provider: string, key: string) {
  await ensureInventoryTables();
  const rows = (await sql()`select data, fetched_at from catalog_cache
    where provider = ${provider} and cache_key = ${key}
      and fetched_at > now() - interval '24 hours'`) as DbRow[];
  return rows[0] ? rows[0].data : null;
}

export async function setCatalogCache(provider: string, key: string, data: unknown) {
  await ensureInventoryTables();
  await sql()`insert into catalog_cache (provider, cache_key, data, fetched_at)
    values (${provider}, ${key}, ${JSON.stringify(data)}::jsonb, now())
    on conflict (provider, cache_key) do update
      set data = excluded.data, fetched_at = excluded.fetched_at`;
}
