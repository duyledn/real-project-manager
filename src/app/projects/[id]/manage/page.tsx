"use client";

import { useEffect, useState } from "react";
import { Plus, X, Settings2, Maximize2, Minimize2 } from "lucide-react";
import { useProjectContext } from "@/lib/projectContext";
import { useJobCategories } from "@/lib/useJobCategories";
import { useSubcontractors } from "@/lib/useSubcontractors";
import { useCurrency } from "@/lib/currency";
import { makeId } from "@/lib/defaults";
import { approvedBidder, showsApprovedDetails } from "@/lib/jobs";
import { JOB_STATUSES } from "@/lib/types";
import type { Project, Job } from "@/lib/types";
import { SaveIndicator, SectionHeader, TextField, DateField, DragHandle } from "@/components/fields";
import { useDragReorder, moveItem } from "@/lib/useDragReorder";
import { JobDrawer } from "@/components/JobDrawer";
import { JobTimeline } from "@/components/JobTimeline";

export default function ManagePage() {
  const { project, setProject, loading, error, saveState } = useProjectContext();
  const { categories, addCategory, removeCategory } = useJobCategories();
  const { subs } = useSubcontractors();
  const { fmtMoney } = useCurrency();

  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [showCatManager, setShowCatManager] = useState(false);
  const [newCat, setNewCat] = useState("");
  const [timelineExpanded, setTimelineExpanded] = useState(false);
  const jobsDrag = useDragReorder((from, to) =>
    setProject((p) => ({ ...p, jobs: moveItem(p.jobs, from, to) })),
  );

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
      {/* Title + save */}
      <div className="panel p-5 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="label-mono mb-1">Phase 2 · Project Management</div>
          <h1 className="font-display font-extrabold text-3xl leading-none">{project.name}</h1>
        </div>
        <SaveIndicator state={saveState} />
      </div>

      {/* 01 — Project details */}
      <section>
        <SectionHeader num="01" title="Project Details" caption="Who's running the job and the anticipated start. New jobs default to this start date." />
        <div className="panel p-5 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <DateField label="Anticipated Start Date" value={project.startDate} onChange={(v) => patch((p) => ({ ...p, startDate: v }))} />
          <TextField label="Project Address" value={project.projectAddress} onChange={(v) => patch((p) => ({ ...p, projectAddress: v }))} placeholder="123 Main St, City" />
          <TextField label="Project Manager" value={project.projectManager} onChange={(v) => patch((p) => ({ ...p, projectManager: v }))} placeholder="Name" />
          <TextField label="Owner" value={project.owner} onChange={(v) => patch((p) => ({ ...p, owner: v }))} placeholder="Name" />
          <TextField label="General Contractor" value={project.generalContractor} onChange={(v) => patch((p) => ({ ...p, generalContractor: v }))} placeholder="Company / name" />
        </div>
      </section>

      {/* 02 — Email identity */}
      <section>
        <SectionHeader num="02" title="Bid Email Identity" caption="Used to auto-fill bid-request emails sent from each job's bidder rows." />
        <div className="panel p-5 grid sm:grid-cols-3 gap-5">
          <TextField label="Your Company Name" value={project.companyName} onChange={(v) => patch((p) => ({ ...p, companyName: v }))} placeholder="123 Construction" />
          <TextField label="Your Name (sender)" value={project.senderName} onChange={(v) => patch((p) => ({ ...p, senderName: v }))} placeholder="Duy" />
          <TextField label="Plans Link" value={project.plansLink} onChange={(v) => patch((p) => ({ ...p, plansLink: v }))} placeholder="https://drive.google.com/…" hint="Included in the email so bidders can access the plans." />
        </div>
      </section>

      {/* 03 — Jobs table */}
      <section>
        <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
          <SectionHeader num="03" title="Jobs" caption="Each construction scope. Click a row to manage its bids." />
          <button onClick={() => setShowCatManager((s) => !s)} className="btn inline-flex items-center gap-1.5 shrink-0">
            <Settings2 size={14} /> Manage categories
          </button>
        </div>

        {showCatManager && (
          <div className="panel p-4 mb-4">
            <div className="label-mono mb-2">Job Categories (shared across all projects)</div>
            <div className="flex flex-wrap gap-2 mb-3">
              {categories.map((c) => (
                <span key={c} className="inline-flex items-center gap-1.5 border border-hair px-2.5 py-1 font-mono text-xs">
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
          <table className="w-full border-collapse min-w-[680px]">
            <thead>
              <tr className="border-b-[1.5px] border-ink">
                <th className="w-7" />
                <th className="text-left label-mono p-2.5 w-48">Job</th>
                <th className="text-left label-mono p-2.5 w-32">Start</th>
                <th className="text-left label-mono p-2.5 w-32">End <span className="normal-case opacity-70">(optional)</span></th>
                <th className="text-left label-mono p-2.5 w-44">Status</th>
                <th className="text-right label-mono p-2.5 w-28">Budget</th>
                <th className="text-left label-mono p-2.5">Approved Sub / Price</th>
                <th className="w-24" />
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
                      className={`border-b border-hair last:border-0 ${jobsDrag.dragIndex === idx ? "opacity-40" : ""}`}
                      style={jobsDrag.overIndex === idx && jobsDrag.dragIndex !== idx ? { boxShadow: "inset 0 2px 0 #1D4ED8" } : undefined}
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

      {/* 04 — Timeline */}
      {project.jobs.length > 0 && (
        <section>
          <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
            <SectionHeader num="04" title="Timeline" caption="Each job positioned by its start and (optional) end date. Click a bar to configure the job." />
            <button onClick={() => setTimelineExpanded(true)} className="btn inline-flex items-center gap-1.5 shrink-0">
              <Maximize2 size={14} /> Expand
            </button>
          </div>
          <JobTimeline
            jobs={project.jobs}
            selectedJobId={selectedJobId}
            onSelect={setSelectedJobId}
            onAddJob={addJob}
            onColorChange={(jobId, color) => updateJob(jobId, (j) => ({ ...j, color }))}
          />
        </section>
      )}

      {/* Expanded timeline — 3/4 of the screen */}
      {timelineExpanded && (
        <div className="fixed inset-0 z-50 bg-ink/40 flex items-center justify-center p-4" onClick={() => setTimelineExpanded(false)}>
          <div
            className="bg-paper border-[1.5px] border-ink shadow-2xl flex flex-col"
            style={{ width: "75vw", height: "75vh" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b-[1.5px] border-ink shrink-0">
              <div>
                <div className="label-mono">Phase 2 · Timeline</div>
                <h2 className="font-display font-extrabold text-xl leading-none mt-0.5">{project.name}</h2>
              </div>
              <button onClick={() => setTimelineExpanded(false)} className="btn inline-flex items-center gap-1.5">
                <Minimize2 size={14} /> Close
              </button>
            </div>
            <div className="flex-1 overflow-auto p-5">
              <JobTimeline
                jobs={project.jobs}
                selectedJobId={selectedJobId}
                onSelect={setSelectedJobId}
                onAddJob={addJob}
                onColorChange={(jobId, color) => updateJob(jobId, (j) => ({ ...j, color }))}
              />
            </div>
          </div>
        </div>
      )}

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
