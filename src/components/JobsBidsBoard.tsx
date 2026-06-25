"use client";

import { useState, type DragEvent } from "react";
import {
  LayoutGrid,
  Table2,
  Plus,
  FileText,
  Upload,
  CheckCircle2,
  AlertCircle,
  GripVertical,
  Trash2,
} from "lucide-react";
import { makeId } from "@/lib/defaults";
import { syncJobFromBidders } from "@/lib/jobs";
import { BIDDER_STATUSES } from "@/lib/types";
import type { Project, Job, Bidder, SubcontractorWithJobs, BidderStatus } from "@/lib/types";
import { useCurrency } from "@/lib/currency";
import { MoneyInput } from "@/components/fields";
import {
  bidStatusColor,
  hexAlpha,
  initialsOf,
  subCompliance,
  BID_STATUS_SHORT,
} from "@/lib/bidStatus";

type View = "kanban" | "spreadsheet";

const today = () => new Date().toISOString().slice(0, 10);

function newBidder(): Bidder {
  return { id: makeId(), subcontractorId: null, bidPrice: 0, status: "Not sent", bidLink: "" };
}

function newJob(category: string, startDate: string, bidders: Bidder[] = []): Job {
  return {
    id: makeId(),
    category,
    startDate,
    endDate: "",
    status: "N/A",
    approvedBidderId: null,
    color: "",
    estimatedCost: 0,
    sourceItemId: "",
    bidders,
  };
}

