"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useProjectContext } from "@/lib/projectContext";
import {
  analyzeProject,
  totalRenovationCost,
  totalProjectCost,
  depreciableBasis,
  annualDepreciation,
  inServiceFractionYear1,
  monthlyPayment,
  projectedExitValue,
  accumulatedDepreciation,
  annualRoomRevenue,
} from "@/lib/calculations";
import { fmtPercent, fmtNumber } from "@/lib/format";
import { useCurrency } from "@/lib/currency";
import { useI18n } from "@/lib/i18n";
import { SectionHeader } from "@/components/fields";
import type { Project } from "@/lib/types";

export default function MathPage() {
  const { project, loading, error } = useProjectContext();
  const { fmtMoney } = useCurrency();
  const { t } = useI18n();
  const analysis = useMemo(() => (project ? analyzeProject(project) : null), [project]);

  if (loading) return <div className="font-mono text-ink-muted text-sm uppercase">{t("Loading…")}</div>;
  if (error) return <div className="panel border-red text-red p-4 font-mono text-sm">{t(error)}</div>;
  if (!project || !analysis) return null;

  const p = project;
  const renoTotal = totalRenovationCost(p);
  const projectCost = totalProjectCost(p);
  const basis = depreciableBasis(p);
  const dep = annualDepreciation(p);
  const accDep = accumulatedDepreciation(p);
  const roomRev = annualRoomRevenue(p);
  const fraction1 = inServiceFractionYear1(p);
  const pmt = p.amortize ? monthlyPayment(p.borrowed, p.interestRate, p.loanTermYears) : p.borrowed * (p.interestRate / 100 / 12);
  const y1 = analysis.proForma[0];
  const exitVal = projectedExitValue(p);

  return (
    <div className="space-y-9">
      <div className="panel p-5">
        <p className="text-sm text-ink-muted leading-relaxed">
          {t("This page shows every formula with your current numbers plugged in, so you can audit the math line by line. Change any input on the")} <span className="text-blueprint font-semibold">{t("Inputs")}</span> {t("tab and these recompute instantly. Nothing here is stored separately — it is derived from the same engine the Analysis tab uses.")}
        </p>
      </div>

      <section>
        <SectionHeader num="01" title={t("Cost Basis")} />
        <div className="space-y-3">
          <Formula
            title={t("Total Renovation Cost")}
            formula={t("Σ (quantity × unit cost)")}
            substitution={p.items.map((i) => `${fmtMoney(i.qty * i.unitCost)}`).join(" + ") || "0"}
            result={fmtMoney(renoTotal)}
          />
          <Formula
            title={t("Total Project Cost")}
            formula={t("purchase price + closing costs + renovation")}
            substitution={`${fmtMoney(p.purchasePrice)} + ${fmtMoney(p.closingCosts)} + ${fmtMoney(renoTotal)}`}
            result={fmtMoney(projectCost)}
          />
          <Formula
            title={t("Cash Invested (equity)")}
            formula={t("total project cost − borrowed")}
            substitution={`${fmtMoney(projectCost)} − ${fmtMoney(p.borrowed)}`}
            result={fmtMoney(analysis.returns.cashInvested)}
          />
        </div>
      </section>

      <section>
        <SectionHeader num="02" title={t("Depreciation")} />
        <div className="space-y-3">
          <Formula
            title={t("Depreciable Basis")}
            formula={t("purchase × (1 − land%) + renovation")}
            substitution={`${fmtMoney(p.purchasePrice)} × (1 − ${(p.landPercent / 100).toFixed(2)}) + ${fmtMoney(renoTotal)}`}
            result={fmtMoney(basis)}
            note={t("Land isn't depreciable, so its share of the purchase price is removed.")}
          />
          <Formula
            title={t("Annual Depreciation")}
            formula={t("depreciable basis ÷ depreciation life")}
            substitution={`${fmtMoney(basis)} ÷ ${p.depreciationLifeYears} ${t("yr")}`}
            result={fmtMoney(dep)}
          />
          <Formula
            title={t("Year-1 In-Service Fraction")}
            formula={t("(12 − construction months) ÷ 12")}
            substitution={`(12 − ${p.constructionMonths}) ÷ 12`}
            result={fmtNumber(fraction1, 3)}
            note={t("Year-1 income, expenses, and depreciation are scaled by this fraction.")}
          />
        </div>
      </section>

      <section>
        <SectionHeader num="03" title={t("Financing")} />
        <div className="space-y-3">
          <Formula
            title={t(p.amortize ? "Monthly Payment (P&I)" : "Monthly Interest-Only Payment")}
            formula={t(p.amortize ? "P × r ÷ (1 − (1 + r)^−n),  r = rate/12,  n = term×12" : "P × (rate ÷ 12)")}
            substitution={p.amortize
              ? `${fmtMoney(p.borrowed)} × ${(p.interestRate / 100 / 12).toFixed(5)} ÷ (1 − (1 + ${(p.interestRate / 100 / 12).toFixed(5)})^−${p.loanTermYears * 12})`
              : `${fmtMoney(p.borrowed)} × ${(p.interestRate / 100 / 12).toFixed(5)}`}
            result={fmtMoney(pmt)}
          />
          <Formula
            title={t("Construction-Period Interest (interest-only)")}
            formula={t("borrowed × monthly rate × construction months")}
            substitution={`${fmtMoney(p.borrowed)} × ${(p.interestRate / 100 / 12).toFixed(5)} × ${p.constructionMonths}`}
            result={fmtMoney(p.borrowed * (p.interestRate / 100 / 12) * p.constructionMonths)}
          />
        </div>
      </section>

      <section>
        <SectionHeader num="04" title={t("Year 1 Income Statement")} />
        <div className="space-y-3">
          {roomRev > 0 && (
            <Formula title={t("Room Revenue (gross / yr)")} formula={t("rooms × ADR × 365")} substitution={`${p.rooms} × ${fmtMoney(p.adr)} × 365`} result={fmtMoney(roomRev)} note={t("Joins the income stream below, then vacancy is applied to the combined gross.")} />
          )}
          <Formula title={t("Gross Income (Yr 1)")} formula={t("(Σ income + room revenue) × in-service fraction")} substitution={t("({roomRevenue} room + line items) × {fraction}", { roomRevenue: fmtMoney(roomRev), fraction: fmtNumber(fraction1, 3) })} result={fmtMoney(y1.grossIncome)} />
          <Formula title={t("Vacancy Loss")} formula={t("gross income × vacancy %")} substitution={`${fmtMoney(y1.grossIncome)} × ${(p.vacancyRate / 100).toFixed(3)}`} result={fmtMoney(y1.vacancyLoss)} />
          <Formula title={t("Effective Gross Income")} formula={t("gross income − vacancy")} substitution={`${fmtMoney(y1.grossIncome)} − ${fmtMoney(y1.vacancyLoss)}`} result={fmtMoney(y1.effectiveGrossIncome)} />
          <Formula title={t("NOI / EBITDA")} formula={t("EGI − operating expenses")} substitution={`${fmtMoney(y1.effectiveGrossIncome)} − ${fmtMoney(y1.operatingExpenses)}`} result={fmtMoney(y1.noi)} note={t("For a single operating property, NOI is the EBITDA equivalent.")} />
          <Formula title={t("EBIT")} formula={t("EBITDA − depreciation")} substitution={`${fmtMoney(y1.ebitda)} − ${fmtMoney(y1.depreciation)}`} result={fmtMoney(y1.ebit)} />
          <Formula title={t("Pre-Tax Income (EBT)")} formula={t("EBIT − interest expense")} substitution={`${fmtMoney(y1.ebit)} − ${fmtMoney(y1.interestExpense)}`} result={fmtMoney(y1.ebt)} />
          <Formula title={t("Tax")} formula={t("EBT × tax rate")} substitution={`${fmtMoney(y1.ebt)} × ${(p.taxRate / 100).toFixed(2)}`} result={fmtMoney(y1.tax)} />
          <Formula title={t("Net Income")} formula={t("EBT − tax")} substitution={`${fmtMoney(y1.ebt)} − ${fmtMoney(y1.tax)}`} result={fmtMoney(y1.netIncome)} />
          <Formula title={t("Levered Cash Flow")} formula={t("net income + depreciation − principal paydown")} substitution={`${fmtMoney(y1.netIncome)} + ${fmtMoney(y1.depreciation)} − ${fmtMoney(y1.principalPaydown)}`} result={fmtMoney(y1.cashFlow)} highlight />
        </div>
      </section>

      <section>
        <SectionHeader num="05" title={t("Exit & Returns")} />
        <div className="space-y-3">
          <Formula
            title={t("Accumulated Depreciation")}
            formula={t("annual depreciation × years in service (capped at basis)")}
            substitution={`${fmtMoney(dep)} × ${fmtNumber(fraction1 + Math.max(0, p.holdYears - 1), 2)} ${t("yr")}`}
            result={fmtMoney(accDep)}
            note={t("Subtracted from the appreciated value below and taxed as recapture at sale.")}
          />
          <Formula
            title={t("Projected Exit Value")}
            formula={t(p.exitValueOverride != null ? "manual override" : "(purchase + renovation) × (1 + appreciation)^years − accumulated depreciation")}
            substitution={p.exitValueOverride != null ? t("user-set") : `(${fmtMoney(p.purchasePrice)} + ${fmtMoney(renoTotal)}) × (1 + ${(p.appreciationRate / 100).toFixed(3)})^${p.holdYears} − ${fmtMoney(accDep)}`}
            result={fmtMoney(exitVal)}
          />
          <Formula title={t("Depreciation Recapture Tax")} formula={t("accumulated depreciation × recapture rate")} substitution={`${fmtMoney(accDep)} × ${(p.recaptureTaxRate / 100).toFixed(2)}`} result={fmtMoney(analysis.exit.recaptureTax)} />
          <Formula title={t("Net Sale Proceeds")} formula={t("exit value − selling costs − loan payoff − recapture tax")} substitution={`${fmtMoney(analysis.exit.exitValue)} − ${fmtMoney(analysis.exit.sellingCosts)} − ${fmtMoney(analysis.exit.loanPayoff)} − ${fmtMoney(analysis.exit.recaptureTax)}`} result={fmtMoney(analysis.exit.netSaleProceeds)} />
          <Formula title={t("Total Profit")} formula={t("Σ cash flow + net sale proceeds − cash invested")} substitution={`${fmtMoney(analysis.returns.totalCashFlow)} + ${fmtMoney(analysis.exit.netSaleProceeds)} − ${fmtMoney(analysis.returns.cashInvested)}`} result={fmtMoney(analysis.returns.totalProfit)} highlight />
          <Formula title={t("Equity Multiple")} formula={t("(Σ cash flow + net sale proceeds) ÷ cash invested")} substitution={`(${fmtMoney(analysis.returns.totalCashFlow)} + ${fmtMoney(analysis.exit.netSaleProceeds)}) ÷ ${fmtMoney(analysis.returns.cashInvested)}`} result={`${fmtNumber(analysis.returns.equityMultiple)}×`} />
          <Formula title={t("Cap Rate (Yr 1)")} formula={t("Year-1 NOI ÷ total project cost")} substitution={`${fmtMoney(y1.noi)} ÷ ${fmtMoney(projectCost)}`} result={fmtPercent(analysis.returns.capRateYear1)} />
          <Formula title={t("DSCR (Yr 1)")} formula={t("Year-1 NOI ÷ annual debt service")} substitution={`${fmtMoney(y1.noi)} ÷ ${fmtMoney(analysis.returns.annualDebtServiceYear1)}`} result={fmtNumber(analysis.returns.dscrYear1)} />
          <Formula
            title={t("IRR (levered)")}
            formula={t("rate where NPV of [−cash invested, yearly cash flows, + sale proceeds] = 0")}
            substitution={t("solve: 0 = Σ CFₜ ÷ (1 + IRR)ᵗ")}
            result={fmtPercent(analysis.returns.irr)}
            note={t("Solved numerically by bisection over the cash-flow timeline below.")}
          />
        </div>
      </section>

      <AmortizationDetail project={p} analysis={analysis} fmtMoney={fmtMoney} />
    </div>
  );
}

