"use client";

import { useEffect, useState } from "react";
import { Plus, X, Settings2 } from "lucide-react";
import { useProjectContext } from "@/lib/projectContext";
import { useJobCategories } from "@/lib/useJobCategories";
import { useSubcontractors } from "@/lib/useSubcontractors";
import { useCurrency } from "@/lib/currency";
import { makeId } from "@/lib/defaults";
import { approvedBidder, showsApprovedDetails } from "@/lib/jobs";
import { JOB_STATUSES } from "@/lib/types";
import type { Project, Job } from "@/lib/types";
import { SectionHeader, TextField, DragHandle } from "@/components/fields";
import { useDragReorder, moveItem } from "@/lib/useDragReorder";
import { useColumnWidths } from "@/lib/useColumnWidths";
import { ResizableTh } from "@/components/ResizableTh";
import { JobDrawer } from "@/components/JobDrawer";
import { JobsBidsBoard } from "@/components/JobsBidsBoard";

export default function ManagePage() {
  const { project, setProject, loading, error } = useProjectContext();
  const { categories, addCategory, removeCategory } = useJobCategories();
  const { subs } = useSubcontractors();
  const { fmtMoney } = useCurrency();

  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [showCatManager, setShowCatManager] = useState(false);
  const [newCat, setNewCat] = useState("");
  const [deepLinkJob, setDeepLinkJob] = useState<string | null>(null);

  // Deep-link from the Dashboard's "Review" action: ?job=<id> selects that job
  // in the board and opens its drawer.
  useEffect(() => {
    const jid = new URLSearchParams(window.location.search).get("job");
    if (jid) {
      setDeepLinkJob(jid);
      setSelectedJobId(jid);
    }
  }, []);
  const jobsDrag = useDragReorder((from, to) => {
    setProject((p) => ({ ...p, jobs: moveItem(p.jobs, from, to) }));
    return to;
  });

  const { widths: jobW, startResize: jobResize } = useColumnWidths("jobs", {
    job: 192, start: 128, end: 132, status: 176, budget: 112, approved: 200,
  });
  const jobsTableWidth = 28 + jobW.job + jobW.start + jobW.end + jobW.status + jobW.budget + jobW.approved + 96;

  // One-way auto-fill: every named remodel item is pushed into Jobs exactly
  // once (tracked by importedItemIds). Editing or deleting the resulting job
  // never flows back to the remodel costs, and a deleted job is not re-added.
  useEffect(() => {
    if (!project) return;
    const imported = new Set(project.importedItemIds);
    const fresh = project.items.filter((i) => i.description.trim() !== "" && !imported.has(i.id));
    if (fresh.length === 0) return;
    setProject((p) => {
      const ledger = new Set(p.importedItemIds);
      const items = p.items.filter((i) => i.description.trim() !== "" && !ledger.has(i.id));
      if (items.length === 0) return p;
      const startDate = p.startDate || new Date().toISOString().slice(0, 10);
      const newJobs: Job[] = items.map((i) => ({
        id: makeId(),
        category: i.description.trim(),
        startDate,
        endDate: "",
        status: "N/A",
        approvedBidderId: null,
        color: "",
        estimatedCost: i.qty * i.unitCost,
        sourceItemId: i.id,
        bidders: [],
      }));
      return {
        ...p,
        jobs: [...p.jobs, ...newJobs],
        importedItemIds: [...p.importedItemIds, ...items.map((i) => i.id)],
      };
    });
  }, [project, setProject]);

  if (loading) return <div className="font-mono text-ink-muted text-sm uppercase">Loading…</div>;
  if (error) return <div className="panel border-red text-red p-4 font-mono text-sm">{error}</div>;
  if (!project) return null;

  function patch(updater: (p: Project) => Project) {
    setProject(updater);
  }
  function updateJob(jobId: string, updater: (j: Job) => Job) {
    patch((p) => ({ ...p, jobs: p.jobs.map((j) => (j.id === jobId ? updater(j) : j)) }));
  }
  function addJob() {
    const category = categories[0] ?? "Designing";
    patch((p) => ({
      ...p,
      jobs: [
        ...p.jobs,
        {
          id: makeId(),
          category,
          startDate: p.startDate || new Date().toISOString().slice(0, 10),
          endDate: "",
          status: "N/A",
          approvedBidderId: null,
          color: "",
          estimatedCost: 0,
          sourceItemId: "",
          bidders: [],
        },
      ],
    }));
  }
  function removeJob(jobId: string) {
    patch((p) => ({ ...p, jobs: p.jobs.filter((j) => j.id !== jobId) }));
    if (selectedJobId === jobId) setSelectedJobId(null);
  }

  const selectedJob = project.jobs.find((j) => j.id === selectedJobId) ?? null;

  return (
    <div className="space-y-10">
      {/* 01 — Jobs table */}
      <section>
        <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
          <SectionHeader num="01" title="Jobs" caption="Each construction scope. Click a row to manage its bids." />
          <button onClick={() => setShowCatManager((s) => !s)} className="btn inline-flex items-center gap-1.5 shrink-0">
            <Settings2 size={14} /> Manage categories
          </button>
        </div>

        {showCatManager && (
          <div className="panel p-4 mb-4">
            <div className="label-mono mb-2">Job Categories (shared across all projects)</div>
            <div className="flex flex-wrap gap-2 mb-3">
              {categories.map((c) => (
                <span key={c} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: "var(--glass-2)", border: "1px solid var(--border)" }}>
                  {c}
                  <button onClick={() => removeCategory(c)} className="text-ink-muted hover:text-red" aria-label={`Remove ${c}`}>
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void addCategory(newCat);
                setNewCat("");
              }}
              className="flex gap-2"
            >
              <input value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="Add a new category…" className="field-input flex-1 max-w-xs" />
              <button type="submit" className="btn btn-blue inline-flex items-center gap-1.5">
                <Plus size={14} /> Add
              </button>
            </form>
            <p className="text-[11px] text-ink-muted mt-2">Adding or removing here syncs to every project instantly.</p>
          </div>
        )}

        <div className="panel overflow-x-auto">
          <table className="border-collapse" style={{ tableLayout: "fixed", width: jobsTableWidth }}>
            <colgroup>
              <col style={{ width: 28 }} />
              <col style={{ width: jobW.job }} />
              <col style={{ width: jobW.start }} />
              <col style={{ width: jobW.end }} />
              <col style={{ width: jobW.status }} />
              <col style={{ width: jobW.budget }} />
              <col style={{ width: jobW.approved }} />
              <col style={{ width: 96 }} />
            </colgroup>
            <thead>
              <tr className="border-b-[1.5px] border-ink">
                <th />
                <ResizableTh label="Job" col="job" startResize={jobResize} />
                <ResizableTh label="Start" col="start" startResize={jobResize} />
                <ResizableTh label={<>End <span className="normal-case opacity-70">(optional)</span></>} col="end" startResize={jobResize} />
                <ResizableTh label="Status" col="status" startResize={jobResize} />
                <ResizableTh label="Budget" col="budget" startResize={jobResize} align="right" />
                <ResizableTh label="Approved Sub / Price" col="approved" startResize={jobResize} />
                <th />
              </tr>
            </thead>
            <tbody>
              {project.jobs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-ink-muted text-sm">No jobs yet. Add your first scope below.</td>
                </tr>
              ) : (
                project.jobs.map((job, idx) => {
                  const winner = approvedBidder(job);
                  const winnerSub = winner ? subs.find((s) => s.id === winner.subcontractorId) : null;
                  return (
                    <tr
                      key={job.id}
                      {...jobsDrag.rowProps(idx)}
                      className={`border-b border-hair last:border-0 transition-colors ${jobsDrag.dragIndex === idx ? "" : "hover:bg-[var(--accent-soft)]"}`}
                      style={jobsDrag.dragIndex === idx
                        ? { background: "var(--surface-solid)", outline: "2px solid var(--accent)", outlineOffset: "-2px", position: "relative", zIndex: 1 }
                        : undefined}
                    >
                      <td className="p-1.5 text-center align-middle">
                        <DragHandle handleProps={jobsDrag.handleProps(idx)} />
                      </td>
                      <td className="p-1.5">
                        <select
                          value={job.category}
                          onChange={(e) => updateJob(job.id, (j) => ({ ...j, category: e.target.value }))}
                          className="cell-input font-semibold"
                        >
                          {[...new Set([job.category, ...categories])].map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </td>
                      <td className="p-1.5">
                        <input
                          type="date"
                          value={job.startDate}
                          onChange={(e) => updateJob(job.id, (j) => ({ ...j, startDate: e.target.value }))}
                          className="cell-input font-mono text-xs"
                        />
                      </td>
                      <td className="p-1.5">
                        <input
                          type="date"
                          value={job.endDate}
                          min={job.startDate || undefined}
                          onChange={(e) => updateJob(job.id, (j) => ({ ...j, endDate: e.target.value }))}
                          className="cell-input font-mono text-xs"
                        />
                      </td>
                      <td className="p-1.5">
                        <select
                          value={job.status}
                          onChange={(e) => updateJob(job.id, (j) => ({ ...j, status: e.target.value as Job["status"] }))}
                          className="cell-input"
                        >
                          {JOB_STATUSES.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </td>
                      <td className="p-2.5 text-right font-mono text-sm whitespace-nowrap">
                        {job.estimatedCost > 0 ? (
                          <span title={job.sourceItemId ? "Auto-filled from remodel costs" : undefined}>
                            {fmtMoney(job.estimatedCost)}
                            {job.sourceItemId && <span className="label-mono ml-1 align-middle">est</span>}
                          </span>
                        ) : (
                          <span className="text-ink-muted">—</span>
                        )}
                      </td>
                      <td className="p-2.5 text-sm">
                        {showsApprovedDetails(job.status) && winner ? (
                          <span>
                            <span className="font-semibold">{winnerSub?.companyName ?? "—"}</span>
                            <span className="text-ink-muted"> · </span>
                            <span className="font-mono">{fmtMoney(winner.bidPrice)}</span>
                          </span>
                        ) : (
                          <span className="text-ink-muted">—</span>
                        )}
                      </td>
                      <td className="p-1.5">
                        <div className="flex items-center gap-1.5 justify-end">
                          <button onClick={() => setSelectedJobId(job.id)} className="btn !py-1 !px-2.5 text-[10px]">
                            Open
                          </button>
                          <button onClick={() => removeJob(job.id)} className="icon-btn flex items-center justify-center" aria-label="Remove job">
                            <X size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <button onClick={addJob} className="btn btn-blue mt-3 inline-flex items-center gap-1.5">
          <Plus size={14} /> Add job
        </button>
      </section>

      {/* 02 — Bids board (Kanban / Spreadsheet) */}
      <section>
        <SectionHeader num="02" title="Bids" caption="Track every bid as a Kanban board (drag to change status) or an Excel-style spreadsheet across all jobs." />
        <JobsBidsBoard
          project={project}
          setProject={setProject}
          subs={subs}
          categories={categories}
          initialJobId={deepLinkJob}
        />
      </section>

      {/* 03 — Bid email identity (kept last: it configures outgoing bid-request emails) */}
      <section>
        <SectionHeader num="03" title="Bid Email Identity" caption="Used to auto-fill bid-request emails sent from each job's bidder rows." />
        <div className="panel p-5 grid sm:grid-cols-3 gap-5">
          <TextField label="Your Company Name" value={project.companyName} onChange={(v) => patch((p) => ({ ...p, companyName: v }))} placeholder="123 Construction" />
          <TextField label="Your Name (sender)" value={project.senderName} onChange={(v) => patch((p) => ({ ...p, senderName: v }))} placeholder="Duy" />
          <TextField label="Plans Link" value={project.plansLink} onChange={(v) => patch((p) => ({ ...p, plansLink: v }))} placeholder="https://drive.google.com/…" hint="Included in the email so bidders can access the plans." />
        </div>
      </section>

      {/* Drawer (mini-tab) */}
      {selectedJob && (
        <JobDrawer
          project={project}
          job={selectedJob}
          subcontractors={subs}
          categories={categories}
          onChange={(updater) => updateJob(selectedJob.id, updater)}
          onClose={() => setSelectedJobId(null)}
        />
      )}
    </div>
  );
}
