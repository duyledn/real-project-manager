// ---------------------------------------------------------------------------
// Financial calculation engine for the remodel estimator.
//
// DESIGN PRINCIPLES
//  * Every function here is PURE: same inputs -> same outputs, no I/O, no dates.
//  * Nothing here is persisted. The Analysis page and the Math page both call
//    analyzeProject(), so they can never disagree.
//  * Each formula is small and individually exported so the /math page can show
//    the formula next to the live numbers, and so a reviewer (or Codex) can
//    unit-test any piece in isolation.
//
// MODEL OVERVIEW (buy-rehab-hold rental, multi-year)
//  Timeline: month 1 .. holdYears*12.
//    - Months 1..constructionMonths: rehab. Loan is interest-only. No rental
//      income, no operating expenses, no depreciation yet (not "in service").
//    - Remaining months: property is in service. Loan either amortizes (P&I)
//      or stays interest-only, per project.amortize.
//  Year 1 operating items are prorated by the fraction of the year the property
//  is actually in service.
//
//  Income statement per year:
//    Gross Income
//      - Vacancy Loss
//      = Effective Gross Income (EGI)
//      - Operating Expenses
//      = NOI  (== EBITDA for a single property)
//      - Depreciation
//      = EBIT
//      - Interest Expense
//      = EBT (pre-tax income)
//      - Tax
//      = Net Income
//
//  Levered after-tax cash flow:
//    Net Income + Depreciation (non-cash addback) - Principal Paydown (cash out)
//    == NOI - Interest - Tax - Principal
// ---------------------------------------------------------------------------

import type {
  Project,
  AmortizationMonth,
  ProFormaYear,
  ExitSummary,
  ReturnsSummary,
  ProjectAnalysis,
  ExpenseFrequency,
} from "./types";
import { FREQUENCY_FACTORS } from "./types";

function toAnnual(amount: number, frequency: ExpenseFrequency): number {
  return amount * FREQUENCY_FACTORS[frequency];
}

// --- Small helpers ---------------------------------------------------------

/** Sum qty * unitCost across all renovation line items. */
export function totalRenovationCost(project: Project): number {
  return project.items.reduce((sum, i) => sum + i.qty * i.unitCost, 0);
}

/** All-in cost to get the project standing and ready: acquisition + rehab. */
export function totalProjectCost(project: Project): number {
  return project.purchasePrice + project.closingCosts + totalRenovationCost(project);
}

/**
 * Depreciable basis for a residential rental.
 * Land cannot be depreciated, so we strip out the land portion of the purchase
 * price, then add the capital improvements (the renovation). Closing costs are
 * left out here for simplicity (some capitalize, some don't); document as an
 * assumption the user can revisit.
 */
export function depreciableBasis(project: Project): number {
  const buildingValue = project.purchasePrice * (1 - project.landPercent / 100);
  return buildingValue + totalRenovationCost(project);
}

/** Straight-line annual depreciation (IRS uses 27.5 yr for residential). */
export function annualDepreciation(project: Project): number {
  if (project.depreciationLifeYears <= 0) return 0;
  return depreciableBasis(project) / project.depreciationLifeYears;
}

/** Fraction of year 1 the property is actually in service (0..1). */
export function inServiceFractionYear1(project: Project): number {
  const operatingMonths = Math.max(0, 12 - project.constructionMonths);
  return Math.min(12, operatingMonths) / 12;
}

/**
 * Total depreciation taken across the whole hold. Year 1 is prorated by the
 * in-service fraction; later years take a full year. Capped at the depreciable
 * basis (you can't depreciate more than the building is worth).
 */
export function accumulatedDepreciation(project: Project): number {
  const dep = annualDepreciation(project);
  const fraction1 = inServiceFractionYear1(project);
  const serviceYears = fraction1 + Math.max(0, project.holdYears - 1);
  return Math.min(dep * serviceYears, depreciableBasis(project));
}

/**
 * Gross annual room revenue for a hospitality / short-term-rental asset:
 * rooms × ADR × 365, before vacancy (vacancy is applied with all other income
 * in the pro forma). Returns 0 when rooms or ADR aren't set.
 */
