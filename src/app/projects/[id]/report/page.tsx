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
import { fmtPercent, fmtMultiple, fmtNumber } from "@/lib/format";
import { FREQUENCY_LABELS, FREQUENCY_FACTORS } from "@/lib/types";

export default function ReportPage() {
  const { project, loading, error } = useProjectContext();
  const { fmtMoney, currency } = useCurrency();

  const analysis = useMemo(() => (project ? analyzeProject(project) : null), [project]);

  if (loading) return <div className="font-mono text-ink-muted text-sm uppercase">Loading…</div>;
  if (error) return <div className="panel border-red text-red p-4 font-mono text-sm">{error}</div>;
  if (!project || !analysis) return null;

  const { returns, proForma, exit } = analysis;
  const profitPositive = returns.totalProfit >= 0;
  const renoTotal = totalRenovationCost(project);
  const generatedOn = new Date().toLocaleDateString(undefined, {
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
          A clean, investor-ready summary. Pick your currency at the top, then export.
          Choose <span className="font-semibold text-ink">&ldquo;Save as PDF&rdquo;</span> as the
          destination in the print dialog.
        </div>
        <button onClick={() => window.print()} className="btn btn-blue inline-flex items-center gap-2 shrink-0">
          <Printer size={15} /> Export PDF
        </button>
      </div>

      {/* ===================== PRINTABLE REPORT ===================== */}
      <article className="space-y-8">
        {/* Cover / header */}
        <header className="print-avoid-break border-[1.5px] border-ink p-6 bg-panel">
          <div className="font-mono text-[11px] tracking-widest text-blueprint uppercase mb-2">
            Investment Summary · Prepared for Investors &amp; Shareholders
          </div>
          <h1 className="font-display font-extrabold text-4xl leading-none mb-3">{project.name}</h1>
          <div className="flex flex-wrap gap-x-6 gap-y-1 font-mono text-xs text-ink-muted">
            <span>Buy-Rehab-Hold Rental</span>
            <span>{project.holdYears}-Year Hold</span>
            <span>Prepared {generatedOn}</span>
            <span>Figures in {currency}</span>
          </div>
        </header>

        {/* Executive summary KPIs */}
        <section className="print-avoid-break">
          <ReportHeading num="01" title="Executive Summary" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Kpi label="IRR (levered)" value={fmtPercent(returns.irr)} accent={(returns.irr ?? 0) >= 0 ? "green" : "red"} big />
            <Kpi label="Equity Multiple" value={fmtMultiple(returns.equityMultiple)} big />
            <Kpi label="Total Profit" value={fmtMoney(returns.totalProfit)} accent={profitPositive ? "green" : "red"} big />
            <Kpi label="Cash Invested" value={fmtMoney(returns.cashInvested)} big />
            <Kpi label="Cash-on-Cash (Yr 1)" value={fmtPercent(returns.cashOnCashYear1)} />
            <Kpi label="Avg Cash-on-Cash" value={fmtPercent(returns.averageCashOnCash)} />
            <Kpi label="Cap Rate (Yr 1)" value={fmtPercent(returns.capRateYear1)} />
            <Kpi label="DSCR (Yr 1)" value={fmtNumber(returns.dscrYear1)} accent={(returns.dscrYear1 ?? 0) >= 1.25 ? "green" : (returns.dscrYear1 ?? 0) >= 1 ? "amber" : "red"} />
          </div>
          <div className={`mt-3 border-[1.5px] p-4 bg-panel flex flex-wrap items-baseline gap-3 ${profitPositive ? "border-green" : "border-red"}`}>
            <span className={`font-display font-extrabold text-lg uppercase ${profitPositive ? "text-green" : "text-red"}`}>
              {profitPositive ? "Projected Total Profit" : "Projected Total Loss"}
            </span>
            <span className={`font-mono font-bold text-2xl ${profitPositive ? "text-green" : "text-red"}`}>
              {fmtMoney(Math.abs(returns.totalProfit))}
            </span>
            <span className="font-mono text-[11px] text-ink-muted w-full">
              Over {project.holdYears} years · {fmtMoney(returns.totalCashFlow)} cumulative cash flow +{" "}
              {fmtMoney(exit.netSaleProceeds)} net sale proceeds, less {fmtMoney(returns.cashInvested)} equity invested.
            </span>
          </div>
        </section>

        {/* Capitalization / sources & uses */}
        <section className="print-avoid-break">
          <ReportHeading num="02" title="Capitalization" />
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="border-[1.5px] border-ink bg-panel divide-y divide-hair">
              <RowKV label="Purchase Price" value={fmtMoney(project.purchasePrice)} />
              <RowKV label="Closing Costs" value={fmtMoney(project.closingCosts)} />
              <RowKV label="Renovation Budget" value={fmtMoney(renoTotal)} />
              <RowKV label="Total Project Cost" value={fmtMoney(returns.totalProjectCost)} bold />
            </div>
            <div className="border-[1.5px] border-ink bg-panel divide-y divide-hair">
              <RowKV label="Debt (Borrowed)" value={fmtMoney(project.borrowed)} />
              <RowKV label="Equity (Cash Invested)" value={fmtMoney(returns.cashInvested)} />
              <RowKV label="Interest Rate" value={`${fmtNumber(project.interestRate, 2)}%`} />
              <RowKV
                label="Loan Structure"
                value={project.amortize ? `Amortizing P&I · ${project.loanTermYears} yr` : "Interest-only"}
              />
            </div>
          </div>
        </section>

        {/* Renovation scope */}
        <section className="print-avoid-break">
          <ReportHeading num="03" title="Renovation Scope & Budget" />
          <div className="border-[1.5px] border-ink bg-panel overflow-hidden">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b-[1.5px] border-ink">
                  <th className="text-left label-mono p-2.5">Item</th>
                  <th className="text-left label-mono p-2.5">Category</th>
                  <th className="text-right label-mono p-2.5 w-20">Qty</th>
                  <th className="text-right label-mono p-2.5 w-28">Unit Cost</th>
                  <th className="text-right label-mono p-2.5 w-28">Total</th>
                </tr>
              </thead>
              <tbody>
                {project.items.map((i) => (
                  <tr key={i.id} className="border-b border-hair last:border-0">
                    <td className="p-2.5">{i.description || "—"}</td>
                    <td className="p-2.5 text-ink-muted">{i.category}</td>
                    <td className="p-2.5 font-mono text-right">{fmtNumber(i.qty, 0)}</td>
                    <td className="p-2.5 font-mono text-right">{fmtMoney(i.unitCost)}</td>
                    <td className="p-2.5 font-mono text-right font-semibold">{fmtMoney(i.qty * i.unitCost)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-[1.5px] border-ink">
                  <td colSpan={4} className="p-2.5 label-mono font-semibold">Renovation Total</td>
                  <td className="p-2.5 font-mono font-bold text-right">{fmtMoney(renoTotal)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>

        {/* Income & expenses with frequency */}
        <section className="print-avoid-break">
          <ReportHeading num="04" title="Income & Operating Expenses" />
          <div className="grid lg:grid-cols-2 gap-3">
            <FreqTable title="Revenue Sources" rows={project.incomes} fmtMoney={fmtMoney} />
            <FreqTable title="Operating Expenses" rows={project.expenses} fmtMoney={fmtMoney} />
          </div>
        </section>

        {/* Assumptions */}
        <section className="print-avoid-break">
          <ReportHeading num="05" title="Key Assumptions" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Kpi label="Hold Period" value={`${project.holdYears} yr`} />
            <Kpi label="Rent Growth" value={`${fmtNumber(project.rentGrowthRate, 1)}%/yr`} />
            <Kpi label="Expense Growth" value={`${fmtNumber(project.expenseGrowthRate, 1)}%/yr`} />
            <Kpi label="Vacancy Allowance" value={`${fmtNumber(project.vacancyRate, 1)}%`} />
            <Kpi label="Appreciation" value={`${fmtNumber(project.appreciationRate, 1)}%/yr`} />
            <Kpi label="Selling Costs" value={`${fmtNumber(project.sellingCostPercent, 1)}%`} />
            <Kpi label="Marginal Tax Rate" value={`${fmtNumber(project.taxRate, 0)}%`} />
            <Kpi label="Depreciation Life" value={`${fmtNumber(project.depreciationLifeYears, 1)} yr`} />
          </div>
        </section>

        {/* Earnings chart */}
        <section className="print-avoid-break print-page-break">
          <ReportHeading num="06" title="Earnings & Cash Flow by Year" />
          <div className="border-[1.5px] border-ink bg-panel p-5">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(26,35,50,0.1)" />
                  <XAxis dataKey="year" tick={{ fontSize: 12, fontFamily: "IBM Plex Mono" }} stroke="#64748B" />
                  <YAxis tick={{ fontSize: 11, fontFamily: "IBM Plex Mono" }} stroke="#64748B" tickFormatter={yAxisFormatter} width={56} />
                  <Tooltip formatter={(v: number) => fmtMoney(v)} contentStyle={{ fontFamily: "IBM Plex Mono", fontSize: 12, border: "1.5px solid #1A2332", background: "#FFFFFF" }} />
                  <Legend wrapperStyle={{ fontFamily: "IBM Plex Mono", fontSize: 11 }} />
                  <ReferenceLine y={0} stroke="#1A2332" />
                  <Bar dataKey="EBITDA" fill="#1D4ED8" isAnimationActive={false} />
                  <Bar dataKey="EBIT" fill="#92400E" isAnimationActive={false} />
                  <Bar dataKey="Cash Flow" fill="#166534" isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* Pro forma */}
        <section className="print-avoid-break">
          <ReportHeading num="07" title="Operating Pro Forma" />
          <div className="border-[1.5px] border-ink bg-panel overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b-[1.5px] border-ink">
                  <th className="text-left label-mono p-2.5">Line</th>
                  {proForma.map((y) => (
                    <th key={y.year} className="text-right label-mono p-2.5">Year {y.year}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <PFRow label="Gross Income" values={proForma.map((y) => y.grossIncome)} fmtMoney={fmtMoney} />
                <PFRow label="Vacancy Loss" values={proForma.map((y) => -y.vacancyLoss)} muted fmtMoney={fmtMoney} />
                <PFRow label="Effective Gross Income" values={proForma.map((y) => y.effectiveGrossIncome)} fmtMoney={fmtMoney} />
                <PFRow label="Operating Expenses" values={proForma.map((y) => -y.operatingExpenses)} muted fmtMoney={fmtMoney} />
                <PFRow label="NOI / EBITDA" values={proForma.map((y) => y.ebitda)} bold fmtMoney={fmtMoney} />
                <PFRow label="Depreciation" values={proForma.map((y) => -y.depreciation)} muted fmtMoney={fmtMoney} />
                <PFRow label="EBIT" values={proForma.map((y) => y.ebit)} bold fmtMoney={fmtMoney} />
                <PFRow label="Interest Expense" values={proForma.map((y) => -y.interestExpense)} muted fmtMoney={fmtMoney} />
                <PFRow label="Pre-Tax Income (EBT)" values={proForma.map((y) => y.ebt)} fmtMoney={fmtMoney} />
                <PFRow label="Tax" values={proForma.map((y) => -y.tax)} muted fmtMoney={fmtMoney} />
                <PFRow label="Net Income" values={proForma.map((y) => y.netIncome)} bold fmtMoney={fmtMoney} />
                <PFRow label="Levered Cash Flow" values={proForma.map((y) => y.cashFlow)} highlight fmtMoney={fmtMoney} />
              </tbody>
            </table>
          </div>
        </section>

        {/* Exit */}
        <section className="print-avoid-break">
          <ReportHeading num="08" title={`Exit Summary — End of Year ${project.holdYears}`} />
          <div className="border-[1.5px] border-ink bg-panel divide-y divide-hair">
            <RowKV label="Projected Sale Price" value={fmtMoney(exit.exitValue)} />
            <RowKV label="Selling Costs" value={fmtMoney(-exit.sellingCosts)} muted />
            <RowKV label="Loan Payoff" value={fmtMoney(-exit.loanPayoff)} muted />
            <RowKV label="Net Sale Proceeds" value={fmtMoney(exit.netSaleProceeds)} bold />
          </div>
        </section>

        {/* Disclaimer */}
        <footer className="print-avoid-break text-[10.5px] text-ink-muted leading-relaxed border-t border-hair pt-4">
          <p className="mb-1 font-semibold uppercase tracking-wider">Disclaimer</p>
          <p>
            This report is a forward-looking projection generated from user-supplied assumptions and is provided for
            informational purposes only. Actual results will vary. Figures are shown before capital-gains tax and
            depreciation recapture at sale; rental-loss deductibility depends on passive-activity rules and individual
            circumstances. This is not investment, tax, or legal advice — consult qualified professionals before making
            any investment decision.
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
    <div className="border-[1.5px] border-ink bg-panel p-3.5">
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
  const annualTotal = rows.reduce((s, r) => s + r.amount * FREQUENCY_FACTORS[r.frequency], 0);
  return (
    <div className="border-[1.5px] border-ink bg-panel overflow-hidden">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b-[1.5px] border-ink">
            <th className="text-left label-mono p-2.5" colSpan={3}>{title}</th>
          </tr>
          <tr className="border-b border-hair">
            <th className="text-left label-mono p-2.5">Item</th>
            <th className="text-right label-mono p-2.5 w-32">Per Period</th>
            <th className="text-right label-mono p-2.5 w-28">Annualized</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-hair last:border-0">
              <td className="p-2.5">
                {r.label || "—"}
                <span className="text-ink-muted text-xs"> · {FREQUENCY_LABELS[r.frequency]}</span>
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
            <td className="p-2.5 label-mono font-semibold" colSpan={2}>Annual Total</td>
            <td className="p-2.5 font-mono font-bold text-right">{fmtMoney(annualTotal)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
