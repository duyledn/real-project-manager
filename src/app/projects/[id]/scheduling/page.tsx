"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Maximize2, Minimize2 } from "lucide-react";
import { useProjectContext } from "@/lib/projectContext";
import { SaveIndicator } from "@/components/fields";
import { JobTimeline } from "@/components/JobTimeline";
import type { Project, Job } from "@/lib/types";

/** Scheduling — the project timeline (Gantt) for every job, pulled straight
 *  from the Jobs & Bids data. Recoloring a bar autosaves; clicking a job opens
 *  it back on the Jobs & Bids tab. */
export default function SchedulingPage() {
  const { project, setProject, loading, error, saveState } = useProjectContext();
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);

  if (loading) return <div className="font-mono text-ink-muted text-sm uppercase">Loading…</div>;
  if (error) return <div className="panel border-red text-red p-4 font-mono text-sm">{error}</div>;
  if (!project) return null;

  const base = `/projects/${project.id}`;

  function updateJob(jobId: string, updater: (j: Job) => Job) {
    setProject((p: Project) => ({ ...p, jobs: p.jobs.map((j) => (j.id === jobId ? updater(j) : j)) }));
  }
  // Selecting a job sends you to Jobs & Bids with that job's drawer open.
  const openInJobs = (jobId: string) => router.push(`${base}/manage?job=${jobId}`);

  return (
    <div className="space-y-6">
      {/* Intro + save status */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display font-extrabold text-2xl leading-none">Scheduling</h1>
          <p className="text-sm text-ink-muted mt-1.5 max-w-2xl">
            Every job positioned by its start and (optional) end date — pulled live from Jobs &amp; Bids. Recolor a
            bar here, or click one to open it on the Jobs &amp; Bids tab.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <SaveIndicator state={saveState} />
          {project.jobs.length > 0 && (
            <button onClick={() => setExpanded(true)} className="btn inline-flex items-center gap-1.5 shrink-0">
              <Maximize2 size={14} /> Expand
            </button>
          )}
        </div>
      </div>

      {project.jobs.length === 0 ? (
        <div className="panel p-8 text-center">
          <p className="text-sm text-ink-muted">
            No jobs yet. Add construction scopes on the{" "}
            <button onClick={() => router.push(`${base}/manage`)} className="text-accent font-bold underline-offset-2 hover:underline">
              Jobs &amp; Bids
            </button>{" "}
            tab and they&rsquo;ll appear here on the timeline.
          </p>
        </div>
      ) : (
        <JobTimeline
          jobs={project.jobs}
          selectedJobId={null}
          onSelect={openInJobs}
          onColorChange={(jobId, color) => updateJob(jobId, (j) => ({ ...j, color }))}
        />
      )}

      {/* Expanded timeline — 3/4 of the screen */}
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
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b shrink-0" style={{ borderColor: "var(--border)" }}>
              <div>
                <div className="label-mono">Scheduling · Timeline</div>
                <h2 className="font-display font-extrabold text-xl leading-none mt-0.5">{project.name}</h2>
              </div>
              <button onClick={() => setExpanded(false)} className="btn inline-flex items-center gap-1.5">
                <Minimize2 size={14} /> Close
              </button>
            </div>
            <div className="flex-1 overflow-auto p-5">
              <JobTimeline
                jobs={project.jobs}
                selectedJobId={null}
                onSelect={openInJobs}
                onColorChange={(jobId, color) => updateJob(jobId, (j) => ({ ...j, color }))}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
