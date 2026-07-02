"use client";

import { Pencil, TrendingUp } from "lucide-react";

import { fmtMultiple, fmtPercent } from "@/lib/format";
import type { analyzeProject } from "@/lib/calculations";
import type { Project } from "@/lib/types";

type ProjectAnalysis = ReturnType<typeof analyzeProject>;

type GradientHeroProps = {
  project: Project;
  analysis: ProjectAnalysis | null;
  awardedPct: number;
  fmtMoney: (n: number | null | undefined) => string;
  onEditProject: () => void;
};

function profitText(analysis: ProjectAnalysis | null, fmtMoney: (n: number | null | undefined) => string): string {
  if (!analysis) return "-";
  const profit = analysis.returns.totalProfit;
  const formatted = fmtMoney(profit);
  return profit > 0 ? `+${formatted}` : formatted;
}

export function GradientHero({ project, analysis, awardedPct, fmtMoney, onEditProject }: GradientHeroProps) {
  return (
    <section
      className="relative overflow-hidden"
      style={{
        borderRadius: 22,
        padding: "22px 24px",
        color: "#fff",
        background: "linear-gradient(120deg,#13674A 0%,#1F8A5B 42%,#4FAE6B 74%,#9ECF52 100%)",
        boxShadow: "0 18px 44px rgba(31,138,91,0.30)",
      }}
    >
      <div
        className="pointer-events-none absolute -right-16 -top-20 h-[260px] w-[260px]"
        style={{ background: "radial-gradient(circle, rgba(255,255,255,0.22), transparent 70%)" }}
      />
      <div
        className="pointer-events-none absolute -bottom-28 -left-20 h-[300px] w-[300px]"
        style={{ background: "radial-gradient(circle, rgba(214,237,142,0.32), transparent 70%)" }}
      />

      <button
        type="button"
        onClick={onEditProject}
        className="absolute right-3 top-3 z-10 inline-flex h-8 w-8 items-center justify-center rounded-[10px] transition-colors hover:bg-white/20"
        style={{ border: "1px solid rgba(255,255,255,0.24)", background: "rgba(255,255,255,0.12)", color: "#fff" }}
        aria-label="Edit project name, strategy and address"
        title="Edit project details"
      >
        <Pencil size={14} />
      </button>

      <div className="relative z-[1] grid gap-6 lg:grid-cols-[1.25fr_1fr] lg:items-center">
        <div className="min-w-0 pr-8">
          <div
            style={{
              fontSize: 11,
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: "rgba(255,255,255,0.84)",
            }}
          >
            PROJECTED 3-YR NET PROFIT
          </div>
          <div
            className="mt-2 truncate font-mono"
            style={{
              fontSize: 46,
              fontWeight: 800,
              letterSpacing: "-0.03em",
              lineHeight: 1,
              textShadow: "0 2px 18px rgba(0,0,0,0.18)",
            }}
          >
            {profitText(analysis, fmtMoney)}
          </div>
          <div className="mt-3 flex items-center gap-2 text-[13px]" style={{ color: "rgba(255,255,255,0.78)" }}>
            <TrendingUp size={14} style={{ color: "rgba(255,255,255,0.8)" }} />
            <span>
              Levered IRR {fmtPercent(analysis?.returns.irr)} on {analysis ? fmtMoney(analysis.returns.cashInvested) : "-"} all-in -{" "}
              {awardedPct}% committed
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-[10px]">
          {[
            { value: fmtPercent(analysis?.returns.irr), label: "Levered IRR" },
            { value: fmtMultiple(analysis?.returns.equityMultiple), label: "Equity multiple" },
            { value: `${awardedPct}%`, label: "Budget awarded" },
          ].map((chip) => (
            <div
              key={chip.label}
              className="flex items-baseline justify-between gap-4"
              style={{
                background: "rgba(255,255,255,0.15)",
                border: "1px solid rgba(255,255,255,0.24)",
                borderRadius: 15,
                padding: "10px 14px",
                backdropFilter: "blur(6px)",
                WebkitBackdropFilter: "blur(6px)",
              }}
            >
              <span className="font-mono text-[20px] font-extrabold">{chip.value}</span>
              <span className="text-right text-[10.5px] font-semibold" style={{ color: "rgba(255,255,255,0.78)" }}>
                {chip.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
