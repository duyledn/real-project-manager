"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { JOB_COLOR_PALETTE, contrastText } from "@/lib/jobs";
import type { Job, JobStatus } from "@/lib/types";

// Theme hexes (mirror tailwind.config.ts) — canvas needs concrete colors.
const C = {
  panel: "#FFFFFF",
  paper: "#F1F3F5",
  ink: "#1A2332",
  inkMuted: "#64748B",
  hair: "rgba(26,35,50,0.14)",
  hairStrong: "rgba(26,35,50,0.28)",
  red: "#DC2626",
  rowAlt: "#F8FAFC",
  selected: "rgba(29,78,216,0.10)",
};

/** Status → bar fill, progressing light→dark as the job advances. */
function statusFill(status: JobStatus): { bar: string; text: string } {
  switch (status) {
    case "Bid Requested":
      return { bar: "#F59E0B", text: "#FFFFFF" };
    case "Bid Approved":
      return { bar: "#3B82F6", text: "#FFFFFF" };
    case "Work-in-progress":
      return { bar: "#1D4ED8", text: "#FFFFFF" };
    case "Finished":
      return { bar: "#16A34A", text: "#FFFFFF" };
    case "Paid":
      return { bar: "#166534", text: "#FFFFFF" };
    default: // N/A
      return { bar: "#CBD5E1", text: "#1A2332" };
  }
}

const DAY = 86_400_000;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const LABEL_W = 150;
const HEADER_H = 44;
const ROW_H = 36;
const PAD_BOTTOM = 12;
const SWATCH_X = 12;
const SWATCH_SIZE = 14;
const LABEL_TEXT_X = SWATCH_X + SWATCH_SIZE + 8;

/** The bar color for a job: its custom color, or the status color as fallback. */
function barColorOf(j: Job): string {
  return j.color || statusFill(j.status).bar;
}
function barTextOf(j: Job): string {
  return j.color ? contrastText(j.color) : statusFill(j.status).text;
}

function startOfMonth(t: number): number {
  const d = new Date(t);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
}
function addMonth(t: number): number {
  const d = new Date(t);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1);
}
function parse(d: string): number | null {
  if (!d) return null;
  const t = new Date(d).getTime();
  return Number.isFinite(t) ? t : null;
}

