import { z } from "zod";

export const inventoryClasses = ["sealed", "slab", "single", "bulk"] as const;
export const inventoryGames = ["pokemon", "mtg", "other"] as const;
export const inventoryConditions = ["NM", "LP", "MP", "HP", "DMG"] as const;
export const inventoryStatuses = ["active", "sold_out", "archived"] as const;
export const ledgerTypes = [
  "intake",
  "sale",
  "return",
  "break_consume",
  "break_produce",
  "grade_out",
  "grade_in",
  "adjustment",
] as const;

export type InventoryClass = (typeof inventoryClasses)[number];
export type InventoryGame = (typeof inventoryGames)[number];
export type InventoryCondition = (typeof inventoryConditions)[number];
export type InventoryStatus = (typeof inventoryStatuses)[number];
export type LedgerType = (typeof ledgerTypes)[number];

export const catalogRefSchema = z
  .object({
    provider: z.string().max(40),
    id: z.string().max(200),
    imageUrl: z.string().url().or(z.literal("")).default(""),
    marketPriceCents: z.number().int().nonnegative().nullable().default(null),
    fetchedAt: z.string().datetime().or(z.literal("")).default(""),
  })
  .nullable()
  .default(null);

const sharedItemShape = {
  game: z.enum(inventoryGames),
  name: z.string().trim().min(1).max(300),
  setCode: z.string().trim().max(80).default(""),
  collectorNumber: z.string().trim().max(80).default(""),
  finish: z.string().trim().max(80).default("normal"),
  language: z.string().trim().min(1).max(20).default("en"),
  catalogRef: catalogRefSchema,
  unitCostCents: z.number().int().nonnegative(),
  notes: z.string().max(5000).default(""),
};

export const sealedItemSchema = z.object({
  ...sharedItemShape,
  class: z.literal("sealed"),
  condition: z.null().default(null),
  quantity: z.number().int().positive(),
  upc: z.string().trim().max(80).default(""),
  productType: z.string().trim().max(120).default(""),
});

export const slabItemSchema = z.object({
  ...sharedItemShape,
  class: z.literal("slab"),
  condition: z.null().default(null),
  quantity: z.literal(1),
  grader: z.string().trim().min(1, "Grader is required").max(40),
  certNumber: z.string().trim().min(1, "Certificate number is required").max(120),
  grade: z.string().trim().min(1, "Grade is required").max(40),
});

export const singleItemSchema = z.object({
  ...sharedItemShape,
  class: z.literal("single"),
  condition: z.enum(inventoryConditions),
  quantity: z.number().int().positive(),
});

export const bulkItemSchema = z.object({
  ...sharedItemShape,
  class: z.literal("bulk"),
  condition: z.null().default(null),
  quantity: z.number().int().positive(),
  lotType: z.string().trim().min(1).max(120),
  estimatedCount: z.number().int().nonnegative(),
});

export const itemCreateSchema = z.discriminatedUnion("class", [
  sealedItemSchema,
  slabItemSchema,
  singleItemSchema,
  bulkItemSchema,
]);

export const itemPatchSchema = z
  .object({
    name: z.string().trim().min(1).max(300),
    game: z.enum(inventoryGames),
    setCode: z.string().trim().max(80),
    collectorNumber: z.string().trim().max(80),
    finish: z.string().trim().max(80),
    condition: z.enum(inventoryConditions).nullable(),
    language: z.string().trim().min(1).max(20),
    grader: z.string().trim().max(40).nullable(),
    certNumber: z.string().trim().max(120).nullable(),
    grade: z.string().trim().max(40).nullable(),
    upc: z.string().trim().max(80).nullable(),
    productType: z.string().trim().max(120).nullable(),
    lotType: z.string().trim().max(120).nullable(),
    estimatedCount: z.number().int().nonnegative().nullable(),
    catalogRef: catalogRefSchema,
    unitCostCents: z.number().int().nonnegative(),
    status: z.enum(inventoryStatuses),
    notes: z.string().max(5000),
  })
  .partial()
  .strict();

