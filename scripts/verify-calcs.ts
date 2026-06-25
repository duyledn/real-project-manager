// Quick verification of the calculation engine using hand-checkable numbers.
// Run with: npx tsx scripts/verify-calcs.ts  (or compile + node)
import {
  monthlyPayment,
  buildAmortization,
  annualDepreciation,
  depreciableBasis,
  npv,
  irr,
  analyzeProject,
} from "../src/lib/calculations";
import type { Project } from "../src/lib/types";

let failures = 0;
function approx(label: string, actual: number, expected: number, tol = 0.5) {
  const ok = Math.abs(actual - expected) <= tol;
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}: got ${actual.toFixed(2)}, expected ~${expected.toFixed(2)}`);
}

// 1) Monthly payment: $200,000 @ 6% / 30yr -> ~$1199.10 (standard mortgage value)
approx("monthlyPayment 200k@6%/30y", monthlyPayment(200000, 6, 30), 1199.1, 0.5);

// 2) Zero-rate payment: 120000 @ 0% / 10yr -> 1000/mo
approx("monthlyPayment 0% rate", monthlyPayment(120000, 0, 10), 1000, 0.01);

// 3) NPV sanity: flows [-100, 110] @ 10% -> 0
approx("npv -100,110 @10%", npv(0.1, [-100, 110]), 0, 1e-6);

// 4) IRR sanity: [-100, 110] -> 10%
const irr1 = irr([-100, 110]);
approx("irr -100,110", (irr1 ?? 0) * 100, 10, 0.01);

// 5) IRR sanity: [-1000, 0, 0, 1331] -> 10% (1.1^3 = 1.331)
const irr2 = irr([-1000, 0, 0, 1331]);
approx("irr -1000..1331", (irr2 ?? 0) * 100, 10, 0.05);

// 6) Depreciation: 300k purchase, 20% land, +50k reno, 27.5yr
//    building = 300k*0.8 = 240k; basis = 240k+50k = 290k; dep = 290k/27.5 = 10545.45
const proj: Project = {
  id: "t",
  name: "Test",
  createdAt: "",
  updatedAt: "",
  currency: "USD",

  // Phase 2 meta — not exercised by these calculation tests.
  startDate: "",
  projectAddress: "",
  projectManager: "",
  owner: "",
  generalContractor: "",
  companyName: "",
  senderName: "",
  plansLink: "",
  jobs: [],

  purchasePrice: 300000,
  closingCosts: 6000,
  landPercent: 20,
  borrowed: 240000,
  interestRate: 6,
  constructionMonths: 0,
  amortize: true,
  loanTermYears: 30,
  holdYears: 3,
  rentGrowthRate: 0,
  expenseGrowthRate: 0,
  vacancyRate: 0,
  rooms: 0,
  adr: 0,
  appreciationRate: 0,
  exitValueOverride: null,
  sellingCostPercent: 0,
  taxRate: 0,
  depreciationLifeYears: 27.5,
  recaptureTaxRate: 0,
  items: [{ id: "i1", description: "Reno", category: "Materials", qty: 1, unitCost: 50000, color: "", groupId: "" }],
  itemGroups: [],
  expenses: [],
  incomes: [{ id: "inc1", label: "Rent", amount: 24000, frequency: "annual" }],
  importedItemIds: [],
};
approx("depreciableBasis", depreciableBasis(proj), 290000, 0.01);
approx("annualDepreciation", annualDepreciation(proj), 10545.45, 0.5);

// 7) Amortization: first month interest on 240k @6% = 240000*0.005 = 1200
const sched = buildAmortization(proj);
approx("amort month1 interest", sched[0].interest, 1200, 0.01);
approx("amort length = holdYears*12", sched.length, 36, 0);

// 8) With 0% tax, 0 vacancy, 24k rent, 0 expenses, 0 construction:
//    NOI year1 = 24000. EBITDA = 24000. dep = 10545.45. EBIT = 13454.55.
const analysis = analyzeProject(proj);
const y1 = analysis.proForma[0];
approx("y1 NOI", y1.noi, 24000, 0.01);
approx("y1 EBITDA", y1.ebitda, 24000, 0.01);
approx("y1 EBIT", y1.ebit, 13454.55, 0.5);
// interest year1 ~ sum of 12 months interest, slightly less than 1200*12 due to paydown
const i12 = sched.slice(0, 12).reduce((s, m) => s + m.interest, 0);
approx("y1 interest matches schedule", y1.interestExpense, i12, 0.01);
// cashFlow = NOI - interest - tax(0) - principal
const p12 = sched.slice(0, 12).reduce((s, m) => s + m.principal, 0);
approx("y1 cashFlow identity", y1.cashFlow, 24000 - i12 - 0 - p12, 0.01);

// 9) cashInvested = projectCost - borrowed = (300k+6k+50k) - 240k = 116000
approx("cashInvested", analysis.returns.cashInvested, 116000, 0.01);

// 10) In-service proration: 6 construction months -> year1 fraction 0.5
const proj2: Project = { ...proj, constructionMonths: 6 };
const a2 = analyzeProject(proj2);
approx("inService fraction (6mo)", a2.inServiceFractionYear1, 0.5, 0.001);
approx("y1 gross income prorated", a2.proForma[0].grossIncome, 12000, 0.01);

console.log(failures === 0 ? "\nALL TESTS PASSED" : `\n${failures} TEST(S) FAILED`);
if (failures > 0) process.exit(1);
