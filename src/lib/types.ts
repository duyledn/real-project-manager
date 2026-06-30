// Shared types for the remodel estimator.
// These describe both what gets persisted (Project + its line items) and
// what gets computed on the fly by lib/calculations.ts. Nothing computed is
// ever stored — analysis numbers are always derived fresh from the saved
// inputs, so the Math page and the Analysis page can never drift out of
// sync with each other.

/** The currency a project's stored money figures are expressed in. Conversion
 *  only happens when the user presses the Convert button, which rewrites every
 *  amount in place and flips this flag — values are never converted on input. */
export type Currency = "USD" | "VND";

// ---------------------------------------------------------------------------
// Accounts, companies & collaboration
// ---------------------------------------------------------------------------

/** "god" is the single overarching admin with complete control; everyone else
 *  is a regular "user" (who may own companies and be assigned to projects). */
export type Role = "god" | "user";

export interface User {
  id: string;
  /** Unique handle, stored lowercase without the leading "@". */
  tag: string;
  username: string;
  /** Salted hash ("salt:hash"). Internal tool — not hardened. */
  password: string;
  /** 6-digit recovery PIN (stored hashed like the password). */
  pin: string;
  role: Role;
  /** Avatar data URL ("" = initials fallback). */
  avatar: string;
  createdAt: string;
}

/** Public-safe view of a user (never leaks password/pin). */
export interface PublicUser {
  id: string;
  tag: string;
  username: string;
  role: Role;
  avatar: string;
}

/** A company workspace. Projects belong to exactly one company. The owner has
 *  full control; members get edit (not delete) on assigned projects. */
export interface Company {
  id: string;
  name: string;
  ownerId: string;
  /** User ids added to the company by the owner. */
  memberIds: string[];
  createdAt: string;
}

export type CompanyInput = { name: string };

export interface RenovationItem {
  id: string;
  description: string;
  category: string;
  qty: number;
  unitCost: number;
  /** Per-item highlight color (hex). "" = none. */
  color: string;
  /** Custom group this item belongs to (ItemGroup id). "" = ungrouped. */
  groupId: string;
}

/** A user-defined, colored grouping box for renovation items. */
export interface ItemGroup {
  id: string;
  name: string;
  color: string;
}

export type ExpenseFrequency = "monthly" | "quarterly" | "semi-annual" | "annual" | "once";

export const FREQUENCY_FACTORS: Record<ExpenseFrequency, number> = {
  monthly: 12,
  quarterly: 4,
  "semi-annual": 2,
  annual: 1,
  once: 1,
};

export const FREQUENCY_LABELS: Record<ExpenseFrequency, string> = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  "semi-annual": "Semi-Annual",
  annual: "Annual",
  once: "One-time (yr 1)",
};

export interface OperatingExpense {
  id: string;
  label: string;
  category: string;
  /** Amount per frequency period (not annualized). */
  amount: number;
  frequency: ExpenseFrequency;
}

export interface IncomeSource {
  id: string;
  label: string;
  /** Amount per frequency period (not annualized). */
  amount: number;
  frequency: ExpenseFrequency;
}

// ---------------------------------------------------------------------------
// PHASE 2 — Project Management types
// ---------------------------------------------------------------------------

/** Headline status shown for a job on the Phase 2 main table. */
export type JobStatus =
  | "N/A"
  | "Bid Requested"
  | "Bid Approved"
  | "Work-in-progress"
  | "Finished"
  | "Paid";

/** Per-bidder status inside a job's bid sheet. */
export type BidderStatus =
  | "Not sent"
  | "Bid Requested"
  | "Bid received"
  | "Bid approved"
  | "Work-in-progress"
  | "Finished"
  | "Partially-paid"
  | "Fully-paid";

export const JOB_STATUSES: JobStatus[] = [
  "N/A",
  "Bid Requested",
  "Bid Approved",
  "Work-in-progress",
  "Finished",
  "Paid",
];

export const BIDDER_STATUSES: BidderStatus[] = [
  "Not sent",
  "Bid Requested",
  "Bid received",
  "Bid approved",
  "Work-in-progress",
  "Finished",
  "Partially-paid",
  "Fully-paid",
];

export interface Bidder {
  id: string;
  /** Links to a Subcontractor in the global database (null = not yet chosen). */
  subcontractorId: string | null;
  bidPrice: number;
  status: BidderStatus;
  /** Google Drive (or any) link to the bid document they sent. */
  bidLink: string;
}

export interface Job {
  id: string;
  /** One of the globally-synced job categories. */
  category: string;
  /** Defaults to the project's anticipated start date when created. */
  startDate: string;
  /** Optional finish date — used to draw the timeline bar. */
  endDate: string;
  /** Headline status; auto-synced from an approved bidder, else manual. */
  status: JobStatus;
  /** The bidder whose bid was approved (drives the main-table sub + price). */
  approvedBidderId: string | null;
  /** Custom timeline bar color (hex). "" = color by status. */
  color: string;
  /**
   * Budget for this scope, in the project currency. Auto-seeded (once) from the
   * source remodel item's qty × unitCost when imported, then freely editable —
   * editing it never flows back to the remodel costs.
   */
  estimatedCost: number;
  /** Remodel item this job was auto-imported from ("" = created manually). */
  sourceItemId: string;
  bidders: Bidder[];
}

/** A node in a project's Files workspace — a folder or an uploaded file.
 *  Stored flat with `parentId` links (null = project root); file contents are
 *  kept as a data URL so everything persists inside the project JSON. */