export const adjustItemSchema = z.object({
  quantityDelta: z.number().int().refine((value) => value !== 0, "Adjustment cannot be zero"),
  note: z.string().trim().min(1, "A note is required").max(1000),
});

const datedAcquisitionShape = {
  source: z.string().trim().max(300).default(""),
  date: z.string().date(),
  notes: z.string().max(5000).default(""),
};

const marketItemSchema = z.object({
  item: itemCreateSchema,
  marketValueCents: z.number().int().nonnegative(),
});

export const distributorAcquisitionSchema = z.object({
  ...datedAcquisitionShape,
  type: z.literal("distributor"),
  items: z.array(itemCreateSchema).min(1).max(500),
});

export const collectionBuyAcquisitionSchema = z.object({
  ...datedAcquisitionShape,
  type: z.literal("collection_buy"),
  totalCostCents: z.number().int().positive(),
  items: z.array(marketItemSchema).min(1).max(500),
  bulkResidue: bulkItemSchema.optional(),
  residueCostCents: z.number().int().nonnegative().default(0),
});

export const boxBreakAcquisitionSchema = z.object({
  ...datedAcquisitionShape,
  type: z.literal("box_break"),
  sourceItemId: z.string().uuid(),
  quantity: z.number().int().positive(),
  outputs: z.array(marketItemSchema).min(1).max(500),
});

export const gradingReturnAcquisitionSchema = z.object({
  ...datedAcquisitionShape,
  type: z.literal("grading_return"),
  sourceItemId: z.string().uuid(),
  gradingFeeCents: z.number().int().nonnegative(),
  shippingShareCents: z.number().int().nonnegative(),
  slab: slabItemSchema,
});

export const acquisitionInputSchema = z
  .discriminatedUnion("type", [
    distributorAcquisitionSchema,
    collectionBuyAcquisitionSchema,
    boxBreakAcquisitionSchema,
    gradingReturnAcquisitionSchema,
  ])
  .superRefine((value, context) => {
    if (value.type !== "collection_buy") return;
    if (value.residueCostCents > value.totalCostCents) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["residueCostCents"],
        message: "Bulk residue cannot exceed total paid",
      });
    }
    if (value.residueCostCents > 0 && !value.bulkResidue) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["bulkResidue"],
        message: "Bulk residue details are required when assigning residue cost",
      });
    }
  });

export type ItemCreateInput = z.infer<typeof itemCreateSchema>;
export type ItemPatchInput = z.infer<typeof itemPatchSchema>;
export type AcquisitionInput = z.infer<typeof acquisitionInputSchema>;

export type CatalogCard = {
  provider: "pokemontcg" | "scryfall";
  id: string;
  game: "pokemon" | "mtg";
  name: string;
  setCode: string;
  setName: string;
  collectorNumber: string;
  finishes: string[];
  imageUrl: string;
  marketPriceCents: number | null;
  prices: Record<string, number | null>;
};

export type InventoryItem = {
  id: string;
  ownerId: string;
  class: InventoryClass;
  game: InventoryGame;
  sku: string;
  name: string;
  setCode: string;
  collectorNumber: string;
  finish: string;
  condition: InventoryCondition | null;
  language: string;
  grader: string | null;
  certNumber: string | null;
  grade: string | null;
  upc: string | null;
  productType: string | null;
  lotType: string | null;
  estimatedCount: number | null;
  catalogRef: z.infer<typeof catalogRefSchema>;
  quantityOnHand: number;
  unitCostCents: number;
  status: InventoryStatus;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type InventoryLedgerEntry = {
  id: string;
  itemId: string;
  ownerId: string;
  type: LedgerType;
  quantityDelta: number;
  unitCostCents: number;
  acquisitionId: string | null;
  note: string;
  createdAt: string;
};