export function annualRoomRevenue(project: Project): number {
  return (project.rooms || 0) * (project.adr || 0) * 365;
}

// --- Amortization ----------------------------------------------------------

/**
 * Standard fixed-rate monthly payment (P&I).
 * payment = P * r / (1 - (1 + r)^-n)
 * where r = monthly rate, n = number of payments. Falls back to straight
 * principal/term when the rate is zero.
 */
export function monthlyPayment(principal: number, annualRatePct: number, termYears: number): number {
  const n = termYears * 12;
  if (n <= 0) return 0;
  const r = annualRatePct / 100 / 12;
  if (r === 0) return principal / n;
  return (principal * r) / (1 - Math.pow(1 + r, -n));
}

/**
 * Build a month-by-month schedule across the entire hold.
 *  - Construction months: interest-only on the full balance, principal = 0.
 *  - After construction: amortizing P&I over loanTermYears, OR interest-only
 *    for the rest of the hold if project.amortize is false.
 * The schedule length is holdYears * 12 so it lines up exactly with the
 * yearly pro forma.
 */
export function buildAmortization(project: Project): AmortizationMonth[] {
  const totalMonths = project.holdYears * 12;
  const monthlyRate = project.interestRate / 100 / 12;
  const schedule: AmortizationMonth[] = [];

  let balance = project.borrowed;
  const pi = project.amortize
    ? monthlyPayment(project.borrowed, project.interestRate, project.loanTermYears)
    : 0;

  for (let m = 1; m <= totalMonths; m++) {
    const isConstruction = m <= project.constructionMonths;
    const interest = balance * monthlyRate;
    // Principal only pays down after construction on an amortizing loan; it can
    // never exceed the outstanding balance or go negative.
    let principal = 0;
    if (!isConstruction && project.amortize) {
      principal = Math.max(0, Math.min(pi - interest, balance));
      balance -= principal;
    }
    schedule.push({ month: m, interest, principal, payment: interest + principal, balance });
  }

  return schedule;
}

/** Aggregate the monthly schedule into a single hold-year (1-indexed). Single
 *  pass over the 12 relevant rows — no intermediate slice allocation. */
function yearSlice(schedule: AmortizationMonth[], year: number) {
  const start = (year - 1) * 12;
  const end = Math.min(year * 12, schedule.length);
  let interest = 0;
  let principal = 0;
  let payment = 0;
  let endingBalance = 0;
  for (let i = start; i < end; i++) {
    const m = schedule[i];
    interest += m.interest;
    principal += m.principal;
    payment += m.payment;
    endingBalance = m.balance;
  }
  return { interest, principal, payment, endingBalance };
}

// --- Income & expense growth ----------------------------------------------

/**
 * Split a stream into its two growth behaviours, summed once up front:
 *  - `recurring`: annualized total that grows every year by the stream's rate.
 *  - `onceYear1`: annualized total of "once" items, counted in year 1 only.
 * Because every item in a stream shares the same growth rate, the per-year
 * value is just `recurring * g^(year-1) (+ onceYear1 in year 1)` — so we never
 * have to re-walk the item list inside the year loop.
 */
function streamBases(items: { amount: number; frequency: ExpenseFrequency }[]): {
  recurring: number;
  onceYear1: number;
} {
  let recurring = 0;
  let onceYear1 = 0;
  for (const item of items) {
    if (item.frequency === "once") onceYear1 += item.amount;
    else recurring += toAnnual(item.amount, item.frequency);
  }
  return { recurring, onceYear1 };
}

// --- Pro forma -------------------------------------------------------------

