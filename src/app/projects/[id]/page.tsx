"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Wallet,
  Gavel,
  CheckCircle2,
  CalendarRange,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  Pencil,
  X,
  Check,
} from "lucide-react";
import { useProjectContext } from "@/lib/projectContext";
import { useSubcontractors } from "@/lib/useSubcontractors";
import { useCurrency } from "@/lib/currency";
import { useI18n } from "@/lib/i18n";
import { approvedBidder } from "@/lib/jobs";
import { pillStyle, BID_STATUS_SHORT, subCompliance, initialsOf } from "@/lib/bidStatus";
import { SaveIndicator } from "@/components/fields";
import type { Project } from "@/lib/types";

const STRATEGY_PRESETS = [
  "Buy-Rehab-Hold Rental",
  "Buy-Rehab-Sell (Flip)",
  "Short-Term / Vacation Rental",
  "BRRRR",
  "New Construction",
  "Commercial / Mixed-Use",
];

import { neon } from '@neondatabase/serverless';

export default function Page() {
  async function create(formData: FormData) {
    'use server';
    // Connect to the Neon database
    const sql = neon(`${process.env.DATABASE_URL}`);
    const comment = formData.get('comment');
    // Insert the comment from the form into the Postgres database
    await sql('INSERT INTO comments (comment) VALUES ($1)', [comment]);
  }

  return (
    <form action={create}>
      <input type="text" placeholder="write a comment" name="comment" />
      <button type="submit">Submit</button>
    </form>
  );
}

export default function DashboardPage() {
  const { project, setProject, loading, error, saveState } = useProjectContext();
  const { subs } = useSubcontractors();
  const { fmtMoney } = useCurrency();
  const { t } = useI18n();
  const [editing, setEditing] = useState(false);

  if (loading) return <div className="text-ink-muted text-sm">{t("Loading…")}</div>;
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
    { icon: Wallet, value: fmtMoney(estBudget), label: t("Total budget"), note: t("{n} jobs", { n: project.jobs.length }) },
    { icon: Gavel, value: String(bidsInPlay), label: t("Bids in play"), note: t("{n} total", { n: allBidders.length }) },
    { icon: CheckCircle2, value: fmtMoney(awarded), label: t("Awarded"), note: t("{a}/{b} jobs", { a: awardedJobs, b: project.jobs.length }) },
    { icon: CalendarRange, value: `${datedJobs}/${project.jobs.length || 0}`, label: t("Scheduled"), note: t("jobs dated") },
  ];

  return (
    <div className="space-y-5">
      {/* Title */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3.5 min-w-0">
          {project.profileImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={project.profileImage}
              alt=""
              className="w-14 h-14 rounded-[16px] object-cover shrink-0"
              style={{ border: "1px solid var(--border)" }}
            />
          ) : (
            <div
              className="w-14 h-14 rounded-[16px] flex items-center justify-center text-white font-extrabold text-lg shrink-0"
              style={{ background: "linear-gradient(150deg,#7A8C5A,#9DAE6E)" }}
            >
              {initialsOf(project.name)}
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-display font-extrabold text-3xl leading-none truncate">{project.name}</h1>
              <button
                onClick={() => setEditing(true)}
                className="icon-btn shrink-0"
                aria-label={t("Edit project name, strategy and address")}
                title={t("Edit project details")}
              >
                <Pencil size={14} />
              </button>
            </div>
            <p className="text-ink-muted text-sm mt-1.5">
              {project.investmentStrategy || t("Buy-Rehab-Hold Rental")} · {t("{years}-yr hold", { years: project.holdYears })} ·{" "}
              {project.projectAddress || t("No address set")}
            </p>
          </div>
        </div>
        <SaveIndicator state={saveState} />
      </div>

      {editing && (
        <EditIdentityModal project={project} setProject={setProject} onClose={() => setEditing(false)} />
      )}

      {/* Metric tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {metrics.map((m) => {
          const Icon = m.icon;
          return (
            <div key={m.label} className="panel-2 p-4">
              <div className="flex items-center justify-between">
                <Icon size={20} className="text-accent" />
                <span
                  className="text-[11px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap"
                  style={{ color: "var(--muted)", background: "var(--glass)" }}
                >
                  {m.note}
                </span>
              </div>
              <div className="font-mono text-[22px] font-extrabold tracking-tight mt-3 truncate">{m.value}</div>
              <div className="text-xs text-ink-muted font-medium mt-0.5">{m.label}</div>
            </div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-[1.5fr_1fr] gap-3.5">
        {/* Bids needing your decision */}
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
                      {initialsOf(sub?.companyName ?? "—")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-bold truncate">{sub?.companyName ?? t("Unassigned")}</div>
                      <div className="text-[11.5px] text-ink-muted">
                        {b.jobCategory} ·{" "}
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

        {/* Right column */}
        <div className="flex flex-col gap-3.5">
          {/* Awarded vs budget */}
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

          {/* Compliance alerts */}
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

/** Quick-edit sheet for the project's identity: name, investment strategy,
 *  and address. Binds straight to the autosaving setProject. */
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
          <button onClick={onClose} className="btn">{t("Cancel")}</button>
          <button onClick={save} className="btn btn-blue gap-1.5">
            <Check size={16} /> {t("Save")}
          </button>
        </div>
      </div>
    </div>
  );
}
