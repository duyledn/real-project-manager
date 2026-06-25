// Default seed project + the Zod schema that validates everything coming in
// through the API. Keeping validation here (one source of truth) means the
// API routes stay thin and every persisted project is guaranteed well-formed.

import { z } from "zod";
import type { ProjectInput, SubcontractorInput } from "./types";
import { DEFAULT_JOB_CATEGORIES } from "./jobs";

export { DEFAULT_JOB_CATEGORIES };

const renovationItemSchema = z.object({
  id: z.string(),
  description: z.string(),
  category: z.string(),
  qty: z.number().finite(),
  unitCost: z.number().finite(),
  color: z.string().default(""),
  groupId: z.string().default(""),
});

const itemGroupSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string().default(""),
});

const frequencySchema = z
  .enum(["monthly", "quarterly", "semi-annual", "annual", "once"])
  .default("annual");

const operatingExpenseSchema = z
  .object({
    id: z.string(),
    label: z.string(),
    category: z.string(),
    amount: z.number().finite().optional(),
    annualAmount: z.number().finite().optional(), // legacy
    frequency: frequencySchema,
    recurring: z.boolean().optional(), // legacy
  })
  .transform((d) => ({
    id: d.id,
    label: d.label,
    category: d.category,
    amount: d.amount ?? d.annualAmount ?? 0,
    frequency: (d.frequency ?? (d.recurring === false ? "once" : "annual")) as
      | "monthly"
      | "quarterly"
      | "semi-annual"
      | "annual"
      | "once",
  }));

const incomeSourceSchema = z
  .object({
    id: z.string(),
    label: z.string(),
    amount: z.number().finite().optional(),
    annualAmount: z.number().finite().optional(), // legacy
    frequency: frequencySchema,
    recurring: z.boolean().optional(), // legacy
  })
  .transform((d) => ({
    id: d.id,
    label: d.label,
    amount: d.amount ?? d.annualAmount ?? 0,
    frequency: (d.frequency ?? (d.recurring === false ? "once" : "annual")) as
      | "monthly"
      | "quarterly"
      | "semi-annual"
      | "annual"
      | "once",
  }));

// --- Phase 2: jobs, bidders, subcontractors -------------------------------

const bidderSchema = z.object({
  id: z.string(),
  subcontractorId: z.string().nullable().default(null),
  bidPrice: z.number().finite().default(0),
  status: z
    .enum([
      "Not sent",
      "Bid Requested",
      "Bid received",
      "Bid approved",
      "Work-in-progress",
      "Finished",
      "Partially-paid",
      "Fully-paid",
    ])
    .default("Not sent"),
  bidLink: z.string().default(""),
});

const jobSchema = z.object({
  id: z.string(),
  category: z.string(),
  startDate: z.string().default(""),
  endDate: z.string().default(""),
  status: z
    .enum(["N/A", "Bid Requested", "Bid Approved", "Work-in-progress", "Finished", "Paid"])
    .default("N/A"),
  approvedBidderId: z.string().nullable().default(null),
  color: z.string().default(""),
  bidders: z.array(bidderSchema).default([]),
});

/** Subcontractor records for the global database. */
export const subcontractorInputSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  representativeName: z.string().default(""),
  phone: z.string().default(""),
  email: z.string().default(""),
  workersComp: z.string().default(""),
  w9: z.string().default(""),
  businessLicense: z.string().default(""),
});

export function makeSubcontractorInput(): SubcontractorInput {
  return {
    companyName: "",
    representativeName: "",
    phone: "",
    email: "",
    workersComp: "",
    w9: "",
    businessLicense: "",
  };
}

