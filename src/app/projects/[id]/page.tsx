"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Wallet,
  Gavel,
  CheckCircle2,
  CalendarRange,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  X,
  Check,
} from "lucide-react";

import { GradientHero } from "@/components/GradientHero";
import { MetricCard } from "@/components/MetricCard";
import { SaveIndicator } from "@/components/fields";
import { analyzeProject } from "@/lib/calculations";
import { useCurrency } from "@/lib/currency";
import { useI18n } from "@/lib/i18n";
import { pillStyle, BID_STATUS_SHORT, subCompliance, initialsOf } from "@/lib/bidStatus";
import { approvedBidder } from "@/lib/jobs";
import { AWARDED_STATUSES, PAL, kMoney } from "@/lib/palette";
import { bidStatusColor } from "@/lib/bidStatus";
import { useProjectContext } from "@/lib/projectContext";
import { useSubcontractors } from "@/lib/useSubcontractors";
import type { Job, Project } from "@/lib/types";

const STRATEGY_PRESETS = [
  "Buy-Rehab-Hold Rental",
  "Buy-Rehab-Sell (Flip)",
  "Short-Term / Vacation Rental",
  "BRRRR",
  "New Construction",
  "Commercial / Mixed-Use",
];

export default function DashboardPage() {
  const { project, setProject, loading, error, saveState } = useProjectContext();
  const { subs } = useSubcontractors();
  const { fmtMoney } = useCurrency();
  const { t } = useI18n();
  const [editing, setEditing] = useState(false);
  const analysis = useMemo(() => (project ? analyzeProject(project) : null), [project]);

  if (loading) return <div className="text-ink-muted text-sm">{t("Loading...")}</div>;
  if (error) return <div className="panel border-red text-red p-4 text-sm">{error}</div>;
  if (!project) return null;

  const base = `/projects/${project.id}`;
  const subById = (sid: string | null) => subs.find((s) => s.id === sid) ?? null;
  const estBudget = project.jobs.reduce((s, j) => s + (j.estimatedCost || 0), 0);
  const awarded = project.jobs.reduce((s, j) => s + (approvedBidder(j)?.bidPrice ?? 0), 0);
  const allBidders = project.jobs.flatMap((j) =>
    j.bidders.map((b) => ({ ...b, jobId: j.id, jobCategory: j.category })),
  );
  const bidsInPlay = allBidders.filter((b) => b.status !== "Not sent").length;
  const awardedJobs = project.jobs.filter((j) => approvedBidder(j)).length;
  const datedJobs = project.jobs.filter((j) => j.startDate).length;
  const awardedPct = estBudget > 0 ? Math.min(100, Math.round((awarded / estBudget) * 100)) : 0;
  const decisionBids = allBidders.filter((b) => b.status === "Bid received");
  const engagedSubIds = Array.from(
    new Set(allBidders.map((b) => b.subcontractorId).filter((x): x is string => !!x)),
  );
  const complianceAlerts = engagedSubIds
    .map((sid) => ({ sub: subById(sid), comp: subCompliance(subById(sid)) }))
    .filter((x) => x.sub && !x.comp.ok);

  const metricCards = [
    {
      color: PAL[0],
      icon: Wallet,
      value: fmtMoney(estBudget),
      label: t("Total budget"),
      note: t("{n} jobs", { n: project.jobs.length }),
      bars: [0.4, 0.45, 0.52, 0.58, 0.65, 0.7, 0.75],
    },
    {
      color: PAL[1],
      icon: Gavel,
      value: String(bidsInPlay),
      label: t("Bids in play"),
      note: t("+{n} wk", { n: 3 }),
      bars: [0.2, 0.45, 0.6, 0.8, 0.55, 0.9, 0.7],
    },
    {
      color: PAL[2],
      icon: CheckCircle2,
      value: `${awardedJobs}/${project.jobs.length}`,
      label: t("Awarded"),
      note: t("{a} jobs", { a: awardedJobs }),
      bars: [0.1, 0.2, 0.35, 0.45, 0.55, 0.65, 0.8],
    },
    {
      color: PAL[3],
      icon: CalendarRange,
      value: `${datedJobs}/${project.jobs.length || 0}`,
      label: t("On schedule"),
      note: t("on track"),
      bars: [0.5, 0.55, 0.65, 0.6, 0.75, 0.72, 0.88],
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <SaveIndicator state={saveState} />
      </div>

      <GradientHero
        project={project}
        analysis={analysis}
        awardedPct={awardedPct}
        fmtMoney={fmtMoney}
        onEditProject={() => setEditing(true)}
      />

      {editing && <EditIdentityModal project={project} setProject={setProject} onClose={() => setEditing(false)} />}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {metricCards.map((m) => (
          <MetricCard key={m.label} {...m} />
        ))}
      </div>

      <BudgetByCategory jobs={project.jobs} estBudget={estBudget} />

      <div className="grid lg:grid-cols-[1.5fr_1fr] gap-3.5">
        <div className="panel-2 p-[18px]">
          <div className="flex items-center justify-between mb-3.5">
            <div className="font-extrabold text-[14.5px]">{t("Bids needing your decision")}</div>
            <span className="pill" style={{ color: "var(--accent)", background: "var(--accent-soft)" }}>
              {t("{n} pending", { n: decisionBids.length })}
            </span>
          </div>
          {decisionBids.length === 0 ? (
            <p className="text-sm text-ink-muted py-6 text-center">
              {t("Nothing awaiting a decision. Received bids show up here.")}
            </p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {decisionBids.map((b) => {
                const sub = subById(b.subcontractorId);
                return (
                  <div
                    key={b.id}
                    className="flex items-center gap-3 p-3 rounded-[14px]"
                    style={{ background: "var(--surface-solid)", border: "1px solid var(--border)" }}
                  >
                    <div
                      className="w-9 h-9 rounded-[10px] flex items-center justify-center text-[11px] font-extrabold text-accent shrink-0"
                      style={{ background: "var(--accent-soft)" }}
                    >
                      {initialsOf(sub?.companyName ?? "-")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-bold truncate">{sub?.companyName ?? t("Unassigned")}</div>
                      <div className="text-[11.5px] text-ink-muted">
                        {b.jobCategory} -{" "}
                        <span className="pill !px-2 !py-0.5" style={pillStyle(b.status)}>
                          {t(BID_STATUS_SHORT[b.status])}
                        </span>
                      </div>
                    </div>
                    <div className="font-mono font-semibold text-[13.5px] whitespace-nowrap">{fmtMoney(b.bidPrice)}</div>
                    <Link href={`${base}/manage?job=${b.jobId}`} className="btn !px-3 !py-1.5 !text-[11.5px]">
                      {t("Review")}
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3.5">
          <div className="panel-2 p-[18px]">
            <div className="font-extrabold text-[14.5px] mb-1">{t("Awarded vs budget")}</div>
            <div className="text-[11.5px] text-ink-muted mb-3.5">
              {t("{a} of {b} jobs committed", { a: awardedJobs, b: project.jobs.length })}
            </div>
            <div className="flex items-baseline gap-2 mb-2.5">
              <div className="font-mono text-[24px] font-extrabold">{fmtMoney(awarded)}</div>
              <div className="text-xs text-ink-muted">/ {fmtMoney(estBudget)}</div>
            </div>
            <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "var(--glass)", border: "1px solid var(--border)" }}>
              <div
                className="h-full rounded-full"
                style={{
                  width: `${awardedPct}%`,
                  background: "linear-gradient(90deg,var(--accent),var(--accent-2))",
                  transition: "width .5s cubic-bezier(.32,.72,0,1)",
                }}
              />
            </div>
          </div>

          <div className="panel-2 p-[18px]">
            <div className="flex items-center gap-2 mb-3">
              {complianceAlerts.length === 0 ? (
                <ShieldCheck size={20} className="text-green" />
              ) : (
                <ShieldCheck size={20} style={{ color: "var(--warn)" }} />
              )}
              <div className="font-extrabold text-[14.5px]">{t("Compliance alerts")}</div>
            </div>
            {complianceAlerts.length === 0 ? (
              <p className="text-[12.5px] text-ink-muted">
                {engagedSubIds.length === 0
                  ? t("No subcontractors engaged yet.")
                  : t("All engaged subs have W-9, License & Workers' Comp on file.")}
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {complianceAlerts.map(({ sub, comp }) => (
                  <div key={sub!.id} className="flex items-center gap-2.5 text-[12.5px]">
                    <AlertTriangle size={16} style={{ color: "var(--neg)" }} className="shrink-0" />
                    <span className="font-semibold flex-1 truncate">{sub!.companyName}</span>
                    <span className="text-ink-muted text-[11.5px] whitespace-nowrap">
                      {t("Missing {docs}", { docs: comp.missing.join(", ") })}
                    </span>
                  </div>
                ))}
                <Link href={`/subcontractors?from=${project.id}`} className="text-[12px] font-bold text-accent inline-flex items-center gap-1 mt-1">
                  {t("Manage subcontractors")} <ArrowRight size={13} />
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function BudgetByCategory({ jobs, estBudget }: { jobs: Job[]; estBudget: number }) {
  return (
    <div className="panel-2 p-[18px] sm:p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="text-[14.5px] font-extrabold">Budget by category</div>
          <div className="text-[11px] text-ink-muted">Awarded vs budget - bid spread per trade</div>
        </div>
        <span className="pill shrink-0" style={{ color: "var(--accent)", background: "var(--accent-soft)" }}>
          {kMoney(estBudget)} total
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse">
          <thead>
            <tr className="border-b" style={{ borderColor: "var(--border)" }}>
              {["Category", "Bids", "Bid range", "Budget", "Progress", "Status"].map((h) => (
                <th key={h} className={`label-mono py-2 ${h === "Category" ? "text-left" : h === "Bids" ? "text-center" : "text-right"}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {jobs.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-6 text-center text-sm text-ink-muted">
                  Add jobs to see budget breakdown
                </td>
              </tr>
            ) : (
              jobs.map((job, i) => <BudgetRow key={job.id} job={job} index={i} />)
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BudgetRow({ job, index }: { job: Job; index: number }) {
  const color = PAL[index % PAL.length];
  const nonZeroBids = job.bidders.filter((b) => b.bidPrice > 0);
  const lowBid = nonZeroBids.length ? Math.min(...nonZeroBids.map((b) => b.bidPrice)) : 0;
  const highBid = nonZeroBids.length ? Math.max(...nonZeroBids.map((b) => b.bidPrice)) : 0;
  const awardedBid = job.bidders.find((b) => AWARDED_STATUSES.has(b.status));
  const firstActiveBid = job.bidders.find((b) => b.status !== "Not sent");
  const fillPct =
    job.estimatedCost > 0 ? Math.min(100, Math.round(((awardedBid?.bidPrice || lowBid || 0) / job.estimatedCost) * 100)) : 0;
  const statusBid = awardedBid ?? firstActiveBid;
  const statusColor = statusBid ? bidStatusColor(statusBid.status) : "var(--muted)";

  return (
    <tr className="border-b last:border-0" style={{ borderColor: "var(--border)" }}>
      <td className="py-3 pr-3">
        <div className="flex items-center gap-2.5">
          <span
            className="h-[9px] w-[9px] rounded-full"
            style={{ background: color, boxShadow: `0 0 0 3px ${color}22` }}
          />
          <span className="text-[12.5px] font-bold">{job.category}</span>
        </div>
      </td>
      <td className="py-3 text-center font-mono text-[11.5px] text-ink-muted">{job.bidders.length}</td>
      <td className="py-3 text-right font-mono text-[11.5px] text-ink-muted">
        {nonZeroBids.length ? `${kMoney(lowBid)}-${kMoney(highBid)}` : "-"}
      </td>
      <td className="py-3 text-right font-mono text-[12.5px] font-semibold">{kMoney(job.estimatedCost)}</td>
      <td className="py-3 pl-4 text-right">
        <div className="flex items-center justify-end gap-2">
          <div className="h-1.5 w-[110px] rounded-full" style={{ background: "var(--glass)", border: "1px solid var(--border)" }}>
            <div
              className="h-full rounded-full"
              style={{
                width: `${fillPct}%`,
                background: awardedBid
                  ? `linear-gradient(90deg,${color},${color}bb)`
                  : `repeating-linear-gradient(135deg, ${color}40 0, ${color}40 4px, transparent 4px, transparent 8px)`,
              }}
            />
          </div>
          <span className="w-9 font-mono text-[11px]" style={{ color: fillPct ? color : "var(--muted)" }}>
            {fillPct}%
          </span>
        </div>
      </td>
      <td className="py-3 text-right">
        {statusBid ? (
          <span className="pill !px-2 !py-1" style={pillStyle(statusBid.status)}>
            {BID_STATUS_SHORT[statusBid.status]}
          </span>
        ) : (
          <span className="text-[11.5px] font-semibold" style={{ color: statusColor }}>
            No bids
          </span>
        )}
      </td>
    </tr>
  );
}

/** Quick-edit sheet for the project's identity: name, investment strategy,
 * and address. Binds straight to the autosaving setProject. */
function EditIdentityModal({
  project,
  setProject,
  onClose,
}: {
  project: Project;
  setProject: (updater: (p: Project) => Project) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [name, setName] = useState(project.name);
  const [strategy, setStrategy] = useState(project.investmentStrategy || "Buy-Rehab-Hold Rental");
  const [address, setAddress] = useState(project.projectAddress);

  function save() {
    const cleanName = name.trim() || project.name;
    setProject((p) => ({
      ...p,
      name: cleanName,
      investmentStrategy: strategy.trim(),
      projectAddress: address,
    }));
    onClose();
  }

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: "rgba(20,12,8,0.5)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-[460px] max-w-full flex flex-col"
        style={{
          borderRadius: 22,
          background: "var(--glass-strong)",
          backdropFilter: "var(--blur)",
          WebkitBackdropFilter: "var(--blur)",
          border: "1px solid var(--border)",
          borderTopColor: "var(--border-top)",
          boxShadow: "var(--shadow-lg)",
          animation: "popIn .3s cubic-bezier(.32,.72,0,1) both",
        }}
      >
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b" style={{ borderColor: "var(--border)" }}>
          <div>
            <div className="text-[11px] font-bold tracking-[0.06em] uppercase text-accent">{t("Edit project")}</div>
            <div className="text-lg font-extrabold tracking-tight mt-0.5">{t("Details")}</div>
          </div>
          <button onClick={onClose} className="icon-btn" aria-label={t("Close")}>
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <label className="flex flex-col gap-1.5">
            <span className="label-mono">{t("Project name")}</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && save()}
              className="field-input text-base font-semibold"
              autoFocus
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="label-mono">{t("Investment strategy")}</span>
            <input
              value={strategy}
              onChange={(e) => setStrategy(e.target.value)}
              list="strategy-presets"
              className="field-input text-base font-semibold"
              placeholder="e.g. Buy-Rehab-Hold Rental"
            />
            <datalist id="strategy-presets">
              {STRATEGY_PRESETS.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="label-mono">{t("Address")}</span>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && save()}
              className="field-input text-base font-semibold"
              placeholder="123 Main St, City"
            />
          </label>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t" style={{ borderColor: "var(--border)" }}>
          <button onClick={onClose} className="btn">
            {t("Cancel")}
          </button>
          <button onClick={save} className="btn btn-blue gap-1.5">
            <Check size={16} /> {t("Save")}
          </button>
        </div>
      </div>
    </div>
  );
}
