// ---------------------------------------------------------------------------
// Phase 2 — project-management helpers: job/bidder status logic, default job
// categories, and the bid-request email builder. Kept pure and dependency-free
// so it can be reused by the manage page, the job drawer, and the storage
// cross-reference helper.
// ---------------------------------------------------------------------------

import type { Project, Job, Bidder, JobStatus, BidderStatus, Subcontractor } from "./types";

/**
 * Timeline bar color palette: 7 main colors, each with 5 shades from heavy
 * (dark) to light. Used by the in-canvas color picker on the timeline.
 */
export const JOB_COLOR_PALETTE: { name: string; shades: string[] }[] = [
  { name: "Red", shades: ["#991B1B", "#DC2626", "#EF4444", "#F87171", "#FCA5A5"] },
  { name: "Orange", shades: ["#9A3412", "#EA580C", "#F97316", "#FB923C", "#FDBA74"] },
  { name: "Amber", shades: ["#92400E", "#D97706", "#F59E0B", "#FBBF24", "#FCD34D"] },
  { name: "Green", shades: ["#166534", "#16A34A", "#22C55E", "#4ADE80", "#86EFAC"] },
  { name: "Teal", shades: ["#115E59", "#0D9488", "#14B8A6", "#2DD4BF", "#5EEAD4"] },
  { name: "Blue", shades: ["#1E40AF", "#2563EB", "#3B82F6", "#60A5FA", "#93C5FD"] },
  { name: "Purple", shades: ["#6B21A8", "#9333EA", "#A855F7", "#C084FC", "#D8B4FE"] },
];

/** Pick readable text (dark or white) for a given background hex. */
export function contrastText(hex: string): string {
  const c = hex.replace("#", "");
  if (c.length < 6) return "#FFFFFF";
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.62 ? "#1A2332" : "#FFFFFF";
}

/** Seed list shown in the (globally-synced) job category dropdown. */
export const DEFAULT_JOB_CATEGORIES: string[] = [
  "Designing",
  "Geotechnical",
  "Excavation",
  "Foundation",
  "Framing",
  "Framing Hardware",
  "Plumbing",
  "Electrical",
  "HVAC",
  "Roofing",
  "Drywall",
  "Insulation",
  "Flooring",
  "Painting",
  "Landscaping",
];

/**
 * Bidder statuses that count as "this bidder won the job". When a bidder hits
 * one of these, the job's headline status + approved bidder are synced from it.
 */
const APPROVED_BIDDER_STATUSES: BidderStatus[] = [
  "Bid approved",
  "Work-in-progress",
  "Finished",
  "Partially-paid",
  "Fully-paid",
];

export function isApprovedBidderStatus(s: BidderStatus): boolean {
  return APPROVED_BIDDER_STATUSES.includes(s);
}

/** Map a winning bidder's status onto the job's headline status. */
function bidderToJobStatus(s: BidderStatus): JobStatus {
  switch (s) {
    case "Bid approved":
      return "Bid Approved";
    case "Work-in-progress":
      return "Work-in-progress";
    case "Finished":
      return "Finished";
    case "Partially-paid":
    case "Fully-paid":
      return "Paid";
    case "Bid Requested":
    case "Bid received":
      return "Bid Requested";
    default:
      return "N/A";
  }
}

/** Find the bidder (if any) that has won the job. */
export function approvedBidder(job: Job): Bidder | null {
  if (job.approvedBidderId) {
    const byId = job.bidders.find((b) => b.id === job.approvedBidderId);
    if (byId && isApprovedBidderStatus(byId.status)) return byId;
  }
  return job.bidders.find((b) => isApprovedBidderStatus(b.status)) ?? null;
}

/**
 * Recompute a job's headline status + approvedBidderId from its bidders.
 * - If a bidder has won, mirror that bidder (features #4 + #7).
 * - Else if any bidder has been solicited, surface "Bid Requested".
 * - Else keep whatever manual status the user set on the main table.
 * Returns a new Job (pure).
 */
export function syncJobFromBidders(job: Job): Job {
  const winner = approvedBidder(job);
  if (winner) {
    return { ...job, status: bidderToJobStatus(winner.status), approvedBidderId: winner.id };
  }
  const anySolicited = job.bidders.some(
    (b) => b.status === "Bid Requested" || b.status === "Bid received",
  );
  if (anySolicited) {
    return { ...job, status: "Bid Requested", approvedBidderId: null };
  }
  // No bidder activity: drop any stale approval, leave the manual status alone.
  return { ...job, approvedBidderId: null };
}

/** Does this status mean a subcontractor + price should show on the main table? */
export function showsApprovedDetails(status: JobStatus): boolean {
  return (
    status === "Bid Approved" ||
    status === "Work-in-progress" ||
    status === "Finished" ||
    status === "Paid"
  );
}

/**
 * Build a `mailto:` URL that opens the user's mail client with a bid request
 * pre-filled from the project + subcontractor data, matching the user's
 * template. Returns null if the subcontractor has no email.
 */
export function buildBidRequestMailto(
  project: Project,
  job: Job,
  sub: Subcontractor | null,
): string | null {
  if (!sub || !sub.email) return null;

  const company = project.companyName.trim() || "our company";
  const sender = project.senderName.trim() || "";
  const address = project.projectAddress.trim() || "our project site";
  const link = project.plansLink.trim() || "[plans link]";
  const rep = sub.representativeName.trim();

  const subject = `Bid Request — ${job.category} — ${project.name}`;
  const body = [
    `Hello${rep ? " " + rep : ""},`,
    "",
    `This is ${sender ? sender + " " : ""}from ${company}, we're currently developing a project at ${address}. We would like to request a bid from you for ${job.category}. Please follow these links to access the plans.`,
    "",
    link,
    "",
    "Please let me know if you need anything else.",
    "",
    "Best,",
    sender,
  ].join("\n");

  return `mailto:${encodeURIComponent(sub.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
