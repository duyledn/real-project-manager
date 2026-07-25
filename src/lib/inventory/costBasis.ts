export type CostAllocationInput = {
  id: string;
  marketValueCents: number;
};

export type CostAllocation = {
  id: string;
  costCents: number;
};

/**
 * Allocate integer cents proportionally with Hamilton/largest-remainder
 * rounding. Ties are stable by input order, and the returned costs always sum
 * to totalCostCents exactly.
 */
export function allocateByMarketValue(
  totalCostCents: number,
  items: CostAllocationInput[],
): CostAllocation[] {
  if (!Number.isSafeInteger(totalCostCents) || totalCostCents < 0) {
    throw new Error("Total cost must be a non-negative integer number of cents");
  }
  if (items.length === 0) {
    if (totalCostCents === 0) return [];
    throw new Error("At least one item is required to allocate a positive cost");
  }
  for (const item of items) {
    if (!Number.isSafeInteger(item.marketValueCents) || item.marketValueCents < 0) {
      throw new Error("Market values must be non-negative integer cents");
    }
  }

  const marketTotal = items.reduce(
    (sum, item) => sum + BigInt(item.marketValueCents),
    BigInt(0),
  );
  if (marketTotal === BigInt(0)) {
    const base = Math.floor(totalCostCents / items.length);
    let remainder = totalCostCents - base * items.length;
    return items.map((item) => ({
      id: item.id,
      costCents: base + (remainder-- > 0 ? 1 : 0),
    }));
  }

  const ranked = items.map((item, index) => {
    const numerator = BigInt(totalCostCents) * BigInt(item.marketValueCents);
    const floor = Number(numerator / marketTotal);
    return { id: item.id, index, floor, remainder: numerator % marketTotal };
  });
  let centsLeft = totalCostCents - ranked.reduce((sum, item) => sum + item.floor, 0);
  const awardOrder = [...ranked].sort(
    (a, b) =>
      a.remainder === b.remainder
        ? a.index - b.index
        : a.remainder > b.remainder
          ? -1
          : 1,
  );
  const awards = new Set(awardOrder.slice(0, centsLeft).map((item) => item.index));
  centsLeft = 0;

  return ranked.map((item) => ({
    id: item.id,
    costCents: item.floor + (awards.has(item.index) ? 1 : 0),
  }));
}

export function allocateCollectionBuy(
  totalPaidCents: number,
  items: CostAllocationInput[],
  residueCostCents = 0,
): { items: CostAllocation[]; residueCostCents: number } {
  if (!Number.isSafeInteger(residueCostCents) || residueCostCents < 0) {
    throw new Error("Residue cost must be non-negative integer cents");
  }
  if (residueCostCents > totalPaidCents) {
    throw new Error("Residue cost cannot exceed total paid");
  }
  return {
    items: allocateByMarketValue(totalPaidCents - residueCostCents, items),
    residueCostCents,
  };
}

export function allocateBoxBreak(
  consumedCostCents: number,
  outputs: CostAllocationInput[],
): CostAllocation[] {
  return allocateByMarketValue(consumedCostCents, outputs);
}

export function gradingReturnBasis(
  rawSingleBasisCents: number,
  gradingFeeCents: number,
  shippingShareCents: number,
): number {
  const values = [rawSingleBasisCents, gradingFeeCents, shippingShareCents];
  if (values.some((value) => !Number.isSafeInteger(value) || value < 0)) {
    throw new Error("Grading basis inputs must be non-negative integer cents");
  }
  return values.reduce((sum, value) => sum + value, 0);
}

export function ledgerQuantity(entries: Array<{ quantityDelta: number }>): number {
  return entries.reduce((sum, entry) => sum + entry.quantityDelta, 0);
}
