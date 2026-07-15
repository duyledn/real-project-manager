"use client";

import { useMemo } from "react";
import { Printer } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ReferenceLine,
} from "recharts";
import { useProjectContext } from "@/lib/projectContext";
import { analyzeProject, totalRenovationCost } from "@/lib/calculations";
import { useCurrency } from "@/lib/currency";
import { useTheme } from "@/lib/theme";
import { fmtPercent, fmtMultiple, fmtNumber } from "@/lib/format";
import { FREQUENCY_LABELS, FREQUENCY_FACTORS } from "@/lib/types";
import { useI18n } from "@/lib/i18n";

export default function ReportPage() {
  const { project, loading, error } = useProjectContext();
  const { fmtMoney, currency } = useCurrency();
  const { t, lang } = useI18n();
  const { theme } = useTheme(); // re-render the chart colors when the theme flips

  const analysis = useMemo(() => (project ? analyzeProject(project) : null), [project]);

  if (loading) return <div className="font-mono text-ink-muted text-sm uppercase">{t("Loading…")}</div>;
  if (error) return <div className="panel border-red text-red p-4 font-mono text-sm">{t(error)}</div>;
  if (!project || !analysis) return null;

  const { returns, proForma, exit } = analysis;
  const profitPositive = returns.totalProfit >= 0;
  const renoTotal = totalRenovationCost(project);
  const generatedOn = new Date().toLocaleDateString(lang === "vi" ? "vi-VN" : undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const chartData = proForma.map((y) => ({
    year: `Y${y.year}`,
    EBITDA: Math.round(y.ebitda),
    EBIT: Math.round(y.ebit),
    "Cash Flow": Math.round(y.cashFlow),
  }));

  // Theme-aware chart colors pulled from the live CSS tokens (re-read on theme flip).
  const css = typeof window !== "undefined" && theme ? getComputedStyle(document.documentElement) : null;
  const cv = (name: string, fallback: string) => css?.getPropertyValue(name).trim() || fallback;
  const COL = {
    ebitda: cv("--accent", "#C65D3B"),
    ebit: cv("--accent-2", "#DFA258"),
    cash: cv("--pos", "#5AA15E"),
    axis: cv("--muted", "#8C7E73"),
    grid: cv("--border", "rgba(120,86,60,0.16)"),
    text: cv("--text", "#2B2420"),
    surface: cv("--surface-solid", "#FFFFFF"),
  };
  const monoFont = "JetBrains Mono";

  const yAxisFormatter = (v: number) => {
    if (currency === "VND") {
      const billions = v / 1_000_000_000;
      if (Math.abs(billions) >= 1) return `${billions.toFixed(1)}B`;
      return `${(v / 1_000_000).toFixed(0)}M`;
    }
    return `$${(v / 1000).toFixed(0)}k`;
  };

  return (
    <div>
      {/* Export bar — hidden in the printed PDF */}
      <div className="no-print panel p-4 mb-6 flex items-center justify-between gap-4 flex-wrap">
        <div className="text-sm text-ink-muted">
          {t("A clean, investor-ready summary. Pick your currency at the top, then export. Choose")}{" "}<span className="font-semibold text-ink">&ldquo;{t("Save as PDF")}&rdquo;</span>{" "}{t("as the destination in the print dialog.")}
        </div>
        <button onClick={() => window.print()} className="btn btn-blue inline-flex items-center gap-2 shrink-0">
          <Printer size={15} /> {t("Export PDF")}
        </button>
      </div>

      {/* ===================== PRINTABLE REPORT ===================== */}
      <article className="space-y-8">
        {/* Cover / header */}
        <header className="print-avoid-break panel p-6">
          <div className="font-mono text-[11px] tracking-widest text-blueprint uppercase mb-2">
            {t("Investment Summary · Prepared for Investors & Shareholders")}
          </div>
          <h1 className="font-display font-extrabold text-4xl leading-none mb-3">{project.name}</h1>
          <div className="flex flex-wrap gap-x-6 gap-y-1 font-mono text-xs text-ink-muted">
            <span>{project.investmentStrategy || t("Buy-Rehab-Hold Rental")}</span>
            <span>{t("{years}-Year Hold", { years: project.holdYears })}</span>
            <span>{t("Prepared {date}", { date: generatedOn })}</span>
            <span>{t("Figures in {currency}", { currency })}</span>
          </div>
        </header>

        {/* Executive summary KPIs */}
        <section className="print-avoid-break">
          <ReportHeading num="01" title={t("Executive Summary")} />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Kpi label={t("IRR (levered)")} value={fmtPercent(returns.irr)} accent={(returns.irr ?? 0) >= 0 ? "green" : "red"} big />
            <Kpi label={t("Equity Multiple")} value={fmtMultiple(returns.equityMultiple)} big />
            <Kpi label={t("Total Profit")} value={fmtMoney(returns.totalProfit)} accent={profitPositive ? "green" : "red"} big />
            <Kpi label={t("Cash Invested")} value={fmtMoney(returns.cashInvested)} big />
            <Kpi label={t("Cash-on-Cash (Yr 1)")} value={fmtPercent(returns.cashOnCashYear1)} />
            <Kpi label={t("Avg Cash-on-Cash")} value={fmtPercent(returns.averageCashOnCash)} />
            <Kpi label={t("Cap Rate (Yr 1)")} value={fmtPercent(returns.capRateYear1)} />
            <Kpi label={t("DSCR (Yr 1)")} value={fmtNumber(returns.dscrYear1)} accent={(returns.dscrYear1 ?? 0) >= 1.25 ? "green" : (returns.dscrYear1 ?? 0) >= 1 ? "amber" : "red"} />
          </div>
          <div className="mt-3 panel-2 p-4 flex flex-wrap items-baseline gap-3" style={{ borderColor: profitPositive ? "var(--pos)" : "var(--neg)" }}>
            <span className={`font-display font-extrabold text-lg uppercase ${profitPositive ? "text-green" : "text-red"}`}>
              {t(profitPositive ? "Projected Total Profit" : "Projected Total Loss")}
            </span>
            <span className={`font-mono font-bold text-2xl ${profitPositive ? "text-green" : "text-red"}`}>
              {fmtMoney(Math.abs(returns.totalProfit))}
            </span>
            <span className="font-mono text-[11px] text-ink-muted w-full">
              {t("Over {years} years · {cashFlow} cumulative cash flow + {saleProceeds} net sale proceeds, less {invested} equity invested.", { years: project.holdYears, cashFlow: fmtMoney(returns.totalCashFlow), saleProceeds: fmtMoney(exit.netSaleProceeds), invested: fmtMoney(returns.cashInvested) })}
            </span>
          </div>
        </section>

        {/* Capitalization / sources & uses */}
        <section className="print-avoid-break">
          <ReportHeading num="02" title={t("Capitalization")} />
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="panel divide-y divide-hair overflow-hidden">
              <RowKV label={t("Purchase Price")} value={fmtMoney(project.purchasePrice)} />
              <RowKV label={t("Closing Costs")} value={fmtMoney(project.closingCosts)} />
              <RowKV label={t("Renovation Budget")} value={fmtMoney(renoTotal)} />
              <RowKV label={t("Total Project Cost")} value={fmtMoney(returns.totalProjectCost)} bold />
            </div>
            <div className="panel divide-y divide-hair overflow-hidden">
              <RowKV label={t("Debt (Borrowed)")} value={fmtMoney(project.borrowed)} />
              <RowKV label={t("Equity (Cash Invested)")} value={fmtMoney(returns.cashInvested)} />
              <RowKV label={t("Interest Rate")} value={`${fmtNumber(project.interestRate, 2)}%`} />
              <RowKV
                label={t("Loan Structure")}
                value={project.amortize ? t("Amortizing P&I · {years} yr", { years: project.loanTermYears }) : t("Interest-only")}
              />
            </div>
          </div>
        </section>

        {/* Renovation scope */}
        <section className="print-avoid-break">
          <ReportHeading num="03" title={t("Renovation Scope & Budget")} />
          <div className="panel overflow-hidden">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b-[1.5px] border-ink">
                  <th className="text-left label-mono p-2.5">{t("Item")}</th>
                  <th className="text-left label-mono p-2.5">{t("Category")}</th>
                  <th className="text-right label-mono p-2.5 w-20">{t("Qty")}</th>
                  <th className="text-right label-mono p-2.5 w-28">{t("Unit Cost")}</th>
                  <th className="text-right label-mono p-2.5 w-28">{t("Total")}</th>
                </tr>
              </thead>
              <tbody>
                {project.items.map((i) => (
                  <tr key={i.id} className="border-b border-hair last:border-0">
                    <td className="p-2.5">{i.description || "—"}</td>
                    <td className="p-2.5 text-ink-muted">{t(i.category)}</td>
                    <td className="p-2.5 font-mono text-right">{fmtNumber(i.qty, 0)}</td>
                    <td className="p-2.5 font-mono text-right">{fmtMoney(i.unitCost)}</td>
                    <td className="p-2.5 font-mono text-right font-semibold">{fmtMoney(i.qty * i.unitCost)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-[1.5px] border-ink">
                  <td colSpan={4} className="p-2.5 label-mono font-semibold">{t("Renovation Total")}</td>
                  <td className="p-2.5 font-mono font-bold text-right">{fmtMoney(renoTotal)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>

        {/* Income & expenses with frequency */}
        <section className="print-avoid-break">
          <ReportHeading num="04" title={t("Income & Operating Expenses")} />
          <div className="grid lg:grid-cols-2 gap-3">
            <FreqTable title={t("Revenue Sources")} rows={project.incomes} fmtMoney={fmtMoney} />
            <FreqTable title={t("Operating Expenses")} rows={project.expenses} fmtMoney={fmtMoney} />
          </div>
        </section>

        {/* Assumptions */}
        <section className="print-avoid-break">
          <ReportHeading num="05" title={t("Key Assumptions")} />
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Kpi label={t("Hold Period")} value={t("{n} yr", { n: project.holdYears })} />
            <Kpi label={t("Rent Growth")} value={t("{rate}%/yr", { rate: fmtNumber(project.rentGrowthRate, 1) })} />
            <Kpi label={t("Expense Growth")} value={t("{rate}%/yr", { rate: fmtNumber(project.expenseGrowthRate, 1) })} />
            <Kpi label={t("Vacancy Allowance")} value={`${fmtNumber(project.vacancyRate, 1)}%`} />
            <Kpi label={t("Appreciation")} value={t("{rate}%/yr", { rate: fmtNumber(project.appreciationRate, 1) })} />
            <Kpi label={t("Selling Costs")} value={`${fmtNumber(project.sellingCostPercent, 1)}%`} />
            <Kpi label={t("Marginal Tax Rate")} value={`${fmtNumber(project.taxRate, 0)}%`} />
            <Kpi label={t("Depreciation Life")} value={t("{n} yr", { n: fmtNumber(project.depreciationLifeYears, 1) })} />
          </div>
        </section>

        {/* Earnings chart */}
        <section className="print-avoid-break print-page-break">
          <ReportHeading num="06" title={t("Earnings & Cash Flow by Year")} />
          <div className="panel p-5">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={COL.grid} />
                  <XAxis dataKey="year" tick={{ fontSize: 12, fontFamily: monoFont, fill: COL.axis }} stroke={COL.grid} />
                  <YAxis tick={{ fontSize: 11, fontFamily: monoFont, fill: COL.axis }} stroke={COL.grid} tickFormatter={yAxisFormatter} width={56} />
                  <Tooltip
                    formatter={(v: number) => fmtMoney(v)}
                    cursor={{ fill: COL.grid }}
                    contentStyle={{ fontFamily: monoFont, fontSize: 12, borderRadius: 12, border: `1px solid ${COL.grid}`, background: COL.surface, color: COL.text }}
                  />
                  <Legend wrapperStyle={{ fontFamily: monoFont, fontSize: 11, color: COL.axis }} />
                  <ReferenceLine y={0} stroke={COL.axis} />
                  <Bar dataKey="EBITDA" fill={COL.ebitda} radius={[4, 4, 0, 0]} isAnimationActive={false} />
                  <Bar dataKey="EBIT" fill={COL.ebit} radius={[4, 4, 0, 0]} isAnimationActive={false} />
                  <Bar dataKey="Cash Flow" name={t("Cash Flow")} fill={COL.cash} radius={[4, 4, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* Pro forma */}
        <section className="print-avoid-break">
          <ReportHeading num="07" title={t("Operating Pro Forma")} />
          <div className="panel overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b-[1.5px] border-ink">
                  <th className="text-left label-mono p-2.5">{t("Line")}</th>
                  {proForma.map((y) => (
                    <th key={y.year} className="text-right label-mono p-2.5">{t("Year {year}", { year: y.year })}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <PFRow label={t("Gross Income")} values={proForma.map((y) => y.grossIncome)} fmtMoney={fmtMoney} />
                <PFRow label={t("Vacancy Loss")} values={proForma.map((y) => -y.vacancyLoss)} muted fmtMoney={fmtMoney} />
                <PFRow label={t("Effective Gross Income")} values={proForma.map((y) => y.effectiveGrossIncome)} fmtMoney={fmtMoney} />
                <PFRow label={t("Operating Expenses")} values={proForma.map((y) => -y.operatingExpenses)} muted fmtMoney={fmtMoney} />
                <PFRow label={t("NOI / EBITDA")} values={proForma.map((y) => y.ebitda)} bold fmtMoney={fmtMoney} />
                <PFRow label={t("Depreciation")} values={proForma.map((y) => -y.depreciation)} muted fmtMoney={fmtMoney} />
                <PFRow label={t("EBIT")} values={proForma.map((y) => y.ebit)} bold fmtMoney={fmtMoney} />
                <PFRow label={t("Interest Expense")} values={proForma.map((y) => -y.interestExpense)} muted fmtMoney={fmtMoney} />
                <PFRow label={t("Pre-Tax Income (EBT)")} values={proForma.map((y) => y.ebt)} fmtMoney={fmtMoney} />
                <PFRow label={t("Tax")} values={proForma.map((y) => -y.tax)} muted fmtMoney={fmtMoney} />
                <PFRow label={t("Net Income")} values={proForma.map((y) => y.netIncome)} bold fmtMoney={fmtMoney} />
                <PFRow label={t("Levered Cash Flow")} values={proForma.map((y) => y.cashFlow)} highlight fmtMoney={fmtMoney} />
              </tbody>
            </table>
          </div>
        </section>

        {/* Exit */}
        <section className="print-avoid-break">
          <ReportHeading num="08" title={t("Exit Summary — End of Year {year}", { year: project.holdYears })} />
          <div className="panel divide-y divide-hair overflow-hidden">
            <RowKV label={t("Projected Sale Price")} value={fmtMoney(exit.exitValue)} />
            <RowKV label={t("Selling Costs")} value={fmtMoney(-exit.sellingCosts)} muted />
            <RowKV label={t("Loan Payoff")} value={fmtMoney(-exit.loanPayoff)} muted />
            <RowKV label={t("Net Sale Proceeds")} value={fmtMoney(exit.netSaleProceeds)} bold />
          </div>
        </section>

        {/* Disclaimer */}
        <footer className="print-avoid-break text-[10.5px] text-ink-muted leading-relaxed border-t border-hair pt-4">
          <p className="mb-1 font-semibold uppercase tracking-wider">{t("Disclaimer")}</p>
          <p>
            {t("This report is a forward-looking projection generated from user-supplied assumptions and is provided for informational purposes only. Actual results will vary. Figures are shown before capital-gains tax and depreciation recapture at sale; rental-loss deductibility depends on passive-activity rules and individual circumstances. This is not investment, tax, or legal advice — consult qualified professionals before making any investment decision.")}
          </p>
        </footer>
      </article>
    </div>
  );
}

// --- Presentational helpers ------------------------------------------------

function ReportHeading({ num, title }: { num: string; title: string }) {
  return (
    <div className="flex items-baseline gap-3 mb-3">
      <span className="font-display font-extrabold text-2xl text-blueprint leading-none">{num}</span>
      <h2 className="font-display font-extrabold text-xl uppercase tracking-wide">{title}</h2>
    </div>
  );
}

function Kpi({ label, value, accent, big }: { label: string; value: string; accent?: "green" | "red" | "amber"; big?: boolean }) {
  const color = accent === "green" ? "text-green" : accent === "red" ? "text-red" : accent === "amber" ? "text-amber" : "text-ink";
  return (
    <div className="panel-2 p-3.5">
      <div className="label-mono mb-1">{label}</div>
      <div className={`font-mono font-bold ${big ? "text-xl" : "text-base"} ${color}`}>{value}</div>
    </div>
  );
}

function RowKV({ label, value, bold, muted }: { label: string; value: string; bold?: boolean; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5">
      <span className={`${bold ? "font-semibold" : "text-sm"} ${muted ? "text-ink-muted" : ""}`}>{label}</span>
      <span className={`font-mono ${bold ? "font-bold" : ""} ${muted ? "text-ink-muted" : ""}`}>{value}</span>
    </div>
  );
}

function PFRow({
  label, values, bold, muted, highlight, fmtMoney,
}: {
  label: string; values: number[]; bold?: boolean; muted?: boolean; highlight?: boolean;
  fmtMoney: (n: number | null | undefined) => string;
}) {
  return (
    <tr className={`border-b border-hair last:border-0 ${highlight ? "bg-paper" : ""}`}>
      <td className={`p-2.5 ${bold || highlight ? "font-semibold" : ""} ${muted ? "text-ink-muted" : ""}`}>{label}</td>
      {values.map((v, i) => (
        <td key={i} className={`p-2.5 font-mono text-right ${bold || highlight ? "font-bold" : ""} ${muted ? "text-ink-muted" : ""} ${highlight ? (v >= 0 ? "text-green" : "text-red") : ""}`}>
          {fmtMoney(v)}
        </td>
      ))}
    </tr>
  );
}

function FreqTable({
  title, rows, fmtMoney,
}: {
  title: string;
  rows: { id: string; label: string; amount: number; frequency: keyof typeof FREQUENCY_FACTORS }[];
  fmtMoney: (n: number | null | undefined) => string;
}) {
  const { t } = useI18n();
  const annualTotal = rows.reduce((s, r) => s + r.amount * FREQUENCY_FACTORS[r.frequency], 0);
  return (
    <div className="panel overflow-hidden">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b-[1.5px] border-ink">
            <th className="text-left label-mono p-2.5" colSpan={3}>{title}</th>
          </tr>
          <tr className="border-b border-hair">
            <th className="text-left label-mono p-2.5">{t("Item")}</th>
            <th className="text-right label-mono p-2.5 w-32">{t("Per Period")}</th>
            <th className="text-right label-mono p-2.5 w-28">{t("Annualized")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-hair last:border-0">
              <td className="p-2.5">
                {r.label || "—"}
                <span className="text-ink-muted text-xs"> · {t(FREQUENCY_LABELS[r.frequency])}</span>
              </td>
              <td className="p-2.5 font-mono text-right">{fmtMoney(r.amount)}</td>
              <td className="p-2.5 font-mono text-right">
                {r.frequency === "once" ? fmtMoney(r.amount) : fmtMoney(r.amount * FREQUENCY_FACTORS[r.frequency])}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-[1.5px] border-ink">
            <td className="p-2.5 label-mono font-semibold" colSpan={2}>{t("Annual Total")}</td>
            <td className="p-2.5 font-mono font-bold text-right">{fmtMoney(annualTotal)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
