"use client";

import { useState } from "react";
import { createPortal } from "react-dom";

import JobTimeline from "@/components/JobTimeline";
import { ExpandableTable } from "@/components/ExpandableTable";
import { ScheduleJobPanel } from "@/components/ScheduleJobPanel";
import { makeId } from "@/lib/defaults";
import { useJobCategories } from "@/lib/useJobCategories";
import { useProjectContext } from "@/lib/projectContext";
import { useSubcontractors } from "@/lib/useSubcontractors";
import { useI18n } from "@/lib/i18n";
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
  const { t } = useI18n();
  const options = Array.from(new Set([category, ...categories].filter(Boolean)));
  if (typeof document === "undefined") return null;

  return createPortal(
    <>
      <button
        type="button"
        aria-label={t("Close add phase")}
        className="glass-backdrop fixed inset-0 z-[270] cursor-default"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("Add phase")}
        className="glass-dialog fixed left-1/2 top-1/2 z-[280] max-h-[calc(100vh-40px)] w-[min(400px,calc(100vw-40px))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[22px] p-4"
      >
        <div className="space-y-3">
          <label className="block">
            <span className="label-mono mb-1 block text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
              {t("Phase")}
            </span>
            <select className="field-input h-11 w-full" value={category} onChange={(event) => onCategoryChange(event.target.value)}>
              {options.map((option) => (
                <option key={option} value={option}>
                  {t(option)}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="label-mono mb-1 block text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
                {t("Start")}
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
                {t("End")}
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
              {t("Cancel")}
            </button>
            <button type="button" className="btn btn-blue h-10 px-4" onClick={onSave}>
              {t("Add phase")}
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}

export default function SchedulingPage() {
  const { t } = useI18n();
  const { project, setProject, loading, error } = useProjectContext();
  const { categories } = useJobCategories();
  const { subs } = useSubcontractors();
  const [search, setSearch] = useState("");
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickCategory, setQuickCategory] = useState("");
  const [quickStartDate, setQuickStartDate] = useState("");
  const [quickEndDate, setQuickEndDate] = useState("");
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  if (loading) return <div className="font-mono text-ink-muted text-sm uppercase">{t("Loading...")}</div>;
  if (error) return <div className="panel border-red text-red p-4 font-mono text-sm">{t(error)}</div>;
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
    <main className="space-y-5">
      <ExpandableTable label={t("Schedule / Timeline")}>
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
      </ExpandableTable>
    </main>
  );
}
