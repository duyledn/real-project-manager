"use client";

import { useState } from "react";
import {
  Archive,
  Hammer,
  Home,
  Layers,
  LayoutGrid,
  Plus,
  Search,
  Wrench,
  Zap,
} from "lucide-react";
import { JOB_COLOR_PALETTE, contrastText } from "@/lib/jobs";
import type { Job, JobStatus } from "@/lib/types";

/** Status -> bar fill in the warm "estate" palette, progressing as a job
 *  advances. Vivid enough to read on both light and dark surfaces. */
function statusFill(status: JobStatus): { bar: string; text: string } {
  const map: Record<JobStatus, string> = {
    "Bid Requested": "#DFA258", // amber
    "Bid Approved": "#C65D3B", // terracotta
    "Work-in-progress": "#5E8C9E", // teal
    Finished: "#5AA15E", // green
    Paid: "#3F7E54", // deep green
    "N/A": "#B4A89E", // faint clay
  };
  const bar = map[status] ?? "#B4A89E";
  return { bar, text: contrastText(bar) };
}

const DAY = 86_400_000;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const LABEL_COL_W = 190;
const ROW_H = 56;

const PHASE_ICON_RULES = [
  { terms: ["framing", "drywall", "labor", "demo", "construction"], Icon: Hammer },
  { terms: ["electric", "electrical"], Icon: Zap },
  { terms: ["plumb", "hvac", "mechanic"], Icon: Wrench },
  { terms: ["roof", "exterior", "siding"], Icon: Home },
  { terms: ["cabinet", "countertop"], Icon: Archive },
  { terms: ["floor", "tile"], Icon: LayoutGrid },
];

/** The bar color for a job: its custom color, or the status color as fallback. */
function barColorOf(j: Job): string {
  return j.color || statusFill(j.status).bar;
}

function barTextOf(j: Job): string {
  return j.color ? contrastText(j.color) : statusFill(j.status).text;
}

function phaseIconOf(category: string) {
  const lower = category.toLowerCase();
  return PHASE_ICON_RULES.find((rule) => rule.terms.some((term) => lower.includes(term)))?.Icon ?? Layers;
}

function parseDate(value: string): number | null {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  const time = Date.UTC(year, month - 1, day);
  return Number.isFinite(time) ? time : null;
}

function startOfMonth(time: number): number {
  const d = new Date(time);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
}

function addMonth(time: number): number {
  const d = new Date(time);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1);
}

function monthName(time: number): string {
  return MONTHS[new Date(time).getUTCMonth()];
}

function monthRangeLabel(start: number, end: number): string {
  const s = monthName(start);
  const e = monthName(end);
  return s === e ? s : `${s} \u2013 ${e}`;
}

function pointPct(time: number, domain: { min: number; max: number }): number {
  return ((time - domain.min) / (domain.max - domain.min)) * 100;
}