export function JobsBidsBoard({
  project,
  setProject,
  subs,
  categories,
  initialJobId,
}: {
  project: Project;
  setProject: (updater: (p: Project) => Project) => void;
  subs: SubcontractorWithJobs[];
  categories: string[];
  initialJobId?: string | null;
}) {
  const { fmtMoney } = useCurrency();
  const [view, setView] = useState<View>("kanban");
  const [kanbanJobId, setKanbanJobId] = useState<string | null>(
    initialJobId ?? project.jobs[0]?.id ?? null,
  );
  const [dragBidId, setDragBidId] = useState<string | null>(null);
  const [dragJobId, setDragJobId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<BidderStatus | null>(null);

  const subById = (id: string | null) => subs.find((s) => s.id === id) ?? null;

  // --- Mutations (all route through the same autosaving setProject) ----------
  function mutateJob(jobId: string, updater: (j: Job) => Job) {
    setProject((p) => ({ ...p, jobs: p.jobs.map((j) => (j.id === jobId ? updater(j) : j)) }));
  }
  function editBidder(jobId: string, bidId: string, patch: Partial<Bidder>) {
    mutateJob(jobId, (j) =>
      syncJobFromBidders({
        ...j,
        bidders: j.bidders.map((b) => (b.id === bidId ? { ...b, ...patch } : b)),
      }),
    );
  }
  function addBidderTo(jobId: string) {
    mutateJob(jobId, (j) => ({ ...j, bidders: [...j.bidders, newBidder()] }));
  }
  function removeBidder(jobId: string, bidId: string) {
    mutateJob(jobId, (j) => syncJobFromBidders({ ...j, bidders: j.bidders.filter((b) => b.id !== bidId) }));
  }
  function addJob() {
    const category = categories[0] ?? "Designing";
    const job = newJob(category, project.startDate || today());
    setProject((p) => ({ ...p, jobs: [...p.jobs, job] }));
    setKanbanJobId(job.id);
  }
  function addBidRow() {
    const target = kanbanJobId && project.jobs.some((j) => j.id === kanbanJobId)
      ? kanbanJobId
      : project.jobs[0]?.id;
    if (target) {
      addBidderTo(target);
    } else {
      const category = categories[0] ?? "Designing";
      const job = newJob(category, project.startDate || today(), [newBidder()]);
      setProject((p) => ({ ...p, jobs: [...p.jobs, job] }));
      setKanbanJobId(job.id);
    }
  }

  // --- Drag & drop (native) --------------------------------------------------
  function onDragStart(e: DragEvent, jobId: string, bidId: string) {
    setDragBidId(bidId);
    setDragJobId(jobId);
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = "move";
      // Carry the payload on the canonical DnD channel so the drop works even
      // if React state hasn't flushed across the drag boundary.
      e.dataTransfer.setData("text/plain", `${jobId}::${bidId}`);
    }
  }
  function onDropTo(e: DragEvent, status: BidderStatus) {
    let jobId = dragJobId;
    let bidId = dragBidId;
    const raw = e.dataTransfer?.getData("text/plain");
    if (raw && raw.includes("::")) [jobId, bidId] = raw.split("::");
    if (jobId && bidId) editBidder(jobId, bidId, { status });
    setDragBidId(null);
    setDragJobId(null);
    setOverCol(null);
  }

  const selectedJob = project.jobs.find((j) => j.id === kanbanJobId) ?? null;
  const allRows = project.jobs.flatMap((j) => j.bidders.map((b) => ({ job: j, bidder: b })));

  return (
    <div>
      {/* View toggle */}
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="inline-flex gap-1 p-1 rounded-[13px]" style={{ background: "var(--glass-2)", border: "1px solid var(--border)" }}>
          {(
            [
              { key: "kanban", label: "Kanban", Icon: LayoutGrid },
              { key: "spreadsheet", label: "Spreadsheet", Icon: Table2 },
            ] as const
          ).map((t) => (
            <button
              key={t.key}
              onClick={() => setView(t.key)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] text-[12.5px] font-bold transition-colors"
              style={view === t.key
                ? { background: "var(--seg-active)", color: "var(--text)", boxShadow: "var(--shadow)" }
                : { color: "var(--muted)" }}
            >
              <t.Icon size={16} /> {t.label}
            </button>
          ))}
        </div>
        <div className="text-xs text-ink-muted">
          {view === "kanban"
            ? "Pick a job, then drag bids between status columns."
            : "Every bid across all jobs — edit any cell."}
        </div>
      </div>

      {view === "kanban" ? (
        <KanbanView
          project={project}
          selectedJob={selectedJob}
          kanbanJobId={kanbanJobId}
          setKanbanJobId={setKanbanJobId}
          subById={subById}
          fmtMoney={fmtMoney}
          onDragStart={onDragStart}
          onDropTo={onDropTo}
          overCol={overCol}
          setOverCol={setOverCol}
          dragBidId={dragBidId}
          addJob={addJob}
          addBidderTo={addBidderTo}
        />
      ) : (
        <SpreadsheetView
          rows={allRows}
          subs={subs}
          categories={categories}
          subById={subById}
          editBidder={editBidder}
          mutateJob={mutateJob}
          removeBidder={removeBidder}
          addBidRow={addBidRow}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Kanban
// ---------------------------------------------------------------------------
function KanbanView({
  project,
  selectedJob,
  kanbanJobId,
  setKanbanJobId,
  subById,
  fmtMoney,
  onDragStart,
  onDropTo,
  overCol,
  setOverCol,
  dragBidId,
  addJob,
  addBidderTo,
}: {
  project: Project;
  selectedJob: Job | null;
  kanbanJobId: string | null;
  setKanbanJobId: (id: string) => void;
  subById: (id: string | null) => SubcontractorWithJobs | null;
  fmtMoney: (n: number) => string;
  onDragStart: (e: DragEvent, jobId: string, bidId: string) => void;
  onDropTo: (e: DragEvent, status: BidderStatus) => void;
  overCol: BidderStatus | null;
  setOverCol: (s: BidderStatus | null) => void;
  dragBidId: string | null;
  addJob: () => void;
  addBidderTo: (jobId: string) => void;
}) {
  return (
    <>
      {/* Job picker chips */}
      <div className="flex items-center gap-2.5 overflow-x-auto pb-3.5">
        {project.jobs.map((j) => {
          const active = j.id === kanbanJobId;
          return (
            <button
              key={j.id}
              onClick={() => setKanbanJobId(j.id)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-[12.5px] font-bold whitespace-nowrap transition-colors shrink-0"
              style={active
                ? { background: "linear-gradient(150deg,var(--accent),var(--accent-2))", color: "#fff", boxShadow: "0 6px 16px var(--accent-soft)" }
                : { background: "var(--glass-2)", color: "var(--muted)", border: "1px solid var(--border)" }}
            >
              {j.category}
              <span
                className="text-[11px] font-bold px-1.5 rounded-full"
                style={active ? { background: "rgba(255,255,255,0.25)" } : { background: "var(--glass)", color: "var(--faint)" }}
              >
                {j.bidders.length}
              </span>
            </button>
          );
        })}
        <button
          onClick={addJob}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-[12.5px] font-semibold text-ink-muted shrink-0"
          style={{ border: "1px dashed var(--border)" }}
        >
          <Plus size={16} /> Add job
        </button>
      </div>

      {!selectedJob ? (
        <div className="panel-2 p-10 text-center text-ink-muted text-sm">
          No jobs yet. Add a job to start collecting bids.
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 mb-3 text-xs text-ink-muted">
            <GripVertical size={15} /> Drag a bid card across columns to update its status.
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2.5">
            {BIDDER_STATUSES.map((status) => {
              const bids = selectedJob.bidders.filter((b) => b.status === status);
              const color = bidStatusColor(status);
              const isOver = overCol === status;
              return (
                <div
                  key={status}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (overCol !== status) setOverCol(status);
                  }}
                  onDragLeave={() => isOver && setOverCol(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    onDropTo(e, status);
                  }}
                  className="shrink-0 w-[214px] rounded-[16px] p-2.5"
                  style={{
                    background: isOver ? hexAlpha(color, 0.1) : "var(--glass-2)",
                    border: `1px solid ${isOver ? color : "var(--border)"}`,
                    transition: "background .2s, border-color .2s",
                  }}
                >
                  <div className="flex items-center gap-2 px-1 pb-3">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                    <span className="text-[12.5px] font-bold flex-1">{BID_STATUS_SHORT[status]}</span>
                    <span className="text-[11px] font-bold text-ink-muted px-2 py-0.5 rounded-full" style={{ background: "var(--glass)" }}>
                      {bids.length}
                    </span>
                  </div>
                  <div className="flex flex-col gap-2.5 min-h-[60px]">
                    {bids.map((b) => {
                      const sub = subById(b.subcontractorId);
                      const comp = subCompliance(sub);
                      return (
                        <div
                          key={b.id}
                          draggable
                          onDragStart={(e) => onDragStart(e, selectedJob.id, b.id)}
                          className="rounded-[13px] p-3 cursor-grab active:cursor-grabbing"
                          style={{
                            background: "var(--surface-solid)",
                            border: "1px solid var(--border)",
                            borderTopColor: "var(--border-top)",
                            boxShadow: "var(--shadow)",
                            opacity: dragBidId === b.id ? 0.4 : 1,
                          }}
                        >
                          <div className="flex items-start justify-between gap-2 mb-2.5">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div
                                className="w-[30px] h-[30px] rounded-[9px] flex items-center justify-center text-[11px] font-extrabold text-accent shrink-0"
                                style={{ background: "var(--accent-soft)" }}
                              >
                                {initialsOf(sub?.companyName ?? "—")}
                              </div>
                              <div className="min-w-0">
                                <div className="text-[12.5px] font-bold truncate max-w-[110px]">
                                  {sub?.companyName ?? "Unassigned"}
                                </div>
                                <div className="text-[10.5px] text-ink-muted truncate max-w-[110px]">
                                  {sub?.representativeName || "—"}
                                </div>
                              </div>
                            </div>
                            <GripVertical size={15} className="text-faint shrink-0" />
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="font-mono font-semibold text-[14px]">{fmtMoney(b.bidPrice)}</div>
                            <div className="flex items-center gap-1.5">
                              {b.bidLink && (
                                <a
                                  href={b.bidLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[10px] text-ink-muted px-1.5 py-1 rounded-md"
                                  style={{ background: "var(--glass)" }}
                                  title="Open bid document"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <FileText size={12} /> PDF
                                </a>
                              )}
                              {comp.ok ? (
                                <CheckCircle2 size={16} className="text-green" />
                              ) : (
                                <AlertCircle size={16} style={{ color: "var(--warn)" }} />
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {bids.length === 0 && (
                      <div
                        className="text-[11px] text-faint text-center py-3.5 rounded-[12px]"
                        style={{ border: "1px dashed var(--border)" }}
                      >
                        Drop here
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <button onClick={() => addBidderTo(selectedJob.id)} className="btn mt-4 gap-1.5">
            <Plus size={15} /> Add bid to {selectedJob.category}
          </button>
        </>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Spreadsheet
// ---------------------------------------------------------------------------
function SpreadsheetView({
  rows,
  subs,
  categories,
  subById,
  editBidder,
  mutateJob,
  removeBidder,
  addBidRow,
}: {
  rows: { job: Job; bidder: Bidder }[];
  subs: SubcontractorWithJobs[];
  categories: string[];
  subById: (id: string | null) => SubcontractorWithJobs | null;
  editBidder: (jobId: string, bidId: string, patch: Partial<Bidder>) => void;
  mutateJob: (jobId: string, updater: (j: Job) => Job) => void;
  removeBidder: (jobId: string, bidId: string) => void;
  addBidRow: () => void;
}) {
  const th = "p-2.5 text-[10.5px] font-bold uppercase tracking-[0.04em] text-ink-muted";
  const cellSelect = "w-full bg-transparent text-[13px] text-ink outline-none px-2.5 py-2.5 cursor-pointer";
  const td: React.CSSProperties = { border: "1px solid var(--border)", padding: 0 };

  return (
    <div className="rounded-[18px] overflow-hidden panel">
      <div className="overflow-x-auto">
        <table className="border-collapse w-full" style={{ minWidth: 860 }}>
          <thead>
            <tr>
              {["#", "Job / Category", "Subcontractor", "Bid price", "Status", "Doc", "Compliance"].map((h, i) => (
                <th
                  key={h}
                  className={th}
                  style={{
                    textAlign: i === 0 ? "center" : i === 3 ? "right" : i >= 5 ? "center" : "left",
                    width: i === 0 ? 40 : i === 5 ? 96 : i === 6 ? 116 : undefined,
                    border: "1px solid var(--border)",
                    background: "var(--glass-strong)",
                    position: "sticky",
                    top: 0,
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center text-ink-muted text-sm p-8" style={{ border: "1px solid var(--border)" }}>
                  No bids yet. Add your first bid row below.
                </td>
              </tr>
            ) : (
              rows.map(({ job, bidder }, idx) => {
                const sub = subById(bidder.subcontractorId);
                const comp = subCompliance(sub);
                const color = bidStatusColor(bidder.status);
                return (
                  <tr key={bidder.id} style={{ background: idx % 2 ? "var(--glass-2)" : "transparent" }}>
                    <td style={{ ...td, textAlign: "center", background: "var(--glass-2)" }}>
                      <span className="font-mono text-[11px] text-faint">{idx + 1}</span>
                    </td>
                    <td style={td}>
                      <select
                        value={job.category}
                        onChange={(e) => mutateJob(job.id, (j) => ({ ...j, category: e.target.value }))}
                        className={cellSelect + " font-semibold"}
                      >
                        {[...new Set([job.category, ...categories])].map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </td>
                    <td style={td}>
                      <select
                        value={bidder.subcontractorId ?? ""}
                        onChange={(e) => editBidder(job.id, bidder.id, { subcontractorId: e.target.value || null })}
                        className={cellSelect}
                      >
                        <option value="">— Select —</option>
                        {subs.map((s) => (
                          <option key={s.id} value={s.id}>{s.companyName}</option>
                        ))}
                      </select>
                    </td>
                    <td style={td}>
                      <div className="flex items-center px-2.5">
                        <MoneyInput
                          value={bidder.bidPrice}
                          min={0}
                          onChange={(v) => editBidder(job.id, bidder.id, { bidPrice: v })}
                          className="w-full bg-transparent font-mono text-[13px] text-right text-ink outline-none py-2.5"
                          ariaLabel="Bid price"
                        />
                      </div>
                    </td>
                    <td style={td}>
                      <select
                        value={bidder.status}
                        onChange={(e) => editBidder(job.id, bidder.id, { status: e.target.value as BidderStatus })}
                        className="w-full text-[12.5px] font-bold outline-none px-2.5 py-2.5 cursor-pointer"
                        style={{ color, background: hexAlpha(color, 0.14) }}
                      >
                        {BIDDER_STATUSES.map((s) => (
                          <option key={s} value={s} style={{ color: "var(--text)", background: "var(--surface-solid)" }}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td style={{ ...td, textAlign: "center" }}>
                      {bidder.bidLink ? (
                        <a
                          href={bidder.bidLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[10.5px] text-ink-muted px-2 py-1 rounded-md"
                          style={{ background: "var(--glass)" }}
                        >
                          <FileText size={13} /> PDF
                        </a>
                      ) : (
                        <button
                          onClick={() => {
                            const link = window.prompt("Paste a link to the bid document (Drive, etc.)");
                            if (link) editBidder(job.id, bidder.id, { bidLink: link.trim() });
                          }}
                          className="inline-flex items-center justify-center text-faint hover:text-accent"
                          title="Attach bid document link"
                        >
                          <Upload size={17} />
                        </button>
                      )}
                    </td>
                    <td style={{ ...td }}>
                      <div className="flex items-center justify-center gap-2">
                        {comp.ok ? (
                          <CheckCircle2 size={17} className="text-green" />
                        ) : (
                          <span title={`Missing ${comp.missing.join(", ")}`} className="inline-flex">
                            <AlertCircle size={17} style={{ color: "var(--warn)" }} />
                          </span>
                        )}
                        <button
                          onClick={() => removeBidder(job.id, bidder.id)}
                          className="text-faint hover:text-red"
                          title="Remove bid"
                        >
                          <Trash2 size={14} />
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
      <button
        onClick={addBidRow}
        className="w-full flex items-center justify-center gap-1.5 py-3 text-[12.5px] font-bold text-accent"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        <Plus size={16} /> Add bid row
      </button>
    </div>
  );
}