export interface ProjectFile {
  id: string;
  name: string;
  kind: "folder" | "file";
  /** Containing folder id, or null at the root. */
  parentId: string | null;
  /** data URL of the contents (files only; "" for folders). */
  dataUrl: string;
  /** MIME type (files only). */
  mime: string;
  /** Size in bytes (files only). */
  size: number;
  createdAt: string;
}

/** A subcontractor in the global, cross-project database. */
export interface Subcontractor {
  id: string;
  companyName: string;
  representativeName: string;
  phone: string;
  email: string;
  /** Free-text — hold a link, expiry date, or status. */
  workersComp: string;
  w9: string;
  businessLicense: string;
  createdAt: string;
  updatedAt: string;
}

export type SubcontractorInput = Omit<Subcontractor, "id" | "createdAt" | "updatedAt">;

/** Derived (never stored): where a subcontractor is engaged across projects. */
export interface RelatedJob {
  projectId: string;
  projectName: string;
  jobCategory: string;
  status: BidderStatus;
}

/** A subcontractor enriched with its derived related jobs, for the DB page. */
export interface SubcontractorWithJobs extends Subcontractor {
  relatedJobs: RelatedJob[];
}

export interface Project {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;

  /** Currency the figures below are stored in. Changed only via Convert. */
  currency: Currency;

  /** The company workspace this project belongs to. */
  companyId: string;
  /** Users (besides the company owner) assigned edit access to this project. */
  memberIds: string[];

  /** Headline investment strategy label (e.g. "Buy-Rehab-Hold Rental").
   *  Presentational only — does not affect the calculation engine. */
  investmentStrategy: string;
  /** Optional project avatar, stored as a data URL (base64). "" = none. */
  profileImage: string;

  // Phase 2 — project management meta
  startDate: string;
  projectAddress: string;
  projectManager: string;
  owner: string;
  generalContractor: string;
  // Sender identity used to pre-fill bid-request emails (per-project)
  companyName: string;
  senderName: string;
  plansLink: string;
  jobs: Job[];

  // Acquisition & basis
  purchasePrice: number;
  closingCosts: number;
  landPercent: number;

  // Financing
  borrowed: number;
  interestRate: number;
  constructionMonths: number;
  amortize: boolean;
  loanTermYears: number;

  // Hold & growth
  holdYears: number;
  rentGrowthRate: number;
  expenseGrowthRate: number;
  vacancyRate: number;

  // Room revenue (hospitality / short-term rental)
  rooms: number;
  /** Average Daily Room Revenue per available room. */
  adr: number;

  // Exit
  appreciationRate: number;
  exitValueOverride: number | null;
  sellingCostPercent: number;

  // Tax & depreciation
  taxRate: number;
  depreciationLifeYears: number;
  /** Depreciation-recapture tax rate applied to depreciation taken, at sale. */
  recaptureTaxRate: number;

  items: RenovationItem[];
  itemGroups: ItemGroup[];
  expenses: OperatingExpense[];
  incomes: IncomeSource[];

  /**
   * Ledger of renovation-item ids already pushed into the Jobs section. Makes
   * the one-way auto-fill idempotent: an item is imported once, and deleting
   * the resulting job never re-imports it.
   */
  importedItemIds: string[];

  /** Files workspace — folders + uploaded documents for this project. */
  files: ProjectFile[];
}

/** Payload shape accepted by the create/update API — everything except the
 * server-assigned id/createdAt/updatedAt. */
export type ProjectInput = Omit<Project, "id" | "createdAt" | "updatedAt">;

export interface ProjectSummary {
  id: string;
  name: string;
  updatedAt: string;
  currency: Currency;
  holdYears: number;
  totalRenovationCost: number;
  netProfit: number;
  companyId: string;
  /** Assigned member user ids (excludes the company owner). */
  memberIds: string[];
  /** Number of people with access (owner + assigned members). */
  memberCount: number;
  /** Whether the requesting user may delete it (owner/god). */
  canDelete: boolean;
}

export interface AmortizationMonth {
  month: number;
  interest: number;
  principal: number;
  payment: number;
  balance: number;
}

export interface ProFormaYear {
  year: number;
  grossIncome: number;
  vacancyLoss: number;
  effectiveGrossIncome: number;
  operatingExpenses: number;
  noi: number;
  ebitda: number;
  depreciation: number;
  ebit: number;
  interestExpense: number;
  ebt: number;
  tax: number;
  netIncome: number;
  principalPaydown: number;
  cashFlow: number;
}

export interface ExitSummary {
  exitValue: number;
  sellingCosts: number;
  loanPayoff: number;
  /** Total depreciation taken over the hold (caps at the depreciable basis). */
  accumulatedDepreciation: number;
  /** Depreciation-recapture tax due at sale. */
  recaptureTax: number;
  netSaleProceeds: number;
}

export interface ReturnsSummary {
  totalRenovationCost: number;
  totalProjectCost: number;
  cashInvested: number;
  totalCashFlow: number;
  totalProfit: number;
  cashOnCashYear1: number | null;
  averageCashOnCash: number | null;
  equityMultiple: number | null;
  irr: number | null;
  capRateYear1: number;
  dscrYear1: number | null;
  annualDebtServiceYear1: number;
}

export interface ProjectAnalysis {
  totalRenovationCost: number;
  depreciableBasis: number;
  annualDepreciation: number;
  inServiceFractionYear1: number;
  proForma: ProFormaYear[];
  exit: ExitSummary;
  returns: ReturnsSummary;
  amortization: AmortizationMonth[];
}
