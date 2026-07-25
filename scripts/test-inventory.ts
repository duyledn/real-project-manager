import assert from "node:assert/strict";
import {
  allocateBoxBreak,
  allocateByMarketValue,
  allocateCollectionBuy,
  gradingReturnBasis,
  ledgerQuantity,
} from "../src/lib/inventory/costBasis";
import { acquisitionInputSchema, itemCreateSchema } from "../src/lib/inventory/types";

function test(name: string, run: () => void) {
  try {
    run();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    throw error;
  }
}

test("largest-remainder allocations always sum exactly", () => {
  for (let total = 0; total <= 10_000; total += 137) {
    for (let size = 1; size <= 12; size += 1) {
      const items = Array.from({ length: size }, (_, index) => ({
        id: String(index),
        marketValueCents: (index * 7919 + total * 13) % 20_000,
      }));
      const allocation = allocateByMarketValue(total, items);
      assert.equal(allocation.reduce((sum, item) => sum + item.costCents, 0), total);
      assert.ok(allocation.every((item) => Number.isInteger(item.costCents) && item.costCents >= 0));
    }
  }
});

test("collection buy allocates 4 singles plus residue to exactly $500", () => {
  const result = allocateCollectionBuy(
    50_000,
    [
      { id: "a", marketValueCents: 12_345 },
      { id: "b", marketValueCents: 8_765 },
      { id: "c", marketValueCents: 3_210 },
      { id: "d", marketValueCents: 980 },
    ],
    5_000,
  );
  assert.equal(result.items.length, 4);
  assert.equal(
    result.items.reduce((sum, item) => sum + item.costCents, 0) + result.residueCostCents,
    50_000,
  );
});

test("collection buy supports 3+ item allocation with deterministic ties", () => {
  const result = allocateCollectionBuy(10, [
    { id: "first", marketValueCents: 1 },
    { id: "second", marketValueCents: 1 },
    { id: "third", marketValueCents: 1 },
  ]);
  assert.deepEqual(result.items.map((item) => item.costCents), [4, 3, 3]);
});

test("box break allocates consumed basis across pulls and bulk residue", () => {
  const result = allocateBoxBreak(12_599, [
    { id: "pull-1", marketValueCents: 5_000 },
    { id: "pull-2", marketValueCents: 2_000 },
    { id: "bulk-residue", marketValueCents: 250 },
  ]);
  assert.equal(result.reduce((sum, item) => sum + item.costCents, 0), 12_599);
  assert.ok(result.find((item) => item.id === "bulk-residue")!.costCents > 0);
});

test("grading return basis includes raw basis, fee, and shipping", () => {
  assert.equal(gradingReturnBasis(2_500, 1_900, 350), 4_750);
});

test("ledger invariant computes quantity from signed deltas", () => {
  const entries = [
    { quantityDelta: 10 },
    { quantityDelta: -3 },
    { quantityDelta: 1 },
    { quantityDelta: -2 },
  ];
  const quantityOnHand = 6;
  assert.equal(quantityOnHand, ledgerQuantity(entries));
});

const commonSingle = {
  class: "single",
  game: "pokemon",
  name: "Test card",
  setCode: "TST",
  collectorNumber: "1",
  finish: "normal",
  condition: "NM",
  language: "en",
  catalogRef: null,
  quantity: 1,
  unitCostCents: 100,
  notes: "",
} as const;

test("route item validation rejects negative quantities", () => {
  assert.equal(itemCreateSchema.safeParse({ ...commonSingle, quantity: -1 }).success, false);
});

test("route item validation rejects slabs whose quantity is not 1", () => {
  assert.equal(itemCreateSchema.safeParse({
    ...commonSingle,
    class: "slab",
    condition: null,
    quantity: 2,
    grader: "PSA",
    certNumber: "123",
    grade: "10",
  }).success, false);
});

test("route item validation rejects slabs without a certificate", () => {
  assert.equal(itemCreateSchema.safeParse({
    ...commonSingle,
    class: "slab",
    condition: null,
    quantity: 1,
    grader: "PSA",
    certNumber: "",
    grade: "10",
  }).success, false);
});

test("route acquisition validation rejects negative consumed quantity", () => {
  assert.equal(acquisitionInputSchema.safeParse({
    type: "box_break",
    source: "",
    date: "2026-07-24",
    notes: "",
    sourceItemId: crypto.randomUUID(),
    quantity: -1,
    outputs: [{ item: commonSingle, marketValueCents: 100 }],
  }).success, false);
});

console.log("Inventory tests passed.");