function Formula({
  title,
  formula,
  substitution,
  result,
  note,
  highlight,
}: {
  title: string;
  formula: string;
  substitution: string;
  result: string;
  note?: string;
  highlight?: boolean;
}) {
  const { t } = useI18n();

  return (
    <div className={`panel p-4 ${highlight ? "border-blueprint" : ""}`}>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="font-semibold">{title}</div>
        <div className={`font-mono font-bold text-lg ${highlight ? "text-blueprint" : "text-ink"}`}>{result}</div>
      </div>
      <div className="font-mono text-xs text-ink-muted mt-2 leading-relaxed">
        <span className="text-blueprint">{t("formula:")}</span> {formula}
      </div>
      <div className="font-mono text-xs text-ink-muted mt-1 leading-relaxed break-words">
        <span className="text-amber">{t("with your numbers:")}</span> {substitution} = <span className="text-ink font-semibold">{result}</span>
      </div>
      {note && <div className="text-[11px] text-ink-muted mt-2 leading-relaxed italic">{note}</div>}
    </div>
  );
}

function AmortizationDetail({ project, analysis, fmtMoney }: { project: Project; analysis: ReturnType<typeof analyzeProject>; fmtMoney: (n: number | null | undefined) => string }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  // Show one representative row per year to keep it scannable, with a full toggle.
  const [showAll, setShowAll] = useState(false);
  const rows = showAll ? analysis.amortization : analysis.amortization.filter((m) => m.month % 12 === 0 || m.month === 1);

  return (
    <section>
      <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-2 font-display font-bold text-xl uppercase tracking-wide">
        <ChevronDown size={20} className={`transition-transform ${open ? "" : "-rotate-90"}`} />
        {t("Amortization Schedule")}
      </button>
      {open && (
        <div className="mt-4">
          <div className="flex justify-end mb-2">
            <button onClick={() => setShowAll((s) => !s)} className="font-mono text-[11px] uppercase tracking-wider text-blueprint hover:underline">
              {t(showAll ? "Show year-ends only" : "Show every month")}
            </button>
          </div>
          <div className="panel overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full border-collapse min-w-[480px] text-sm">
              <thead className="sticky top-0 bg-panel">
                <tr className="border-b-[1.5px] border-ink">
                  <th className="text-left label-mono p-2.5">{t("Month")}</th>
                  <th className="text-right label-mono p-2.5">{t("Payment")}</th>
                  <th className="text-right label-mono p-2.5">{t("Interest")}</th>
                  <th className="text-right label-mono p-2.5">{t("Principal")}</th>
                  <th className="text-right label-mono p-2.5">{t("Balance")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((m) => (
                  <tr key={m.month} className={`border-b border-hair last:border-0 ${m.month <= project.constructionMonths ? "text-amber" : ""}`}>
                    <td className="p-2.5 font-mono">{m.month}{m.month <= project.constructionMonths ? t(" (constr.)") : ""}</td>
                    <td className="p-2.5 font-mono text-right">{fmtMoney(m.payment)}</td>
                    <td className="p-2.5 font-mono text-right">{fmtMoney(m.interest)}</td>
                    <td className="p-2.5 font-mono text-right">{fmtMoney(m.principal)}</td>
                    <td className="p-2.5 font-mono text-right">{fmtMoney(m.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