/** Build the year-by-year operating statement for the whole hold period. */
export function buildProForma(project: Project, schedule: AmortizationMonth[]): ProFormaYear[] {
  const dep = annualDepreciation(project);
  const fraction1 = inServiceFractionYear1(project);
  const years: ProFormaYear[] = [];

  // Precompute the stream bases and growth factors once, outside the year loop.
  const incomeBase = streamBases(project.incomes);
  const expenseBase = streamBases(project.expenses);
  const roomRevenueBase = annualRoomRevenue(project);
  const rentGrowth = 1 + project.rentGrowthRate / 100;
  const expenseGrowth = 1 + project.expenseGrowthRate / 100;
  const vacancy = project.vacancyRate / 100;

  for (let year = 1; year <= project.holdYears; year++) {
    const proration = year === 1 ? fraction1 : 1;
    const rentFactor = Math.pow(rentGrowth, year - 1);
    const incomeOnce = year === 1 ? incomeBase.onceYear1 : 0;
    const expenseOnce = year === 1 ? expenseBase.onceYear1 : 0;

    // Room revenue grows like rent over the hold, then joins the income stream
    // so vacancy is applied to it alongside everything else.
    const roomRevenue = roomRevenueBase * rentFactor;
    const grossIncome =
      (incomeBase.recurring * rentFactor + incomeOnce + roomRevenue) * proration;
    const vacancyLoss = grossIncome * vacancy;
    const effectiveGrossIncome = grossIncome - vacancyLoss;

    const operatingExpenses =
      (expenseBase.recurring * Math.pow(expenseGrowth, year - 1) + expenseOnce) * proration;

    const noi = effectiveGrossIncome - operatingExpenses;
    const ebitda = noi; // for a single operating property these are equivalent
    const depreciation = dep * proration;
    const ebit = ebitda - depreciation;

    const { interest, principal } = yearSlice(schedule, year);
    const interestExpense = interest;
    const ebt = ebit - interestExpense;
    const tax = ebt * (project.taxRate / 100); // negative ebt -> tax shield (passive-loss caveat noted in UI)
    const netIncome = ebt - tax;

    const principalPaydown = principal;
    const cashFlow = netIncome + depreciation - principalPaydown;

    years.push({
      year,
      grossIncome,
      vacancyLoss,
      effectiveGrossIncome,
      operatingExpenses,
      noi,
      ebitda,
      depreciation,
      ebit,
      interestExpense,
      ebt,
      tax,
      netIncome,
      principalPaydown,
      cashFlow,
    });
  }

  return years;
}

// --- Exit ------------------------------------------------------------------

/**
 * Projected gross sale price at the end of the hold.
 * Market appreciation grows the as-completed value, then accumulated
 * depreciation is subtracted (the building portion wears down on the books).
 * A manual override, if set, is used verbatim.
 */
export function projectedExitValue(project: Project): number {
  if (project.exitValueOverride != null) return project.exitValueOverride;
  const asCompleted = project.purchasePrice + totalRenovationCost(project);
  const appreciated = asCompleted * Math.pow(1 + project.appreciationRate / 100, project.holdYears);
  return Math.max(0, appreciated - accumulatedDepreciation(project));
}

/**
 * Net proceeds from sale. Subtracts selling costs and loan payoff, plus a
 * depreciation-recapture tax on the depreciation taken over the hold. (Still
 * before capital-gains tax — noted in the UI.)
 */
export function buildExit(project: Project, schedule: AmortizationMonth[]): ExitSummary {
  const exitValue = projectedExitValue(project);
  const sellingCosts = exitValue * (project.sellingCostPercent / 100);
  const loanPayoff = schedule.length ? schedule[schedule.length - 1].balance : project.borrowed;
  const accDep = accumulatedDepreciation(project);
  const recaptureTax = accDep * (project.recaptureTaxRate / 100);
  const netSaleProceeds = exitValue - sellingCosts - loanPayoff - recaptureTax;
  return {
    exitValue,
    sellingCosts,
    loanPayoff,
    accumulatedDepreciation: accDep,
    recaptureTax,
    netSaleProceeds,
  };
}

// --- IRR -------------------------------------------------------------------

/**
 * Net present value of a series of cash flows at a given annual rate.
 * Evaluated by Horner's method (one division per period, no Math.pow), which
 * matters because irr() calls this ~200× per solve.
 */
export function npv(rate: number, cashFlows: number[]): number {
  const discount = 1 + rate;
  let acc = 0;
  for (let t = cashFlows.length - 1; t >= 0; t--) {
    acc = acc / discount + cashFlows[t];
  }
  return acc;
}