export function JobTimeline({
  jobs,
  selectedJobId,
  onSelect,
  onAddJob,
  onColorChange,
}: {
  jobs: Job[];
  selectedJobId: string | null;
  onSelect: (id: string) => void;
  onAddJob?: () => void;
  onColorChange?: (jobId: string, color: string) => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [width, setWidth] = useState(0);
  const [hoverRow, setHoverRow] = useState<number | null>(null);
  const [picker, setPicker] = useState<{ jobId: string; x: number; y: number } | null>(null);

  // Track container width for a responsive, crisp canvas.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setWidth(e.contentRect.width);
    });
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  // Compute the visible date domain (snapped to whole months). Memoized so the
  // reference is stable across unrelated re-renders — otherwise `draw` would be
  // recreated every render and the canvas would redraw on every keystroke.
  const domain = useMemo(() => {
    const times: number[] = [];
    for (const j of jobs) {
      const s = parse(j.startDate);
      const e = parse(j.endDate) ?? (s != null ? s + 14 * DAY : null);
      if (s != null) times.push(s);
      if (e != null) times.push(e);
    }
    if (times.length === 0) return null;
    const min = startOfMonth(Math.min(...times));
    let max = addMonth(Math.max(...times)); // end at start of the following month
    if (max - min < 28 * DAY) max = addMonth(max);
    return { min, max };
  }, [jobs]);

  const height = HEADER_H + jobs.length * ROW_H + PAD_BOTTOM;

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !domain || width === 0) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const plotX = LABEL_W;
    const plotW = width - LABEL_W;
    const span = domain.max - domain.min;
    const xOf = (t: number) => plotX + ((t - domain.min) / span) * plotW;

    // Background
    ctx.fillStyle = C.panel;
    ctx.fillRect(0, 0, width, height);

    // Row striping + selection/hover highlight
    jobs.forEach((j, i) => {
      const y = HEADER_H + i * ROW_H;
      if (j.id === selectedJobId) ctx.fillStyle = C.selected;
      else if (i === hoverRow) ctx.fillStyle = C.paper;
      else ctx.fillStyle = i % 2 === 0 ? C.panel : C.rowAlt;
      ctx.fillRect(0, y, width, ROW_H);
    });

    // Month gridlines + labels
    const months: number[] = [];
    for (let m = domain.min; m < domain.max; m = addMonth(m)) months.push(m);
    const monthW = plotW / months.length;
    const labelEvery = monthW < 42 ? Math.ceil(42 / monthW) : 1;

    ctx.textBaseline = "middle";
    months.forEach((m, idx) => {
      const x = xOf(m);
      ctx.strokeStyle = C.hair;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(Math.round(x) + 0.5, HEADER_H - 8);
      ctx.lineTo(Math.round(x) + 0.5, height);
      ctx.stroke();

      if (idx % labelEvery === 0) {
        const d = new Date(m);
        const showYear = d.getUTCMonth() === 0 || idx === 0;
        ctx.fillStyle = C.ink;
        ctx.font = "600 11px 'IBM Plex Mono', monospace";
        ctx.textAlign = "left";
        const label = showYear ? `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}` : MONTHS[d.getUTCMonth()];
        ctx.fillText(label, x + 5, HEADER_H / 2);
      }
    });

    // Header baseline + label-gutter divider
    ctx.strokeStyle = C.hairStrong;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, HEADER_H + 0.5);
    ctx.lineTo(width, HEADER_H + 0.5);
    ctx.moveTo(plotX + 0.5, 0);
    ctx.lineTo(plotX + 0.5, height);
    ctx.stroke();

    // "Today" marker
    const now = Date.now();
    if (now >= domain.min && now <= domain.max) {
      const x = xOf(now);
      ctx.strokeStyle = C.red;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(x, HEADER_H - 4);
      ctx.lineTo(x, height);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = C.red;
      ctx.font = "600 9px 'IBM Plex Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillText("TODAY", x, HEADER_H - 14);
    }

    // Job rows: labels + bars
    jobs.forEach((j, i) => {
      const y = HEADER_H + i * ROW_H;
      const cy = y + ROW_H / 2;

      // Color swatch (click to recolor) in the left gutter
      const sy = cy - SWATCH_SIZE / 2;
      ctx.fillStyle = barColorOf(j);
      roundRect(ctx, SWATCH_X, sy, SWATCH_SIZE, SWATCH_SIZE, 3);
      ctx.fill();
      ctx.strokeStyle = picker?.jobId === j.id ? "#1D4ED8" : C.hairStrong;
      ctx.lineWidth = picker?.jobId === j.id ? 2 : 1;
      roundRect(ctx, SWATCH_X, sy, SWATCH_SIZE, SWATCH_SIZE, 3);
      ctx.stroke();

      // Label
      ctx.fillStyle = j.id === selectedJobId ? "#1D4ED8" : C.ink;
      ctx.font = `${j.id === selectedJobId ? "700" : "500"} 12px 'IBM Plex Mono', monospace`;
      ctx.textAlign = "left";
      const label = j.category.length > 15 ? j.category.slice(0, 14) + "…" : j.category;
      ctx.fillText(label, LABEL_TEXT_X, cy);

      const s = parse(j.startDate);
      if (s == null) {
        ctx.fillStyle = C.inkMuted;
        ctx.font = "10px 'IBM Plex Mono', monospace";
        ctx.fillText("no date", plotX + 8, cy);
        return;
      }
      const e = parse(j.endDate);
      const bar = barColorOf(j);
      const text = barTextOf(j);
      const barH = 18;
      const by = cy - barH / 2;

      if (e == null) {
        // Milestone diamond at the start date
        const x = xOf(s);
        ctx.fillStyle = bar;
        ctx.strokeStyle = C.ink;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, cy - 8);
        ctx.lineTo(x + 8, cy);
        ctx.lineTo(x, cy + 8);
        ctx.lineTo(x - 8, cy);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = C.inkMuted;
        ctx.font = "10px 'IBM Plex Mono', monospace";
        ctx.textAlign = "left";
        ctx.fillText(j.startDate, x + 12, cy);
      } else {
        const x1 = xOf(s);
        const x2 = Math.max(xOf(e), x1 + 6);
        const w = x2 - x1;
        // Bar
        ctx.fillStyle = bar;
        const r = 4;
        roundRect(ctx, x1, by, w, barH, r);
        ctx.fill();
        // Duration label inside if it fits, else to the right
        const days = Math.max(1, Math.round((e - s) / DAY));
        const durText = `${days}d`;
        ctx.font = "600 10px 'IBM Plex Mono', monospace";
        const tw = ctx.measureText(durText).width;
        if (w > tw + 12) {
          ctx.fillStyle = text;
          ctx.textAlign = "center";
          ctx.fillText(durText, x1 + w / 2, cy);
        } else {
          ctx.fillStyle = C.inkMuted;
          ctx.textAlign = "left";
          ctx.fillText(durText, x2 + 5, cy);
        }
      }
    });
  }, [jobs, domain, width, height, hoverRow, selectedJobId, picker]);

  useEffect(() => {
    draw();
  }, [draw]);

  // Hit-test helpers shared by hover + click.
  function rowAt(clientY: number): number | null {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const y = clientY - rect.top;
    if (y < HEADER_H) return null;
    const idx = Math.floor((y - HEADER_H) / ROW_H);
    return idx >= 0 && idx < jobs.length ? idx : null;
  }

  /** Is this x (relative to the canvas) over the color swatch? */
  function overSwatch(clientX: number): boolean {
    const canvas = canvasRef.current;
    if (!canvas) return false;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    return x >= SWATCH_X - 4 && x <= SWATCH_X + SWATCH_SIZE + 4;
  }

  function handleCanvasClick(clientX: number, clientY: number) {
    const idx = rowAt(clientY);
    if (idx == null) return;
    const job = jobs[idx];
    // A click on the swatch opens the color picker; elsewhere opens the drawer.
    if (onColorChange && overSwatch(clientX)) {
      setPicker({ jobId: job.id, x: LABEL_TEXT_X, y: HEADER_H + idx * ROW_H + ROW_H - 2 });
    } else {
      onSelect(job.id);
    }
  }

  const toolbar = (
    <div className="flex items-center justify-between mb-3">
      <span className="label-mono">Schedule</span>
      {onAddJob && (
        <button onClick={onAddJob} className="btn btn-blue inline-flex items-center gap-1.5 !py-1.5">
          <Plus size={13} /> Add job
        </button>
      )}
    </div>
  );

  if (!domain) {
    return (
      <div className="panel p-4">
        {toolbar}
        <p className="text-sm text-ink-muted">Add start dates to your jobs to see them on the timeline.</p>
      </div>
    );
  }

  return (
    <div className="panel p-4">
      {toolbar}
      {onColorChange && (
        <p className="text-[11px] text-ink-muted mb-2 -mt-1">
          Tip: click a job&rsquo;s color chip on the left to recolor its bar.
        </p>
      )}
      <div ref={wrapRef} className="w-full relative">
        <canvas
          ref={canvasRef}
          className="block"
          style={{ cursor: hoverRow != null ? "pointer" : "default" }}
          onMouseMove={(e) => setHoverRow(rowAt(e.clientY))}
          onMouseLeave={() => setHoverRow(null)}
          onClick={(e) => handleCanvasClick(e.clientX, e.clientY)}
        />

        {/* In-canvas color picker: 7 main colors × 5 shades */}
        {picker && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setPicker(null)} aria-hidden />
            <div
              className="absolute z-50 bg-panel border-[1.5px] border-ink shadow-xl p-2.5"
              style={{ left: picker.x, top: picker.y, width: 184 }}
            >
              <div className="label-mono mb-2">Bar Color</div>
              <div className="space-y-1">
                {JOB_COLOR_PALETTE.map((row) => (
                  <div key={row.name} className="flex gap-1" title={row.name}>
                    {row.shades.map((hex) => {
                      const current = jobs.find((j) => j.id === picker.jobId)?.color;
                      const selected = current === hex;
                      return (
                        <button
                          key={hex}
                          onClick={() => {
                            onColorChange(picker.jobId, hex);
                            setPicker(null);
                          }}
                          className="w-6 h-6 rounded-sm hover:scale-110 transition-transform"
                          style={{ background: hex, outline: selected ? "2px solid #1A2332" : "1px solid rgba(26,35,50,0.18)", outlineOffset: selected ? "1px" : "0" }}
                          aria-label={`${row.name} ${hex}`}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
              <button
                onClick={() => {
                  onColorChange(picker.jobId, "");
                  setPicker(null);
                }}
                className="mt-2 w-full font-mono text-[10px] uppercase tracking-wider border border-hair py-1 hover:bg-paper transition-colors"
              >
                Reset to status color
              </button>
            </div>
          </>
        )}
      </div>
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 pt-3 border-t border-hair">
        {(["N/A", "Bid Requested", "Bid Approved", "Work-in-progress", "Finished", "Paid"] as JobStatus[]).map(
          (s) => (
            <span key={s} className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-ink-muted">
              <span className="w-3 h-3 rounded-sm border border-hair" style={{ background: statusFill(s).bar }} />
              {s}
            </span>
          ),
        )}
        <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-ink-muted">
          <span className="inline-block w-3 border-t-2 border-dashed" style={{ borderColor: C.red }} /> Today
        </span>
      </div>
    </div>
  );
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}
