"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, FileText, Trash2, TrendingUp, TrendingDown, Users } from "lucide-react";
import type { ProjectSummary } from "@/lib/types";
import { defaultProjectInput } from "@/lib/defaults";
import { useCurrency } from "@/lib/currency";

export default function HomePage() {
  const router = useRouter();
  const { fmtMoney } = useCurrency();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/projects");
      if (!res.ok) throw new Error("Could not load projects");
      setProjects(await res.json());
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function createProject() {
    setCreating(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(defaultProjectInput()),
      });
      if (!res.ok) throw new Error("Could not create project");
      const project = await res.json();
      router.push(`/projects/${project.id}`);
    } catch (err) {
      setError((err as Error).message);
      setCreating(false);
    }
  }

  async function deleteProject(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!window.confirm("Delete this project permanently?")) return;
    await fetch(`/api/projects/${id}`, { method: "DELETE" });
    void load();
  }

  return (
    <main className="max-w-4xl mx-auto px-5 py-10">
      <header className="panel mb-8 p-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="font-mono text-[11px] tracking-widest text-blueprint uppercase mb-2">
            Real Estate Project Manager
          </div>
          <h1 className="font-display font-extrabold text-4xl leading-none">
            Remodel Estimator
          </h1>
          <p className="text-ink-muted text-sm mt-2 max-w-md">
            Estimate rehab costs, model financing, and analyze multi-year
            buy-rehab-hold returns. Every project is saved to your server.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link href="/subcontractors" className="btn flex items-center gap-2">
            <Users size={15} /> Subcontractors
          </Link>
          <button onClick={createProject} disabled={creating} className="btn btn-blue flex items-center gap-2">
            <Plus size={15} /> {creating ? "Creating…" : "New project"}
          </button>
        </div>
      </header>

      {error && (
        <div className="panel border-red text-red p-4 mb-6 font-mono text-sm">{error}</div>
      )}

      {loading ? (
        <div className="font-mono text-ink-muted text-sm uppercase tracking-wide">Loading…</div>
      ) : projects.length === 0 ? (
        <div className="panel p-10 text-center">
          <FileText size={32} className="mx-auto text-ink-muted mb-3" />
          <p className="text-ink-muted mb-4">No projects yet.</p>
          <button onClick={createProject} disabled={creating} className="btn btn-blue inline-flex items-center gap-2">
            <Plus size={15} /> Create your first project
          </button>
        </div>
      ) : (
        <div className="grid gap-3">
          {projects.map((p) => {
            const positive = p.netProfit >= 0;
            return (
              <button
                key={p.id}
                onClick={() => router.push(`/projects/${p.id}`)}
                className="panel p-5 text-left hover:border-blueprint transition-colors flex items-center justify-between gap-4 group"
              >
                <div className="min-w-0">
                  <div className="font-display font-bold text-xl truncate">{p.name}</div>
                  <div className="label-mono mt-1">
                    {p.holdYears}-yr hold · Rehab {fmtMoney(p.totalRenovationCost)} · Updated{" "}
                    {new Date(p.updatedAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <div className="label-mono">Net profit</div>
                    <div
                      className={`font-mono font-bold flex items-center gap-1 justify-end ${positive ? "text-green" : "text-red"}`}
                    >
                      {positive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                      {fmtMoney(p.netProfit)}
                    </div>
                  </div>
                  <span
                    onClick={(e) => deleteProject(p.id, e)}
                    className="icon-btn flex items-center justify-center opacity-0 group-hover:opacity-100"
                    title="Delete project"
                  >
                    <Trash2 size={13} />
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </main>
  );
}
