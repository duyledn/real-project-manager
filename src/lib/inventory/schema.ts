import { sql } from "@/lib/db";

let schemaPromise: Promise<void> | null = null;

async function createInventorySchema(): Promise<void> {
  await sql()`create extension if not exists pg_trgm`;

  await sql()`do $$ begin
    create type inventory_class as enum ('sealed', 'slab', 'single', 'bulk');
  exception when duplicate_object then null; end $$`;
  await sql()`do $$ begin
    create type inventory_game as enum ('pokemon', 'mtg', 'other');
  exception when duplicate_object then null; end $$`;
  await sql()`do $$ begin
    create type inventory_condition as enum ('NM', 'LP', 'MP', 'HP', 'DMG');
  exception when duplicate_object then null; end $$`;
  await sql()`do $$ begin
    create type inventory_status as enum ('active', 'sold_out', 'archived');
  exception when duplicate_object then null; end $$`;
  await sql()`do $$ begin
    create type inventory_ledger_type as enum (
      'intake', 'sale', 'return', 'break_consume', 'break_produce',
      'grade_out', 'grade_in', 'adjustment'
    );
  exception when duplicate_object then null; end $$`;
  await sql()`do $$ begin
    create type acquisition_type as enum (
      'distributor', 'collection_buy', 'box_break', 'grading_return', 'other'
    );
  exception when duplicate_object then null; end $$`;

  await sql()`create table if not exists acquisitions (
    id uuid primary key,
    owner_id text not null,
    type acquisition_type not null,
    total_cost_cents integer not null check (total_cost_cents >= 0),
    source text not null default '',
    date date not null,
    notes text not null default '',
    created_at timestamptz not null default now()
  )`;

  await sql()`create table if not exists inventory_items (
    id uuid primary key,
    owner_id text not null,
    class inventory_class not null,
    game inventory_game not null,
    sku text not null,
    name text not null,
    set_code text not null default '',
    collector_number text not null default '',
    finish text not null default 'normal',
    condition inventory_condition,
    language text not null default 'en',
    grader text,
    cert_number text,
    grade text,
    upc text,
    product_type text,
    lot_type text,
    estimated_count integer check (estimated_count is null or estimated_count >= 0),
    catalog_ref jsonb,
    quantity_on_hand integer not null default 0 check (quantity_on_hand >= 0),
    unit_cost_cents integer not null default 0 check (unit_cost_cents >= 0),
    status inventory_status not null default 'active',
    notes text not null default '',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (owner_id, sku),
    check (
      class <> 'slab' or
      (grader is not null and grader <> '' and cert_number is not null and cert_number <> ''
       and grade is not null and grade <> '' and quantity_on_hand <= 1)
    )
  )`;

  await sql()`create table if not exists inventory_ledger (
    id uuid primary key,
    item_id uuid not null references inventory_items(id) on delete restrict,
    owner_id text not null,
    type inventory_ledger_type not null,
    quantity_delta integer not null check (quantity_delta <> 0),
    unit_cost_cents integer not null check (unit_cost_cents >= 0),
    acquisition_id uuid references acquisitions(id) on delete restrict,
    note text not null default '',
    created_at timestamptz not null default now()
  )`;

  await sql()`create table if not exists catalog_cache (
    provider text not null,
    cache_key text not null,
    data jsonb not null,
    fetched_at timestamptz not null default now(),
    primary key (provider, cache_key)
  )`;

  await sql()`create index if not exists inventory_items_owner_class_idx
    on inventory_items (owner_id, class)`;
  await sql()`create index if not exists inventory_items_owner_game_set_idx
    on inventory_items (owner_id, game, set_code)`;
  await sql()`create index if not exists inventory_items_name_trgm_idx
    on inventory_items using gin (name gin_trgm_ops)`;
  await sql()`create index if not exists inventory_items_owner_status_idx
    on inventory_items (owner_id, status)`;
  await sql()`create index if not exists inventory_ledger_item_idx
    on inventory_ledger (item_id, created_at desc)`;
  await sql()`create index if not exists inventory_ledger_owner_idx
    on inventory_ledger (owner_id, created_at desc)`;

  await sql()`create or replace function inventory_guard_quantity()
    returns trigger language plpgsql as $$
    begin
      if new.quantity_on_hand is distinct from old.quantity_on_hand
         and coalesce(current_setting('inventory.ledger_write', true), '0') <> '1' then
        raise exception 'quantity_on_hand may only change through inventory_ledger';
      end if;
      new.updated_at = now();
      return new;
    end
    $$`;

  await sql()`drop trigger if exists inventory_quantity_guard on inventory_items`;
  await sql()`create trigger inventory_quantity_guard
    before update on inventory_items
    for each row execute function inventory_guard_quantity()`;

  await sql()`create or replace function inventory_apply_ledger()
    returns trigger language plpgsql as $$
    declare
      affected integer;
    begin
      perform set_config('inventory.ledger_write', '1', true);
      update inventory_items
         set quantity_on_hand = quantity_on_hand + new.quantity_delta,
             status = case
               when quantity_on_hand + new.quantity_delta = 0 then 'sold_out'::inventory_status
               when status = 'sold_out' then 'active'::inventory_status
               else status
             end
       where id = new.item_id
         and owner_id = new.owner_id
         and quantity_on_hand + new.quantity_delta >= 0;
      get diagnostics affected = row_count;
      perform set_config('inventory.ledger_write', '0', true);
      if affected <> 1 then
        raise exception 'Ledger item is missing, belongs to another owner, or has insufficient quantity';
      end if;
      return new;
    exception when others then
      perform set_config('inventory.ledger_write', '0', true);
      raise;
    end
    $$`;

  await sql()`drop trigger if exists inventory_ledger_apply on inventory_ledger`;
  await sql()`create trigger inventory_ledger_apply
    before insert on inventory_ledger
    for each row execute function inventory_apply_ledger()`;

  await sql()`create or replace function inventory_ledger_append_only()
    returns trigger language plpgsql as $$
    begin
      raise exception 'inventory_ledger is append-only';
    end
    $$`;
  await sql()`drop trigger if exists inventory_ledger_no_update on inventory_ledger`;
  await sql()`create trigger inventory_ledger_no_update
    before update or delete on inventory_ledger
    for each row execute function inventory_ledger_append_only()`;
}

export function ensureInventoryTables(): Promise<void> {
  if (!schemaPromise) {
    schemaPromise = createInventorySchema().catch((error) => {
      schemaPromise = null;
      throw error;
    });
  }
  return schemaPromise;
}
