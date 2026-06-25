// Presentation helpers for bid pipeline status + subcontractor compliance.
// Pure + dependency-light so the Dashboard and the Jobs & Bids board can share
// them. No engine/data-model logic lives here — colors and derivations only.

import type { BidderStatus, Subcontractor } from "./types";

/** Soft pill color per bid status (terracotta/estate palette from the handoff). */
export const BID_STATUS_COLOR: Record<BidderStatus, string> = {
  "Not sent": "#9A8F86",
  "Bid Requested": "#6B86C9",
  "Bid received": "#D9A53C",
  "Bid approved": "#C65D3B",
  "Work-in-progress": "#5E8C9E",
  Finished: "#C77E45",
  "Partially-paid": "#4FA08B",
  "Fully-paid": "#5AA15E",
};

/** Short label for compact UI (kanban column headers, pills). */
export const BID_STATUS_SHORT: Record<BidderStatus, string> = {
  "Not sent": "Not sent",
  "Bid Requested": "Sent",
  "Bid received": "Received",
  "Bid approved": "Approved",
  "Work-in-progress": "In progress",
  Finished: "Finished",
  "Partially-paid": "Partly paid",
  "Fully-paid": "Fully paid",
};

export function bidStatusColor(s: BidderStatus): string {
  return BID_STATUS_COLOR[s] ?? "#9A8F86";
}

/** Inline style for a soft status pill: colored text on a 20%-alpha wash. */
export function pillStyle(s: BidderStatus): React.CSSProperties {
  const c = bidStatusColor(s);
  return { color: c, background: hexAlpha(c, 0.16) };
}

/** "#RRGGBB" + alpha → rgba() string. */
export function hexAlpha(hex: string, a: number): string {
  const c = hex.replace("#", "");
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

/** Initials from a company / person name, max two letters. */
export function initialsOf(name: string): string {
  return (name || "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export interface Compliance {
  ok: boolean;
  missing: string[];
  w9: boolean;
  license: boolean;
  workersComp: boolean;
}

/** A sub is compliant when W-9, Business License, and Workers' Comp are all
 *  recorded (non-empty). Returns which docs are missing. */
export function subCompliance(sub: Subcontractor | null | undefined): Compliance {
  const w9 = !!sub?.w9?.trim();
  const license = !!sub?.businessLicense?.trim();
  const workersComp = !!sub?.workersComp?.trim();
  const missing: string[] = [];
  if (!w9) missing.push("W-9");
  if (!license) missing.push("License");
  if (!workersComp) missing.push("Workers' Comp");
  return { ok: missing.length === 0, missing, w9, license, workersComp };
}
