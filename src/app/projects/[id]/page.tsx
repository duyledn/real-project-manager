"use client";

import Link from "next/link";
import {
  Wallet,
  Gavel,
  CheckCircle2,
  CalendarRange,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import { useProjectContext } from "@/lib/projectContext";
import { useSubcontractors } from "@/lib/useSubcontractors";
import { useCurrency } from "@/lib/currency";
import { approvedBidder } from "@/lib/jobs";
import { pillStyle, BID_STATUS_SHORT, subCompliance, initialsOf } from "@/lib/bidStatus";
import { SaveIndicator } from "@/components/fields";

export default function DashboardPage() {
  const { project, loading, error, saveState } = useProjectContext();
  const { subs } = useSubcontractors();
  const { fmtMoney } = useCurrency();

  if (loading) return <div className="text-ink-muted text-sm">Loading…</div>;
  if (error) return <div className="panel border-red text-red p-4 text-sm">{error}</div>;
  if (!project) return null;

  const base = `/projects/${project.id}`;
  const subById = (sid: string | null) => subs.find((s) => s.id === sid) ?? null;

  // --- Surface existing data (compute nothing new) ---------------------------
  // Estimated budget is the sum of each job's stored estimatedCost.
  const estBudget = project.jobs.reduce((s, j) => s + (j.estimatedCost || 0), 0);

  const awarded = project.jobs.reduce((s, j) => {
    const won = approvedBidder(j);
    return s + (won ? won.bidPrice : 0);
  }, 0);

  const allBidders = project.jobs.flatMap((j) =>
    j.bidders.map((b) => ({ ...b, jobId: j.id, jobCategory: j.category })),
  );
  const bidsInPlay = allBidders.filter((b) => b.status !== "Not sent").length;

  const awardedJobs = project.jobs.filter((j) => approvedBidder(j)).length;
  const datedJobs = project.jobs.filter((j) => j.startDate).length;
  const awardedPct = estBudget > 0 ? Math.min(100, Math.round((awarded / estBudget) * 100)) : 0;

  // Bids awaiting a decision: received (and not yet approved).
  const decisionBids = allBidders.filter((b) => b.status === "Bid received");

  // Compliance alerts: subs engaged on this project that are missing docs.
  const engagedSubIds = Array.from(
    new Set(allBidders.map((b) => b.subcontractorId).filter((x): x is string => !!x)),
  );
  const complianceAlerts = engagedSubIds
    .map((sid) => ({ sub: subById(sid), comp: subCompliance(subById(sid)) }))
    .filter((x) => x.sub && !x.comp.ok);

  const metrics = [
    { icon: Wallet, value: fmtMoney(estBudget), label: "Estimated budget", note: `${project.jobs.length} jobs` },
    { icon: Gavel, value: String(bidsInPlay), label: "Bids in play", note: `${allBidders.length} total` },
    { icon: CheckCircle2, value: fmtMoney(awarded), label: "Awarded", note: `${awardedJobs} committed` },
    { icon: CalendarRange, value: `${datedJobs}/${project.jobs.length || 0}`, label: "Scheduled", note: "jobs dated" },
  ];

  return (
    <div className="space-y-5">
      {/* Title */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display font-extrabold text-3xl leading-none">{project.name}</h1>
          <p className="text-ink-muted text-sm mt-1.5">
            {project.holdYears}-yr hold · {project.projectAddress || "No address set"}
          </p>
        </div>
        <SaveIndicator state={saveState} />
      </div>

      {/* Metric tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {metrics.map((m) => {
          const Icon = m.icon;
          return (
            <div key={m.label} className="panel-2 p-4">
              <Icon size={20} className="text-accent" />
              <div className="font-mono text-[22px] font-extrabold tracking-tight mt-3 truncate">{m.value}</div>
              <div className="text-xs text-ink-muted font-medium mt-0.5">{m.label}</div>
              <div className="text-[11px] text-faint mt-0.5">{m.note}</div>
            </div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-[1.5fr_1fr] gap-3.5">
        {/* Bids needing your decision */}
        <div className="panel-2 p-[18px]">
          <div className="flex items-center justify-between mb-3.5">
            <div className="font-extrabold text-[14.5px]">Bids needing your decision</div>
            <span className="pill" style={{ color: "var(--accent)", background: "var(--accent-soft)" }}>
              {decisionBids.length} pending
            </span>
          </div>
          {decisionBids.length === 0 ? (
            <p className="text-sm text-ink-muted py-6 text-center">
              Nothing awaiting a decision. Received bids show up here.
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
                      {initialsOf(sub?.companyName ?? "—")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-bold truncate">{sub?.companyName ?? "Unassigned"}</div>
                      <div className="text-[11.5px] text-ink-muted">
                        {b.jobCategory} ·{" "}
                        <span className="pill !px-2 !py-0.5" style={pillStyle(b.status)}>
                          {BID_STATUS_SHORT[b.status]}
                        </span>
                      </div>
                    </div>
                    <div className="font-mono font-semibold text-[13.5px] whitespace-nowrap">{fmtMoney(b.bidPrice)}</div>
                    <Link href={`${base}/manage?job=${b.jobId}`} className="btn !px-3 !py-1.5 !text-[11.5px]">
                      Review
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-3.5">
          {/* Awarded vs budget */}
          <div className="panel-2 p-[18px]">
            <div className="font-extrabold text-[14.5px] mb-1">Awarded vs budget</div>
            <div className="text-[11.5px] text-ink-muted mb-3.5">
              {awardedJobs} of {project.jobs.length} jobs committed
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

          {/* Compliance alerts */}
          <div className="panel-2 p-[18px]">
            <div className="flex items-center gap-2 mb-3">
              {complianceAlerts.length === 0 ? (
                <ShieldCheck size={20} className="text-green" />
              ) : (
                <ShieldCheck size={20} style={{ color: "var(--warn)" }} />
              )}
              <div className="font-extrabold text-[14.5px]">Compliance alerts</div>
            </div>
            {complianceAlerts.length === 0 ? (
              <p className="text-[12.5px] text-ink-muted">
                {engagedSubIds.length === 0
                  ? "No subcontractors engaged yet."
                  : "All engaged subs have W-9, License & Workers' Comp on file."}
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {complianceAlerts.map(({ sub, comp }) => (
                  <div key={sub!.id} className="flex items-center gap-2.5 text-[12.5px]">
                    <AlertTriangle size={16} style={{ color: "var(--neg)" }} className="shrink-0" />
                    <span className="font-semibold flex-1 truncate">{sub!.companyName}</span>
                    <span className="text-ink-muted text-[11.5px] whitespace-nowrap">
                      Missing {comp.missing.join(", ")}
                    </span>
                  </div>
                ))}
                <Link href="/subcontractors" className="text-[12px] font-bold text-accent inline-flex items-center gap-1 mt-1">
                  Manage subcontractors <ArrowRight size={13} />
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
