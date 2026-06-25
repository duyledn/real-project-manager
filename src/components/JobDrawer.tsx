"use client";

import { X, Plus, Mail, ExternalLink, Trash2 } from "lucide-react";
import { makeId } from "@/lib/defaults";
import { buildBidRequestMailto, syncJobFromBidders } from "@/lib/jobs";
import { BIDDER_STATUSES } from "@/lib/types";
import type { Project, Job, Bidder, SubcontractorWithJobs } from "@/lib/types";
import { useCurrency } from "@/lib/currency";
import { useDragReorder, moveItem } from "@/lib/useDragReorder";
import { DragHandle, MoneyInput, currencySymbol } from "@/components/fields";

export function JobDrawer({
  project,
  job,
  subcontractors,
  categories,
  onChange,
  onClose,
}: {
  project: Project;
  job: Job;
  subcontractors: SubcontractorWithJobs[];
  categories: string[];
  onChange: (updater: (j: Job) => Job) => void;
  onClose: () => void;
}) {
  const { fmtMoney, currency } = useCurrency();
  const biddersDrag = useDragReorder((from, to) =>
    onChange((j) => ({ ...j, bidders: moveItem(j.bidders, from, to) })),
  );

  // Any edit to a bidder re-syncs the job's headline status (features #4/#7).
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
    onChange((j) => syncJobFromBidders({ ...j, bidders: j.bidders.filter((b) => b.id !== bidderId) }));
  }

  function emailBidder(bidder: Bidder) {
    const sub = subcontractors.find((s) => s.id === bidder.subcontractorId) ?? null;
    const url = buildBidRequestMailto(project, job, sub);
    if (!url) {
      alert("Pick a subcontractor with an email address first.");
      return;
    }
    window.location.href = url;
    // Opening the request implies the bid was solicited.
    if (bidder.status === "Not sent") editBidder(bidder.id, { status: "Bid Requested" });
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-ink/30 z-40" onClick={onClose} aria-hidden />

      {/* Side panel */}
      <aside className="fixed top-0 right-0 h-full w-full max-w-2xl bg-paper border-l-[1.5px] border-ink z-50 overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-paper border-b-[1.5px] border-ink px-5 py-4 flex items-center justify-between z-10">
          <div>
            <div className="label-mono">Configure Job</div>
            <h2 className="font-display font-extrabold text-2xl leading-none mt-1">{job.category}</h2>
          </div>
          <button onClick={onClose} className="icon-btn flex items-center justify-center" aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-6">
          {/* Job basics */}
          <div className="grid sm:grid-cols-3 gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="label-mono">Category</span>
              <select
                value={job.category}
                onChange={(e) => onChange((j) => ({ ...j, category: e.target.value }))}
                className="field-input"
              >
                {[...new Set([job.category, ...categories])].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="label-mono">Start Date</span>
              <input
                type="date"
                value={job.startDate}
                onChange={(e) => onChange((j) => ({ ...j, startDate: e.target.value }))}
                className="field-input"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="label-mono">End Date</span>
              <input
                type="date"
                value={job.endDate}
                onChange={(e) => onChange((j) => ({ ...j, endDate: e.target.value }))}
                className="field-input"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="label-mono">Budget / Estimate ({currencySymbol(currency)})</span>
              <MoneyInput
                min={0}
                value={job.estimatedCost}
                onChange={(v) => onChange((j) => ({ ...j, estimatedCost: v }))}
                className="field-input font-mono"
              />
              <span className="text-[11px] text-ink-muted leading-tight">
                {job.sourceItemId ? "Seeded from remodel costs; editing here won't change them." : "Manual budget for this scope."}
              </span>
            </label>
          </div>

          {/* Bidders */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="label-mono">Bidders</div>
              <span className="font-mono text-[11px] text-ink-muted">{job.bidders.length} bidder(s)</span>
            </div>

            {job.bidders.length === 0 ? (
              <p className="text-sm text-ink-muted mb-3">No bidders yet. Add one to request a bid.</p>
            ) : (
              <div className="space-y-3">
                {job.bidders.map((b, idx) => {
                  const sub = subcontractors.find((s) => s.id === b.subcontractorId) ?? null;
                  const approved = b.id === job.approvedBidderId;
                  return (
                    <div
                      key={b.id}
                      {...biddersDrag.rowProps(idx)}
                      className={`border-[1.5px] p-3 ${approved ? "border-green bg-panel" : "border-hair bg-panel"} ${biddersDrag.dragIndex === idx ? "opacity-40" : ""}`}
                      style={biddersDrag.overIndex === idx && biddersDrag.dragIndex !== idx ? { boxShadow: "inset 0 2px 0 #1D4ED8" } : undefined}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <DragHandle handleProps={biddersDrag.handleProps(idx)} />
                        <span className="label-mono">Bidder {idx + 1}</span>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-3">
                        <label className="flex flex-col gap-1">
                          <span className="label-mono">Subcontractor</span>
                          <select
                            value={b.subcontractorId ?? ""}
                            onChange={(e) => editBidder(b.id, { subcontractorId: e.target.value || null })}
                            className="field-input"
                          >
                            <option value="">— Select —</option>
                            {subcontractors.map((s) => (
                              <option key={s.id} value={s.id}>{s.companyName}</option>
                            ))}
                          </select>
                        </label>
                        <label className="flex flex-col gap-1">
                          <span className="label-mono">Bid Price ({currencySymbol(currency)})</span>
                          <MoneyInput
                            min={0}
                            value={b.bidPrice}
                            onChange={(v) => editBidder(b.id, { bidPrice: v })}
                            className="field-input font-mono"
                          />
                          {b.bidPrice > 0 && <span className="text-[11px] text-ink-muted">{fmtMoney(b.bidPrice)}</span>}
                        </label>
                        <label className="flex flex-col gap-1">
                          <span className="label-mono">Status</span>
                          <select
                            value={b.status}
                            onChange={(e) => editBidder(b.id, { status: e.target.value as Bidder["status"] })}
                            className="field-input"
                          >
                            {BIDDER_STATUSES.map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        </label>
                        <label className="flex flex-col gap-1">
                          <span className="label-mono">Bid Document (Drive link)</span>
                          <input
                            value={b.bidLink}
                            placeholder="https://drive.google.com/…"
                            onChange={(e) => editBidder(b.id, { bidLink: e.target.value })}
                            className="field-input"
                          />
                        </label>
                      </div>

                      <div className="flex items-center gap-2 mt-3 flex-wrap">
                        <button
                          onClick={() => emailBidder(b)}
                          className="btn btn-blue inline-flex items-center gap-1.5 !py-1.5"
                          title={sub?.email ? `Email ${sub.email}` : "Select a subcontractor with an email"}
                        >
                          <Mail size={13} /> Request bid via email
                        </button>
                        {b.bidLink && (
                          <a href={b.bidLink} target="_blank" rel="noopener noreferrer" className="btn inline-flex items-center gap-1.5 !py-1.5">
                            <ExternalLink size={13} /> Open bid
                          </a>
                        )}
                        {approved && (
                          <span className="font-mono text-[10px] uppercase tracking-wider text-green border border-green px-2 py-1">
                            Approved bid
                          </span>
                        )}
                        <button onClick={() => removeBidder(b.id)} className="icon-btn flex items-center justify-center ml-auto" aria-label="Remove bidder">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <button onClick={addBidder} className="btn btn-blue mt-3 inline-flex items-center gap-1.5">
              <Plus size={14} /> Add bidder
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
