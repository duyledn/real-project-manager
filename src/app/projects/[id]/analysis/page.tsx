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
import { Download } from "lucide-react";
import { useProjectContext } from "@/lib/projectContext";
import { analyzeProject } from "@/lib/calculations";
import { useCurrency } from "@/lib/currency";
import { useTheme } from "@/lib/theme";
import { downloadCsv } from "@/lib/clipboard";
import { fmtPercent, fmtMultiple, fmtNumber } from "@/lib/format";
import { SectionHeader } from "@/components/fields";
import { useI18n } from "@/lib/i18n";

export default function AnalysisPage() {
  const { project, loading, error } = useProjectContext();
  const { fmtMoney, currency } = useCurrency();
  const { t } = useI18n();
  const { theme } = useTheme(); // re-read chart tokens when the theme flips

  const analysis = useMemo(() => (project ? analyzeProject(project) : null), [project]);

  if (loading) return <div className="font-mono text-ink-muted text-sm uppercase">{t("Loading…")}</div>;
  if (error) return <div className="panel border-red text-red p-4 font-mono text-sm">{t(error)}</div>;
  if (!project || !analysis) return null;

  const { returns, proForma, exit } = analysis;
  const profitPositive = returns.totalProfit >= 0;

  // Theme-aware chart colors pulled from the live CSS tokens (re-read on flip).
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

  // Operating pro forma rows (label + per-year values), reused by the table and
  // the CSV export so they never drift.
  const proformaRows: { label: string; values: number[]; bold?: boolean; muted?: boolean; highlight?: boolean }[] = [
    { label: t("Gross Income"), values: proForma.map((y) => y.grossIncome) },
    { label: t("Vacancy Loss"), values: proForma.map((y) => -y.vacancyLoss), muted: true },
    { label: t("Effective Gross Income"), values: proForma.map((y) => y.effectiveGrossIncome) },
    { label: t("Operating Expenses"), values: proForma.map((y) => -y.operatingExpenses), muted: true },
    { label: t("NOI / EBITDA"), values: proForma.map((y) => y.ebitda), bold: true },
    { label: t("Depreciation"), values: proForma.map((y) => -y.depreciation), muted: true },
    { label: t("EBIT"), values: proForma.map((y) => y.ebit), bold: true },
    { label: t("Interest Expense"), values: proForma.map((y) => -y.interestExpense), muted: true },
    { label: t("Pre-Tax Income (EBT)"), values: proForma.map((y) => y.ebt) },
    { label: t("Tax"), values: proForma.map((y) => -y.tax), muted: true },
    { label: t("Net Income"), values: proForma.map((y) => y.netIncome), bold: true },
    { label: t("+ Depreciation (non-cash)"), values: proForma.map((y) => y.depreciation), muted: true },
    { label: t("− Principal Paydown"), values: proForma.map((y) => -y.principalPaydown), muted: true },
    { label: t("Levered Cash Flow"), values: proForma.map((y) => y.cashFlow), highlight: true },
  ];

  function exportProformaCsv() {
    const header = [t("Line"), ...proForma.map((y) => t("Year {year}", { year: y.year }))];
    const body = proformaRows.map((r) => [r.label, ...r.values.map((v) => Math.round(v))]);
    const safeName = (project!.name || "project").replace(/[^\w-]+/g, "_");
    downloadCsv(`${safeName}_operating_pro_forma_${currency}.csv`, [header, ...body]);
  }

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
        <SectionHeader num="01" title={t("Investment Returns")} />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Kpi label={t("IRR (levered)")} value={fmtPercent(returns.irr)} accent={(returns.irr ?? 0) >= 0 ? "green" : "red"} big />
          <Kpi label={t("Equity Multiple")} value={fmtMultiple(returns.equityMultiple)} />
          <Kpi label={t("Total Profit")} value={fmtMoney(returns.totalProfit)} accent={profitPositive ? "green" : "red"} />
          <Kpi label={t("Cash Invested")} value={fmtMoney(returns.cashInvested)} />
          <Kpi label={t("Cash-on-Cash (Yr 1)")} value={fmtPercent(returns.cashOnCashYear1)} />
          <Kpi label={t("Avg Cash-on-Cash")} value={fmtPercent(returns.averageCashOnCash)} />
          <Kpi label={t("Cap Rate (Yr 1)")} value={fmtPercent(returns.capRateYear1)} />
          <Kpi label={t("DSCR (Yr 1)")} value={fmtNumber(returns.dscrYear1)} accent={(returns.dscrYear1 ?? 0) >= 1.25 ? "green" : (returns.dscrYear1 ?? 0) >= 1 ? "amber" : "red"} />
        </div>
      </section>

      {/* Earnings chart */}
      <section>
        <SectionHeader num="02" title={t("Earnings & Cash Flow by Year")} />
        <div className="panel p-5">
          <div className="h-72">
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

      {/* Pro forma table */}
      <section>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <SectionHeader num="03" title={t("Operating Pro Forma")} />
          <button onClick={exportProformaCsv} className="btn gap-1.5 shrink-0">
            <Download size={14} /> {t("Export CSV")}
          </button>
        </div>
        <div className="panel overflow-x-auto">
          <table className="w-full border-collapse min-w-[720px] text-sm">
            <thead>
              <tr className="border-b-[1.5px] border-ink">
                <th className="text-left label-mono p-2.5 sticky left-0 bg-panel">{t("Line")}</th>
                {proForma.map((y) => (
                  <th key={y.year} className="text-right label-mono p-2.5">{t("Year {year}", { year: y.year })}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {proformaRows.map((r) => (
                <ProformaRow key={r.label} label={r.label} values={r.values} bold={r.bold} muted={r.muted} highlight={r.highlight} fmtMoney={fmtMoney} />
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-ink-muted mt-2 leading-relaxed">
          {t("Tax on a negative pre-tax income is shown as a benefit (shield). Whether rental losses are currently deductible depends on passive-activity rules and your income — treat the after-tax line as an estimate and confirm with your CPA.")}
        </p>
      </section>

      {/* Cumulative cash flow */}
      <section>
        <SectionHeader num="04" title={t("Cumulative Cash Position")} caption={t("Running total of cash flow against the equity you put in. Where the line crosses zero is your break-even.")} />
        <div className="panel p-5">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={cumulative(proForma, returns.cashInvested)} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={COL.grid} />
                <XAxis dataKey="year" tick={{ fontSize: 12, fontFamily: monoFont, fill: COL.axis }} stroke={COL.grid} />
                <YAxis tick={{ fontSize: 11, fontFamily: monoFont, fill: COL.axis }} stroke={COL.grid} tickFormatter={yAxisFormatter} width={60} />
                <Tooltip
                  formatter={(v: number) => fmtMoney(v)}
                  cursor={{ stroke: COL.grid }}
                  contentStyle={{ fontFamily: monoFont, fontSize: 12, borderRadius: 12, border: `1px solid ${COL.grid}`, background: COL.surface, color: COL.text }}
                />
                <ReferenceLine y={0} stroke={COL.axis} />
                <Line type="monotone" dataKey="cumulative" stroke={COL.cash} strokeWidth={2.5} dot={{ r: 3, fill: COL.cash }} name={t("Cumulative cash")} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Exit */}
      <section>
        <SectionHeader num="05" title={t("Exit Summary")} />
        <div className="panel divide-y divide-hair">
          <ExitRow label={t("Projected Sale Price")} value={exit.exitValue} fmtMoney={fmtMoney} />
          <ExitRow label={t("Selling Costs")} value={-exit.sellingCosts} muted fmtMoney={fmtMoney} />
          <ExitRow label={t("Loan Payoff")} value={-exit.loanPayoff} muted fmtMoney={fmtMoney} />
          <ExitRow label={t("Depreciation Recapture Tax ({rate})", { rate: fmtPercent(project.recaptureTaxRate) })} value={-exit.recaptureTax} muted fmtMoney={fmtMoney} />
          <ExitRow label={t("Net Sale Proceeds")} value={exit.netSaleProceeds} bold fmtMoney={fmtMoney} />
        </div>
        <p className="text-[11px] text-ink-muted mt-2 leading-relaxed">
          {t("Projected sale price already nets out {depreciation} of accumulated depreciation over the hold, and proceeds are reduced by {rate} recapture tax on that depreciation. Figures are still before capital-gains tax, which depends on your full tax situation at sale.", { depreciation: fmtMoney(exit.accumulatedDepreciation), rate: fmtPercent(project.recaptureTaxRate) })}
        </p>
      </section>

      {/* Net profit callout */}
      <section className={`panel p-6 flex flex-wrap items-baseline gap-4 ${profitPositive ? "border-green" : "border-red"}`}>
        <span className={`font-display font-extrabold text-xl uppercase ${profitPositive ? "text-green" : "text-red"}`}>
          {t(profitPositive ? "Total Profit" : "Total Loss")}
        </span>
        <span className={`font-mono font-bold text-3xl ${profitPositive ? "text-green" : "text-red"}`}>
          {fmtMoney(Math.abs(returns.totalProfit))}
        </span>
        <span className="font-mono text-xs text-ink-muted w-full">
          {t("Over {years} years · {irr} IRR · {multiple} equity multiple · {cashFlow} cumulative cash flow + {saleProceeds} net sale proceeds, less {invested} invested", { years: project.holdYears, irr: fmtPercent(returns.irr), multiple: fmtMultiple(returns.equityMultiple), cashFlow: fmtMoney(returns.totalCashFlow), saleProceeds: fmtMoney(exit.netSaleProceeds), invested: fmtMoney(returns.cashInvested) })}
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
