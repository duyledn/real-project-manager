import type { BidderStatus } from "./types";

/** Extended categorical data palette - cycle with PAL[i % PAL.length]. */
export const PAL = [
  "#1F8A5B", // Evergreen
  "#E0A92E", // Gold
  "#2C9C8E", // Teal
  "#7FB23C", // Lime
  "#4FAE6B", // Moss
  "#C98A2E", // Amber
] as const;

/** Per-index colors for the four Financials KPI cards. */
export const KPI_COLORS = ["#1F8A5B", "#1E8C7E", "#A8862A", "#3E8E5A"] as const;

/** `$0` when falsy, `$Xk` (1 dp) for >=1000, `$X` otherwise. */
export function kMoney(n: number | null | undefined): string {
  if (!n) return "$0";
  if (n >= 1000) return `$${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return `$${Math.round(n)}`;
}

/** True when a BidderStatus counts as "awarded" for progress/bar purposes. */
export const AWARDED_STATUSES = new Set<BidderStatus>([
  "Bid approved",
  "Work-in-progress",
  "Partially-paid",
  "Fully-paid",
]);