/**
 * Internal rate of return via bisection (robust, no derivative needed).
 * cashFlows[0] is the time-0 flow (typically negative: the equity invested).
 * Returns null if no sign change exists (IRR undefined) or it fails to bracket.
 */
export function irr(cashFlows: number[]): number | null {
  const hasPositive = cashFlows.some((c) => c > 0);
  const hasNegative = cashFlows.some((c) => c < 0);
  if (!hasPositive || !hasNegative) return null;

  let low = -0.9999; // -99.99%
  let high = 10; // 1000%
  let fLow = npv(low, cashFlows);
  let fHigh = npv(high, cashFlows);
  if (fLow * fHigh > 0) return null; // not bracketed

  for (let i = 0; i < 200; i++) {
    const mid = (low + high) / 2;
    const fMid = npv(mid, cashFlows);
    if (Math.abs(fMid) < 1e-7) return mid;
    if (fLow * fMid < 0) {
      high = mid;
      fHigh = fMid;
    } else {
      low = mid;
      fLow = fMid;
    }
  }
  return (low + high) / 2;
}

// --- Returns ---------------------------------------------------------------

export function buildReturns(
  project: Project,
  proForma: ProFormaYear[],
  exit: ExitSummary,
  schedule: AmortizationMonth[],
): ReturnsSummary {
  const renoCost = totalRenovationCost(project);
  // Reuse renoCost rather than re-summing line items via totalProjectCost().
  const projectCost = project.purchasePrice + project.closingCosts + renoCost;

  // Equity actually put in at time 0: all-in cost minus what was borrowed.
  const cashInvested = projectCost - project.borrowed;

  const totalCashFlow = proForma.reduce((s, y) => s + y.cashFlow, 0);
  const totalProfit = totalCashFlow + exit.netSaleProceeds - cashInvested;

  const cashBasis = cashInvested > 0 ? cashInvested : null;
  const cashOnCashYear1 =
    cashBasis && proForma.length ? (proForma[0].cashFlow / cashBasis) * 100 : null;
  const averageCashOnCash =
    cashBasis && proForma.length
      ? (totalCashFlow / proForma.length / cashBasis) * 100
      : null;
  const equityMultiple =
    cashBasis ? (totalCashFlow + exit.netSaleProceeds) / cashBasis : null;

  // IRR timeline: -equity at t0, annual levered cash flow each year, plus the
  // net sale proceeds added onto the final year.
  const flows = [cashInvested > 0 ? -cashInvested : 0, ...proForma.map((y) => y.cashFlow)];
  flows[flows.length - 1] += exit.netSaleProceeds;
  const irrValue = cashInvested > 0 ? irr(flows) : null;

  const noi1 = proForma.length ? proForma[0].noi : 0;
  const capRateYear1 = projectCost > 0 ? (noi1 / projectCost) * 100 : 0;

  const year1 = yearSlice(schedule, 1);
  const annualDebtServiceYear1 = year1.payment;
  const dscrYear1 = annualDebtServiceYear1 > 0 ? noi1 / annualDebtServiceYear1 : null;

  return {
    totalRenovationCost: renoCost,
    totalProjectCost: projectCost,
    cashInvested,
    totalCashFlow,
    totalProfit,
    cashOnCashYear1,
    averageCashOnCash,
    equityMultiple,
    irr: irrValue != null ? irrValue * 100 : null,
    capRateYear1,
    dscrYear1,
    annualDebtServiceYear1,
  };
}

// --- Top-level -------------------------------------------------------------

/** Run the whole analysis. This is the single entry point used by the UI. */
export function analyzeProject(project: Project): ProjectAnalysis {
  const schedule = buildAmortization(project);
  const proForma = buildProForma(project, schedule);
  const exit = buildExit(project, schedule);
  const returns = buildReturns(project, proForma, exit, schedule);

  return {
    totalRenovationCost: totalRenovationCost(project),
    depreciableBasis: depreciableBasis(project),
    annualDepreciation: annualDepreciation(project),
    inServiceFractionYear1: inServiceFractionYear1(project),
    proForma,
    exit,
    returns,
    amortization: schedule,
  };
}