export const projectInputSchema = z.object({
  name: z.string().min(1, "Project name is required"),

  // Phase 2 meta — all optional/defaulted so pre-Phase-2 projects still load.
  startDate: z.string().default(""),
  projectAddress: z.string().default(""),
  projectManager: z.string().default(""),
  owner: z.string().default(""),
  generalContractor: z.string().default(""),
  companyName: z.string().default(""),
  senderName: z.string().default(""),
  plansLink: z.string().default(""),
  jobs: z.array(jobSchema).default([]),

  purchasePrice: z.number().finite(),
  closingCosts: z.number().finite(),
  landPercent: z.number().min(0).max(100),

  borrowed: z.number().finite(),
  interestRate: z.number().min(0),
  constructionMonths: z.number().int().min(0),
  amortize: z.boolean(),
  loanTermYears: z.number().int().min(1),

  holdYears: z.number().int().min(1).max(50),
  rentGrowthRate: z.number(),
  expenseGrowthRate: z.number(),
  vacancyRate: z.number().min(0).max(100),

  rooms: z.number().min(0).default(0),
  adr: z.number().min(0).default(0),

  appreciationRate: z.number(),
  exitValueOverride: z.number().finite().nullable(),
  sellingCostPercent: z.number().min(0).max(100),

  taxRate: z.number().min(0).max(100),
  depreciationLifeYears: z.number().positive(),
  recaptureTaxRate: z.number().min(0).max(100).default(25),

  items: z.array(renovationItemSchema),
  itemGroups: z.array(itemGroupSchema).default([]),
  expenses: z.array(operatingExpenseSchema),
  incomes: z.array(incomeSourceSchema),
});

export function makeId(): string {
  // Browser-safe random id for client-created rows.
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/** A realistic starting point for a buy-rehab-hold so a new user sees a
 * fully worked example rather than a wall of zeros. */
export function defaultProjectInput(): ProjectInput {
  return {
    name: "Untitled Remodel",

    // Phase 2 — project management
    startDate: new Date().toISOString().slice(0, 10),
    projectAddress: "",
    projectManager: "",
    owner: "",
    generalContractor: "",
    companyName: "",
    senderName: "",
    plansLink: "",
    jobs: [],

    purchasePrice: 240000,
    closingCosts: 7000,
    landPercent: 20,

    borrowed: 200000,
    interestRate: 7.5,
    constructionMonths: 4,
    amortize: true,
    loanTermYears: 30,

    holdYears: 3,
    rentGrowthRate: 3,
    expenseGrowthRate: 3,
    vacancyRate: 5,

    rooms: 0,
    adr: 0,

    appreciationRate: 3.5,
    exitValueOverride: null,
    sellingCostPercent: 7,

    taxRate: 24,
    depreciationLifeYears: 27.5,
    recaptureTaxRate: 25,

    items: [
      { id: makeId(), description: "Kitchen cabinets & countertops", category: "Materials", qty: 1, unitCost: 14000, color: "", groupId: "" },
      { id: makeId(), description: "Flooring – LVP, whole house", category: "Materials", qty: 1, unitCost: 6500, color: "", groupId: "" },
      { id: makeId(), description: "General contractor labor", category: "Labor", qty: 1, unitCost: 18000, color: "", groupId: "" },
      { id: makeId(), description: "Permits & inspections", category: "Permits & Fees", qty: 1, unitCost: 1500, color: "", groupId: "" },
      { id: makeId(), description: "Contingency", category: "Contingency", qty: 1, unitCost: 4000, color: "", groupId: "" },
    ],
    itemGroups: [],
    expenses: [
      { id: makeId(), label: "Property taxes", category: "Taxes", amount: 300, frequency: "monthly" as const },
      { id: makeId(), label: "Insurance", category: "Insurance", amount: 1400, frequency: "annual" as const },
      { id: makeId(), label: "Property management (8%)", category: "Management", amount: 575, frequency: "quarterly" as const },
      { id: makeId(), label: "Maintenance & repairs", category: "Maintenance", amount: 1800, frequency: "annual" as const },
    ],
    incomes: [
      { id: makeId(), label: "Rental income", amount: 2400, frequency: "monthly" as const },
    ],
  };
}