function clampPct(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function buildDomain(jobs: Job[]): { min: number; max: number } | null {
  const times: number[] = [];
  for (const job of jobs) {
    const start = parseDate(job.startDate);
    const end = parseDate(job.endDate);
    if (start != null) times.push(start);
    if (end != null) times.push(end);
  }
  if (times.length === 0) return null;

  const min = startOfMonth(Math.min(...times));
  let max = addMonth(Math.max(...times));
  if (max - min < 45 * DAY) max = addMonth(max);
  return { min, max };
}

function monthsInDomain(domain: { min: number; max: number }): number[] {
  const months: number[] = [];
  for (let time = domain.min; time < domain.max; time = addMonth(time)) months.push(time);
  return months;
}

type JobTimelineProps = {
  jobs: Job[];
  selectedJobId: string | null;
  onSelect: (id: string) => void;
  onAddJob?: () => void;
  onColorChange?: (jobId: string, color: string) => void;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
};

export function JobTimeline({
  jobs,
  selectedJobId,
  onSelect,
  onAddJob,
  onColorChange,
  searchValue = "",
  onSearchChange,
}: JobTimelineProps) {
  const [pickerJobId, setPickerJobId] = useState<string | null>(null);
  const domain = buildDomain(jobs);
  const months = domain ? monthsInDomain(domain) : [];
  const today = Date.now();
  const todayPct = domain && today >= domain.min && today <= domain.max ? clampPct(pointPct(today, domain)) : null;
  const pickerIndex = pickerJobId ? jobs.findIndex((job) => job.id === pickerJobId) : -1;
  const pickerJob = pickerIndex >= 0 ? jobs[pickerIndex] : null;

  function rowKeyDown(e: React.KeyboardEvent<HTMLDivElement>, jobId: string) {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    onSelect(jobId);
  }

  const toolbar = (
    <div className="flex items-center gap-3 mb-5">
      <div
        className="flex-1 min-w-[180px] flex items-center gap-2 px-3.5"
        style={{
          height: 42,
          borderRadius: 999,
          background: "var(--glass-2)",
          border: "1px solid var(--border)",
        }}
      >
        <Search size={16} className="text-ink-muted shrink-0" />
        <input
          value={searchValue}
          onChange={(e) => onSearchChange?.(e.target.value)}
          placeholder="Search..."
          aria-label="Search phases"
          className="w-full bg-transparent outline-none text-[13px] font-semibold text-ink placeholder:text-ink-muted"
        />
      </div>
      {onAddJob && (
        <button type="button" onClick={onAddJob} className="btn btn-blue inline-flex items-center gap-1.5 shrink-0 !py-2.5">
          <Plus size={15} /> Add phase
        </button>
      )}
    </div>
  );

  if (!domain) {
    return (
      <div className="panel p-5 sm:p-6">
        {toolbar}
        <div className="text-sm text-ink-muted">
          {jobs.length === 0
            ? searchValue.trim()
              ? "No phases match your search."
              : "Add a phase or add start dates to your jobs to see them on the timeline."
            : "Add start dates to your jobs to see them on the timeline."}
        </div>
      </div>
    );
  }

  return (
    <div className="panel p-5 sm:p-6">
      {toolbar}
      <div className="overflow-x-auto">
        <div className="min-w-[760px]">
          <div className="grid items-end" style={{ gridTemplateColumns: `${LABEL_COL_W}px minmax(0,1fr)` }}>
            <div />
            <div className="flex h-9 text-[12px] font-bold text-ink-muted">
              {months.map((month) => (
                <div key={month} className="relative flex-1 pl-3 border-l" style={{ borderColor: "var(--border)" }}>
                  {monthName(month)}
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            {todayPct != null && (
              <div className="absolute inset-y-0 z-20 pointer-events-none" style={{ left: LABEL_COL_W, right: 0 }}>
                <div
                  className="absolute top-0 bottom-0"
                  style={{ left: `${todayPct}%`, borderLeft: "2px solid var(--accent)" }}
                >
                  <span
                    className="absolute -top-5 -translate-x-1/2 text-[10px] font-extrabold uppercase"
                    style={{ color: "var(--accent)" }}
                  >
                    Today
                  </span>
                </div>
              </div>
            )}

            {jobs.map((job, index) => {
              const Icon = phaseIconOf(job.category);
              const start = parseDate(job.startDate);
              const end = parseDate(job.endDate);
              const isSelected = job.id === selectedJobId;
              const barColor = barColorOf(job);
              const textColor = barTextOf(job);
              const startPct = start == null ? 0 : clampPct(pointPct(start, domain));
              const safeEnd = end != null && start != null ? Math.max(end, start + DAY) : null;
              const endPct = safeEnd == null ? startPct : clampPct(pointPct(safeEnd, domain));
              const widthPct = Math.max(1, endPct - startPct);

              return (
                <div
                  key={job.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelect(job.id)}
                  onKeyDown={(e) => rowKeyDown(e, job.id)}
                  className="group grid items-center rounded-[18px] transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] hover:bg-[var(--glass-2)]"
                  style={{
                    gridTemplateColumns: `${LABEL_COL_W}px minmax(0,1fr)`,
                    minHeight: ROW_H,
                    background: isSelected ? "var(--accent-soft)" : index % 2 ? "rgba(255,255,255,0.13)" : "transparent",
                  }}
                >
                  <div className="flex items-center gap-3 min-w-0 pr-4">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onColorChange) setPickerJobId((current) => (current === job.id ? null : job.id));
                      }}
                      className="w-9 h-9 rounded-full shrink-0 inline-flex items-center justify-center transition-transform hover:scale-105"
                      style={{
                        background: barColor,
                        color: textColor,
                        border: pickerJobId === job.id ? "2px solid var(--accent)" : "1px solid var(--border)",
                      }}
                      aria-label={`Change color for ${job.category}`}
                    >
                      <Icon size={16} />
                    </button>
                    <span className="text-[13px] font-extrabold truncate">{job.category}</span>
                  </div>

                  <div className="relative h-11">
                    <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[2px]" style={{ background: "var(--border)" }} />
                    {start == null ? (
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[12px] font-semibold text-ink-muted">
                        No date
                      </span>
                    ) : safeEnd == null ? (
                      <>
                        <span
                          className="absolute top-1/2 w-5 h-5 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-[6px]"
                          style={{ left: `${startPct}%`, background: barColor, border: "1px solid var(--border)" }}
                        />
                        <span
                          className="absolute top-1/2 translate-x-4 -translate-y-1/2 text-[12px] font-bold text-ink-muted"
                          style={{ left: `${startPct}%` }}
                        >
                          {monthName(start)}
                        </span>
                      </>
                    ) : (
                      <div
                        className="absolute top-1/2 -translate-y-1/2 h-10 rounded-full flex items-center justify-center px-4 text-[12.5px] font-extrabold shadow-sm"
                        style={{
                          left: `${startPct}%`,
                          width: `max(${widthPct}%, 48px)`,
                          maxWidth: `${Math.max(0, 100 - startPct)}%`,
                          background: barColor,
                          color: textColor,
                        }}
                      >
                        <span className="truncate">{monthRangeLabel(start, safeEnd)}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {pickerJob && onColorChange && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setPickerJobId(null)} aria-hidden />
                <div
                  className="absolute z-50 p-2.5"
                  style={{
                    left: 44,
                    top: pickerIndex * ROW_H + 42,
                    width: 184,
                    borderRadius: 16,
                    background: "var(--glass-strong)",
                    backdropFilter: "var(--blur)",
                    WebkitBackdropFilter: "var(--blur)",
                    border: "1px solid var(--border)",
                    borderTopColor: "var(--border-top)",
                    boxShadow: "var(--shadow-lg)",
                  }}
                >
                  <div className="label-mono mb-2">Bar Color</div>
                  <div className="space-y-1">
                    {JOB_COLOR_PALETTE.map((row) => (
                      <div key={row.name} className="flex gap-1" title={row.name}>
                        {row.shades.map((hex) => {
                          const selected = pickerJob.color === hex;
                          return (
                            <button
                              key={hex}
                              type="button"
                              onClick={() => {
                                onColorChange(pickerJob.id, hex);
                                setPickerJobId(null);
                              }}
                              className="w-6 h-6 rounded-md hover:scale-110 transition-transform"
                              style={{
                                background: hex,
                                outline: selected ? "2px solid var(--accent)" : "1px solid var(--border)",
                                outlineOffset: selected ? "1px" : "0",
                              }}
                              aria-label={`${row.name} ${hex}`}
                            />
                          );
                        })}
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onColorChange(pickerJob.id, "");
                      setPickerJobId(null);
                    }}
                    className="mt-2 w-full text-[11px] font-bold rounded-[10px] py-1.5 transition-colors text-ink-muted hover:text-accent"
                    style={{ border: "1px solid var(--border)", background: "var(--glass-2)" }}
                  >
                    Reset to status color
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default JobTimeline;
