"use client";

import { useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ReferenceLine,
} from "recharts";
import { useProjectContext } from "@/lib/projectContext";
import { analyzeProject } from "@/lib/calculations";
import { useCurrency } from "@/lib/currency";
import { fmtPercent, fmtMultiple, fmtNumber } from "@/lib/format";
import { SectionHeader } from "@/components/fields";

export default function AnalysisPage() {
  const { project, loading, error } = useProjectContext();
  const { fmtMoney, currency } = useCurrency();

  const analysis = useMemo(() => (project ? analyzeProject(project) : null), [project]);

  if (loading) return <div className="font-mono text-ink-muted text-sm uppercase">Loading…</div>;
  if (error) return <div className="panel border-red text-red p-4 font-mono text-sm">{error}</div>;
  if (!project || !analysis) return null;

  const { returns, proForma, exit } = analysis;
  const profitPositive = returns.totalProfit >= 0;

  const chartData = proForma.map((y) => ({
    year: `Y${y.year}`,
    NOI: Math.round(y.noi),
    EBITDA: Math.round(y.ebitda),
    EBIT: Math.round(y.ebit),
    "Cash Flow": Math.round(y.cashFlow),
    "Net Income": Math.round(y.netIncome),
  }));

  const yAxisFormatter = (v: number) => {
    if (currency === "VND") {
      const billions = v / 1_000_000_000;
      if (Math.abs(billions) >= 1) return `${billions.toFixed(1)}B`;
      const millions = v / 1_000_000;
      return `${millions.toFixed(0)}M`;
    }
    return `$${(v / 1000).toFixed(0)}k`;
  };

  return (
    <div className="space-y-10">
      {/* Headline KPIs */}
      <section>
        <SectionHeader num="01" title="Investment Returns" caption={`${project.holdYears}-year levered, after-tax projection. All figures recompute live from your inputs.`} />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Kpi label="IRR (levered)" value={fmtPercent(returns.irr)} accent={(returns.irr ?? 0) >= 0 ? "green" : "red"} big />
          <Kpi label="Equity Multiple" value={fmtMultiple(returns.equityMultiple)} />
          <Kpi label="Total Profit" value={fmtMoney(returns.totalProfit)} accent={profitPositive ? "green" : "red"} />
          <Kpi label="Cash Invested" value={fmtMoney(returns.cashInvested)} />
          <Kpi label="Cash-on-Cash (Yr 1)" value={fmtPercent(returns.cashOnCashYear1)} />
          <Kpi label="Avg Cash-on-Cash" value={fmtPercent(returns.averageCashOnCash)} />
          <Kpi label="Cap Rate (Yr 1)" value={fmtPercent(returns.capRateYear1)} />
          <Kpi label="DSCR (Yr 1)" value={fmtNumber(returns.dscrYear1)} accent={(returns.dscrYear1 ?? 0) >= 1.25 ? "green" : (returns.dscrYear1 ?? 0) >= 1 ? "amber" : "red"} />
        </div>
      </section>

      {/* Earnings chart */}
      <section>
        <SectionHeader num="02" title="Earnings & Cash Flow by Year" caption="EBITDA (≈NOI) steps down to EBIT after depreciation, then to cash flow after debt service and tax." />
        <div className="panel p-5">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(26,35,50,0.1)" />
                <XAxis dataKey="year" tick={{ fontSize: 12, fontFamily: "IBM Plex Mono" }} stroke="#64748B" />
                <YAxis tick={{ fontSize: 11, fontFamily: "IBM Plex Mono" }} stroke="#64748B" tickFormatter={yAxisFormatter} width={56} />
                <Tooltip formatter={(v: number) => fmtMoney(v)} contentStyle={{ fontFamily: "IBM Plex Mono", fontSize: 12, border: "1.5px solid #1A2332", background: "#FFFFFF" }} />
                <Legend wrapperStyle={{ fontFamily: "IBM Plex Mono", fontSize: 11 }} />
                <ReferenceLine y={0} stroke="#1A2332" />
                <Bar dataKey="EBITDA" fill="#1D4ED8" />
                <Bar dataKey="EBIT" fill="#92400E" />
                <Bar dataKey="Cash Flow" fill="#166534" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Pro forma table */}
      <section>
        <SectionHeader num="03" title="Operating Pro Forma" caption="Full income statement per year, from gross rent down to levered after-tax cash flow." />
        <div className="panel overflow-x-auto">
          <table className="w-full border-collapse min-w-[720px] text-sm">
            <thead>
              <tr className="border-b-[1.5px] border-ink">
                <th className="text-left label-mono p-2.5 sticky left-0 bg-panel">Line</th>
                {proForma.map((y) => (
                  <th key={y.year} className="text-right label-mono p-2.5">Year {y.year}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <ProformaRow label="Gross Income" values={proForma.map((y) => y.grossIncome)} fmtMoney={fmtMoney} />
              <ProformaRow label="Vacancy Loss" values={proForma.map((y) => -y.vacancyLoss)} muted fmtMoney={fmtMoney} />
              <ProformaRow label="Effective Gross Income" values={proForma.map((y) => y.effectiveGrossIncome)} fmtMoney={fmtMoney} />
              <ProformaRow label="Operating Expenses" values={proForma.map((y) => -y.operatingExpenses)} muted fmtMoney={fmtMoney} />
              <ProformaRow label="NOI / EBITDA" values={proForma.map((y) => y.ebitda)} bold fmtMoney={fmtMoney} />
              <ProformaRow label="Depreciation" values={proForma.map((y) => -y.depreciation)} muted fmtMoney={fmtMoney} />
              <ProformaRow label="EBIT" values={proForma.map((y) => y.ebit)} bold fmtMoney={fmtMoney} />
              <ProformaRow label="Interest Expense" values={proForma.map((y) => -y.interestExpense)} muted fmtMoney={fmtMoney} />
              <ProformaRow label="Pre-Tax Income (EBT)" values={proForma.map((y) => y.ebt)} fmtMoney={fmtMoney} />
              <ProformaRow label="Tax" values={proForma.map((y) => -y.tax)} muted fmtMoney={fmtMoney} />
              <ProformaRow label="Net Income" values={proForma.map((y) => y.netIncome)} bold fmtMoney={fmtMoney} />
              <ProformaRow label="+ Depreciation (non-cash)" values={proForma.map((y) => y.depreciation)} muted fmtMoney={fmtMoney} />
              <ProformaRow label="− Principal Paydown" values={proForma.map((y) => -y.principalPaydown)} muted fmtMoney={fmtMoney} />
              <ProformaRow label="Levered Cash Flow" values={proForma.map((y) => y.cashFlow)} highlight fmtMoney={fmtMoney} />
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-ink-muted mt-2 leading-relaxed">
          Tax on a negative pre-tax income is shown as a benefit (shield). Whether rental losses are currently deductible depends on passive-activity rules and your income — treat the after-tax line as an estimate and confirm with your CPA.
        </p>
      </section>

      {/* Cumulative cash flow */}
      <section>
        <SectionHeader num="04" title="Cumulative Cash Position" caption="Running total of cash flow against the equity you put in. Where the line crosses zero is your break-even." />
        <div className="panel p-5">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={cumulative(proForma, returns.cashInvested)} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(26,35,50,0.1)" />
                <XAxis dataKey="year" tick={{ fontSize: 12, fontFamily: "IBM Plex Mono" }} stroke="#64748B" />
                <YAxis tick={{ fontSize: 11, fontFamily: "IBM Plex Mono" }} stroke="#64748B" tickFormatter={yAxisFormatter} width={60} />
                <Tooltip formatter={(v: number) => fmtMoney(v)} contentStyle={{ fontFamily: "IBM Plex Mono", fontSize: 12, border: "1.5px solid #1A2332", background: "#FFFFFF" }} />
                <ReferenceLine y={0} stroke="#1A2332" />
                <Line type="monotone" dataKey="cumulative" stroke="#166534" strokeWidth={2} dot={{ r: 3 }} name="Cumulative cash" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Exit */}
      <section>
        <SectionHeader num="05" title="Exit Summary" caption={`Projected sale at the end of year ${project.holdYears}.`} />
        <div className="panel divide-y divide-hair">
          <ExitRow label="Projected Sale Price" value={exit.exitValue} fmtMoney={fmtMoney} />
          <ExitRow label="Selling Costs" value={-exit.sellingCosts} muted fmtMoney={fmtMoney} />
          <ExitRow label="Loan Payoff" value={-exit.loanPayoff} muted fmtMoney={fmtMoney} />
          <ExitRow label={`Depreciation Recapture Tax (${fmtPercent(project.recaptureTaxRate)})`} value={-exit.recaptureTax} muted fmtMoney={fmtMoney} />
          <ExitRow label="Net Sale Proceeds" value={exit.netSaleProceeds} bold fmtMoney={fmtMoney} />
        </div>
        <p className="text-[11px] text-ink-muted mt-2 leading-relaxed">
          Projected sale price already nets out {fmtMoney(exit.accumulatedDepreciation)} of accumulated depreciation over the hold, and proceeds are reduced by {fmtPercent(project.recaptureTaxRate)} recapture tax on that depreciation. Figures are still before capital-gains tax, which depends on your full tax situation at sale.
        </p>
      </section>

      {/* Net profit callout */}
      <section className={`panel p-6 flex flex-wrap items-baseline gap-4 ${profitPositive ? "border-green" : "border-red"}`}>
        <span className={`font-display font-extrabold text-xl uppercase ${profitPositive ? "text-green" : "text-red"}`}>
          {profitPositive ? "Total Profit" : "Total Loss"}
        </span>
        <span className={`font-mono font-bold text-3xl ${profitPositive ? "text-green" : "text-red"}`}>
          {fmtMoney(Math.abs(returns.totalProfit))}
        </span>
        <span className="font-mono text-xs text-ink-muted w-full">
          Over {project.holdYears} years · {fmtPercent(returns.irr)} IRR · {fmtMultiple(returns.equityMultiple)} equity multiple · {fmtMoney(returns.totalCashFlow)} cumulative cash flow + {fmtMoney(exit.netSaleProceeds)} net sale proceeds, less {fmtMoney(returns.cashInvested)} invested
        </span>
      </section>
    </div>
  );
}

function cumulative(proForma: { year: number; cashFlow: number }[], cashInvested: number) {
  let running = -cashInvested;
  const out = [{ year: "Y0", cumulative: Math.round(running) }];
  for (const y of proForma) {
    running += y.cashFlow;
    out.push({ year: `Y${y.year}`, cumulative: Math.round(running) });
  }
  return out;
}

function Kpi({ label, value, accent, big }: { label: string; value: string; accent?: "green" | "red" | "amber"; big?: boolean }) {
  const color = accent === "green" ? "text-green" : accent === "red" ? "text-red" : accent === "amber" ? "text-amber" : "text-ink";
  return (
    <div className="panel p-4">
      <div className="label-mono mb-1.5">{label}</div>
      <div className={`font-mono font-bold ${big ? "text-2xl" : "text-xl"} ${color}`}>{value}</div>
    </div>
  );
}

function ProformaRow({
  label, values, bold, muted, highlight, fmtMoney,
}: {
  label: string; values: number[]; bold?: boolean; muted?: boolean; highlight?: boolean;
  fmtMoney: (n: number | null | undefined) => string;
}) {
  return (
    <tr className={`border-b border-hair last:border-0 ${highlight ? "bg-paper" : ""}`}>
      <td className={`p-2.5 sticky left-0 ${highlight ? "bg-paper" : "bg-panel"} ${bold || highlight ? "font-semibold" : ""} ${muted ? "text-ink-muted" : ""}`}>{label}</td>
      {values.map((v, i) => (
        <td key={i} className={`p-2.5 font-mono text-right ${bold || highlight ? "font-bold" : ""} ${muted ? "text-ink-muted" : ""} ${highlight ? (v >= 0 ? "text-green" : "text-red") : ""}`}>
          {fmtMoney(v)}
        </td>
      ))}
    </tr>
  );
}

function ExitRow({
  label, value, bold, muted, fmtMoney,
}: {
  label: string; value: number; bold?: boolean; muted?: boolean;
  fmtMoney: (n: number | null | undefined) => string;
}) {
  return (
    <div className="flex items-center justify-between p-4">
      <span className={`${bold ? "font-display font-bold text-lg" : "text-sm"} ${muted ? "text-ink-muted" : ""}`}>{label}</span>
      <span className={`font-mono ${bold ? "font-bold text-lg" : ""} ${muted ? "text-ink-muted" : ""}`}>{fmtMoney(value)}</span>
    </div>
  );
}
