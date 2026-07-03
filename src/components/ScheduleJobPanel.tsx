"use client";

import { X } from "lucide-react";
import { MoneyInput } from "@/components/fields";
import { initialsOf, bidStatusColor, pillStyle } from "@/lib/bidStatus";
import { useCurrency } from "@/lib/currency";
import { makeId } from "@/lib/defaults";
import { syncJobFromBidders } from "@/lib/jobs";
import { BIDDER_STATUSES, JOB_STATUSES } from "@/lib/types";
import type { Bidder, Job, Project, SubcontractorWithJobs } from "@/lib/types";

type ScheduleJobPanelProps = {
  project: Project;
  job: Job;
  categories: string[];
  subcontractors: SubcontractorWithJobs[];
  onChange: (updater: (j: Job) => Job) => void;
  onClose: () => void;
};

export function ScheduleJobPanel({
  project,
  job,
  categories,
  subcontractors,
  onChange,
  onClose,
}: ScheduleJobPanelProps) {
  const { fmtMoney } = useCurrency();

  function editField<K extends keyof Job>(key: K, value: Job[K]) {
    onChange((j) => ({ ...j, [key]: value }));
  }

  function editBidder(bidderId: string, patch: Partial<Bidder>) {
    onChange((j) =>
      syncJobFromBidders({
        ...j,
        bidders: j.bidders.map((b) => (b.id === bidderId ? { ...b, ...patch } : b)),
      }),
    );
  }

  function addBidder() {
    onChange((j) => ({
      ...j,
      bidders: [
        ...j.bidders,
        { id: makeId(), subcontractorId: null, bidPrice: 0, status: "Not sent", bidLink: "" },
      ],
    }));
  }

  function removeBidder(bidderId: string) {
    onChange((j) =>
      syncJobFromBidders({ ...j, bidders: j.bidders.filter((b) => b.id !== bidderId) }),
    );
  }

  return (
    <aside
      className="flex flex-col shrink-0 overflow-y-auto"
      style={{
        width: 308,
        borderRadius: 20,
        background: "var(--surface-solid)",
        border: "1px solid var(--border)",
        borderTopColor: "var(--border-top)",
        boxShadow: "var(--shadow-lg)",
        maxHeight: "calc(100vh - 100px)",
      }}
    >
      <div
        className="flex items-center justify-between px-4 py-3 shrink-0 border-b"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="min-w-0">
          <div className="label-mono text-[10px] uppercase tracking-widest">Phase detail</div>
          <h3 className="font-extrabold text-[15px] leading-tight mt-0.5 truncate max-w-[210px]">
            {job.category}
          </h3>
          <div className="text-[11px] text-ink-muted truncate max-w-[210px]">{project.name}</div>
        </div>
        <button type="button" onClick={onClose} className="icon-btn" aria-label="Close">
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <label className="block">
          <span className="label-mono mb-1 block text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">
            Category
          </span>
          <select
            className="field-input w-full h-10"
            value={job.category}
            onChange={(e) => editField("category", e.target.value)}
          >
            {Array.from(new Set([job.category, ...categories].filter(Boolean))).map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="label-mono mb-1 block text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">
              Start
            </span>
            <input
              type="date"
              className="field-input w-full h-10"
              value={job.startDate}
              onChange={(e) => editField("startDate", e.target.value)}
            />
          </label>
          <label className="block">
            <span className="label-mono mb-1 block text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">
              End
            </span>
            <input
              type="date"
              className="field-input w-full h-10"
              min={job.startDate || undefined}
              value={job.endDate}
              onChange={(e) => editField("endDate", e.target.value)}
            />
          </label>
        </div>

        <label className="block">
          <span className="label-mono mb-1 block text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">
            Status
          </span>
          <select
            className="field-input w-full h-10"
            value={job.status}
            onChange={(e) => editField("status", e.target.value as Job["status"])}
          >
            {JOB_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="label-mono mb-1 block text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">
            Estimated cost
          </span>
          <MoneyInput
            value={job.estimatedCost}
            onChange={(v) => editField("estimatedCost", v)}
            className="field-input w-full h-10"
          />
        </label>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="label-mono text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">
              Bids ({job.bidders.length})
            </span>
            <button
              type="button"
              onClick={addBidder}
              className="text-[11.5px] font-bold text-accent hover:underline"
            >
              + Add bid
            </button>
          </div>

          {job.bidders.length === 0 ? (
            <p className="text-[12px] text-ink-muted">No bids yet.</p>
          ) : (
            <div className="space-y-2">
              {job.bidders.map((bidder) => {
                const sub = subcontractors.find((s) => s.id === bidder.subcontractorId);
                const color = bidStatusColor(bidder.status);
                return (
                  <div
                    key={bidder.id}
                    className="rounded-[10px] p-2.5"
                    style={{
                      background: "var(--glass-2)",
                      border: "1px solid var(--border)",
                      borderLeft: `3px solid ${color}`,
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className="h-7 w-7 rounded-[8px] flex items-center justify-center text-[10px] font-extrabold text-accent shrink-0"
                        style={{ background: "var(--accent-soft)" }}
                      >
                        {initialsOf(sub?.companyName ?? "?")}
                      </div>
                      <span className="pill" style={pillStyle(bidder.status)}>
                        {bidder.status}
                      </span>
                      {bidder.bidPrice > 0 && (
                        <span className="ml-auto font-mono text-[11px] text-ink-muted">
                          {fmtMoney(bidder.bidPrice)}
                        </span>
                      )}
                    </div>

                    <select
                      className="field-input w-full h-8 text-[12px] mb-1.5"
                      value={bidder.subcontractorId ?? ""}
                      onChange={(e) =>
                        editBidder(bidder.id, { subcontractorId: e.target.value || null })
                      }
                    >
                      <option value="">— Unassigned —</option>
                      {subcontractors.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.companyName}
                        </option>
                      ))}
                    </select>

                    <div className="flex gap-2 items-center">
                      <select
                        className="field-input flex-1 h-8 text-[11.5px]"
                        value={bidder.status}
                        onChange={(e) =>
                          editBidder(bidder.id, { status: e.target.value as Bidder["status"] })
                        }
                      >
                        {BIDDER_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                      <MoneyInput
                        value={bidder.bidPrice}
                        onChange={(v) => editBidder(bidder.id, { bidPrice: v })}
                        className="field-input w-[90px] h-8 text-[12px] font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => removeBidder(bidder.id)}
                        className="icon-btn text-ink-muted hover:text-red-500 shrink-0"
                        aria-label="Remove bid"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

export default ScheduleJobPanel;
