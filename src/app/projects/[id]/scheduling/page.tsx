"use client";

import { useState } from "react";
import { Minimize2 } from "lucide-react";

import JobTimeline from "@/components/JobTimeline";
import { ScheduleJobPanel } from "@/components/ScheduleJobPanel";
import { makeId } from "@/lib/defaults";
import { useJobCategories } from "@/lib/useJobCategories";
import { useProjectContext } from "@/lib/projectContext";
import { useSubcontractors } from "@/lib/useSubcontractors";
import type { Project } from "@/lib/types";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

type QuickAddPopoverProps = {
  categories: string[];
  category: string;
  startDate: string;
  endDate: string;
  onCategoryChange: (value: string) => void;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
};

function QuickAddPopover({
  categories,
  category,
  startDate,
  endDate,
  onCategoryChange,
  onStartDateChange,
  onEndDateChange,
  onClose,
  onSave,
}: QuickAddPopoverProps) {
  const options = Array.from(new Set([category, ...categories].filter(Boolean)));

  return (
    <>
      <button
        type="button"
        aria-label="Close add phase"
        className="fixed inset-0 z-40 cursor-default bg-transparent"
        onClick={onClose}
      />
      <div
        className="absolute right-5 top-[78px] z-50 w-[min(340px,calc(100vw-40px))] rounded-[22px] border p-4 shadow-[0_28px_80px_rgba(0,0,0,0.34)]"
        style={{
          background: "var(--glass-strong)",
          backdropFilter: "var(--blur)",
          borderColor: "var(--line)",
          borderTopColor: "var(--line-strong)",
        }}
      >
        <div className="space-y-3">
          <label className="block">
            <span className="label-mono mb-1 block text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
              Phase
            </span>
            <select className="field-input h-11 w-full" value={category} onChange={(event) => onCategoryChange(event.target.value)}>
              {options.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="label-mono mb-1 block text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
                Start
              </span>
              <input
                className="field-input h-11 w-full"
                type="date"
                value={startDate}
                onChange={(event) => onStartDateChange(event.target.value)}
              />
            </label>
            <label className="block">
              <span className="label-mono mb-1 block text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
                End
              </span>
              <input
                className="field-input h-11 w-full"
                type="date"
                min={startDate || undefined}
                value={endDate}
                onChange={(event) => onEndDateChange(event.target.value)}
              />
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button type="button" className="btn h-10 px-4" onClick={onClose}>
              Cancel
            </button>
            <button type="button" className="btn btn-blue h-10 px-4" onClick={onSave}>
              Add phase
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default function SchedulingPage() {
  const { project, setProject, loading, error, saveState } = useProjectContext();
  const { categories } = useJobCategories();
  const { subs } = useSubcontractors();
  const [expanded, setExpanded] = useState(false);
  const [search, setSearch] = useState("");
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickCategory, setQuickCategory] = useState("");
  const [quickStartDate, setQuickStartDate] = useState("");
  const [quickEndDate, setQuickEndDate] = useState("");
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  if (loading) return <div className="font-mono text-ink-muted text-sm uppercase">Loading...</div>;
  if (error) return <div className="panel border-red text-red p-4 font-mono text-sm">{error}</div>;
  if (!project) return null;

  const defaultStartDate = project.startDate || todayIso();
  const searchTerm = search.trim().toLowerCase();
  const filteredJobs = searchTerm
    ? project.jobs.filter((job) => job.category.toLowerCase().includes(searchTerm))
    : project.jobs;

  function handleHoverAdd(prefillCategory: string) {
    setQuickCategory(prefillCategory || categories[0] || "Designing");
    setQuickStartDate(defaultStartDate);
    setQuickEndDate("");
    setQuickAddOpen(true);
  }

  function saveQuickAdd() {
    setProject((p: Project) => ({
      ...p,
      jobs: [
        ...p.jobs,
        {
          id: makeId(),
          category: quickCategory || categories[0] || "Designing",
          startDate: quickStartDate || p.startDate || todayIso(),
          endDate: quickEndDate,
          status: "N/A",
          approvedBidderId: null,
          color: "",
          estimatedCost: 0,
          sourceItemId: "",
          bidders: [],
        },
      ],
    }));
    setQuickAddOpen(false);
  }

  return (
    <>
      <main className="space-y-5">
        <div className="flex gap-4 items-start">
          <div className="flex-1 min-w-0 relative">
            <JobTimeline
              jobs={filteredJobs}
              selectedJobId={selectedJobId}
              onSelect={(id) => setSelectedJobId((current) => (current === id ? null : id))}
              onColorChange={(jobId, color) =>
                setProject((p: Project) => ({
                  ...p,
                  jobs: p.jobs.map((job) => (job.id === jobId ? { ...job, color } : job)),
                }))
              }
              onHoverAdd={handleHoverAdd}
              saveState={saveState}
              onExpand={project.jobs.length > 0 ? () => setExpanded(true) : undefined}
              searchValue={search}
              onSearchChange={setSearch}
            />

            {quickAddOpen && (
              <QuickAddPopover
                categories={categories}
                category={quickCategory}
                startDate={quickStartDate}
                endDate={quickEndDate}
                onCategoryChange={setQuickCategory}
                onStartDateChange={setQuickStartDate}
                onEndDateChange={setQuickEndDate}
                onClose={() => setQuickAddOpen(false)}
                onSave={saveQuickAdd}
              />
            )}
          </div>

          {selectedJobId && (() => {
            const selectedJob = project.jobs.find((job) => job.id === selectedJobId);
            if (!selectedJob) return null;
            return (
              <ScheduleJobPanel
                project={project}
                job={selectedJob}
                categories={categories}
                subcontractors={subs}
                onChange={(updater) =>
                  setProject((p: Project) => ({
                    ...p,
                    jobs: p.jobs.map((job) => (job.id === selectedJobId ? updater(job) : job)),
                  }))
                }
                onClose={() => setSelectedJobId(null)}
              />
            );
          })()}
        </div>
      </main>

      {expanded && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(20,12,8,0.5)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }}
          onClick={() => setExpanded(false)}
        >
          <div
            className="flex flex-col overflow-hidden"
            style={{
              width: "85vw",
              height: "80vh",
              borderRadius: 24,
              background: "var(--glass-strong)",
              backdropFilter: "var(--blur)",
              WebkitBackdropFilter: "var(--blur)",
              border: "1px solid var(--border)",
              borderTopColor: "var(--border-top)",
              boxShadow: "var(--shadow-lg)",
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b shrink-0" style={{ borderColor: "var(--border)" }}>
              <div>
                <div className="label-mono">Schedule / Timeline</div>
                <h2 className="font-display font-extrabold text-xl leading-none mt-0.5">{project.name}</h2>
              </div>
              <button type="button" className="btn inline-flex items-center gap-1.5" onClick={() => setExpanded(false)}>
                <Minimize2 size={14} />
                Close
              </button>
            </div>
            <div className="flex-1 overflow-auto p-5">
              <JobTimeline
                jobs={filteredJobs}
                selectedJobId={selectedJobId}
                onSelect={(id) => setSelectedJobId((current) => (current === id ? null : id))}
                onColorChange={(jobId, color) =>
                  setProject((p: Project) => ({
                    ...p,
                    jobs: p.jobs.map((job) => (job.id === jobId ? { ...job, color } : job)),
                  }))
                }
                saveState={saveState}
                searchValue={search}
                onSearchChange={setSearch}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
