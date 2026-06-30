"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  Users,
  TrendingUp,
  TrendingDown,
  Building2,
  UserPlus,
  X,
  UsersRound,
  Crown,
  Check,
} from "lucide-react";
import type { ProjectSummary, PublicUser } from "@/lib/types";
import { defaultProjectInput } from "@/lib/defaults";
import { formatMoney } from "@/lib/currency";
import { useSession } from "@/lib/session-context";
import { prefetchProject } from "@/lib/useProject";

interface CompanyView {
  id: string;
  name: string;
  ownerId: string;
  owner: PublicUser | null;
  members: PublicUser[];
  projectCount: number;
  canManage: boolean;
}

export default function HomePage() {
  const { user } = useSession();
  const [companies, setCompanies] = useState<CompanyView[]>([]);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newCompany, setNewCompany] = useState("");
  const [creatingCompany, setCreatingCompany] = useState(false);

  const load = useCallback(async () => {
    try {
      const [c, p] = await Promise.all([
        fetch("/api/companies").then((r) => (r.ok ? r.json() : [])),
        fetch("/api/projects").then((r) => (r.ok ? r.json() : [])),
      ]);
      setCompanies(c);
      setProjects(p);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function createCompany() {
    if (!newCompany.trim()) return;
    setCreatingCompany(true);
    try {
      const res = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCompany.trim() }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Could not create company");
      setNewCompany("");
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCreatingCompany(false);
    }
  }

  return (
    <main className="max-w-5xl mx-auto px-5 py-8">
      <header className="panel mb-6 p-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold tracking-[0.06em] uppercase text-accent mb-2">
            {user ? `Signed in as @${user.tag}` : "Workspace"}
          </div>
          <h1 className="font-display font-extrabold text-4xl leading-none">Your workspaces</h1>
          <p className="text-ink-muted text-sm mt-2 max-w-md">
            Projects live inside companies. Own a company to add teammates by @tag and assign them to projects.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link href="/subcontractors" className="btn flex items-center gap-2">
            <Users size={15} /> Subcontractors
          </Link>
        </div>
      </header>

      {error && <div className="panel border-red text-red p-4 mb-6 text-sm">{error}</div>}

      {/* Create company */}
      <div className="panel-2 p-4 mb-6 flex items-center gap-2.5 flex-wrap">
        <Building2 size={18} className="text-accent" />
        <span className="text-[13px] font-bold">New company</span>
        <input
          value={newCompany}
          onChange={(e) => setNewCompany(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && createCompany()}
          placeholder="Company name…"
          className="field-input flex-1 min-w-[180px] max-w-xs !min-h-0 py-2"
        />
        <button onClick={createCompany} disabled={creatingCompany || !newCompany.trim()} className="btn btn-blue gap-1.5">
          <Plus size={15} /> {creatingCompany ? "Creating…" : "Create"}
        </button>
      </div>

      {loading ? (
        <div className="text-ink-muted text-sm">Loading…</div>
      ) : companies.length === 0 ? (
        <div className="panel p-10 text-center text-ink-muted">
          No companies yet. Create one above to start adding projects and teammates.
        </div>
      ) : (
        <div className="space-y-5">
          {companies.map((c) => (
            <CompanyCard
              key={c.id}
              company={c}
              projects={projects.filter((p) => p.companyId === c.id)}
              currentUser={user}
              onChanged={load}
              onError={setError}
            />
          ))}
        </div>
      )}
    </main>
  );
}

function CompanyCard({
  company,
  projects,
  currentUser,
  onChanged,
  onError,
}: {
  company: CompanyView;
  projects: ProjectSummary[];
  currentUser: PublicUser | null;
  onChanged: () => Promise<void>;
  onError: (m: string) => void;
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [addTag, setAddTag] = useState("");
  const [adding, setAdding] = useState(false);

  async function createProject() {
    setCreating(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...defaultProjectInput(), companyId: company.id }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Could not create project");
      const project = await res.json();
      router.push(`/projects/${project.id}`);
    } catch (err) {
      onError((err as Error).message);
      setCreating(false);
    }
  }

  async function addMember() {
    const tag = addTag.trim().replace(/^@+/, "");
    if (!tag) return;
    setAdding(true);
    try {
      const res = await fetch(`/api/companies/${company.id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tag }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Could not add member");
      setAddTag("");
      await onChanged();
    } catch (err) {
      onError((err as Error).message);
    } finally {
      setAdding(false);
    }
  }

  async function removeMember(userId: string) {
    try {
      await fetch(`/api/companies/${company.id}/members?userId=${userId}`, { method: "DELETE" });
      await onChanged();
    } catch (err) {
      onError((err as Error).message);
    }
  }

  return (
    <div className="panel p-5">
      {/* Company header */}
      <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-[13px] flex items-center justify-center shrink-0" style={{ background: "var(--accent-soft)" }}>
            <Building2 size={20} className="text-accent" />
          </div>
          <div className="min-w-0">
            <div className="font-display font-extrabold text-xl truncate">{company.name}</div>
            <div className="text-[12px] text-ink-muted flex items-center gap-1.5">
              <Crown size={12} className="text-amber" />
              {company.owner ? `@${company.owner.tag}` : "—"}
              <span className="text-faint">·</span>
              {company.members.length + 1} {company.members.length === 0 ? "person" : "people"}
            </div>
          </div>
        </div>
        {company.canManage && (
          <button onClick={createProject} disabled={creating} className="btn btn-blue gap-1.5 shrink-0">
            <Plus size={15} /> {creating ? "Creating…" : "New project"}
          </button>
        )}
      </div>

      {/* Members */}
      <div className="panel-2 p-3.5 mb-4">
        <div className="flex items-center gap-2 mb-2.5">
          <UsersRound size={15} className="text-ink-muted" />
          <span className="label-mono">Team</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {company.owner && (
            <span className="pill" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
              <Crown size={12} /> @{company.owner.tag} · Owner
            </span>
          )}
          {company.members.map((m) => (
            <span key={m.id} className="pill" style={{ background: "var(--glass-2)", color: "var(--text)", border: "1px solid var(--border)" }}>
              @{m.tag}
              {company.canManage && (
                <button onClick={() => removeMember(m.id)} className="text-faint hover:text-red ml-0.5" aria-label={`Remove @${m.tag}`}>
                  <X size={12} />
                </button>
              )}
            </span>
          ))}
          {company.canManage && (
            <span className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full" style={{ border: "1px dashed var(--border)" }}>
              <span className="text-faint text-[12px] font-bold">@</span>
              <input
                value={addTag}
                onChange={(e) => setAddTag(e.target.value.replace(/^@+/, ""))}
                onKeyDown={(e) => e.key === "Enter" && addMember()}
                placeholder="tag"
                className="bg-transparent outline-none text-[12px] w-20"
              />
              <button onClick={addMember} disabled={adding || !addTag.trim()} className="icon-btn !w-6 !h-6" aria-label="Add member">
                <UserPlus size={12} />
              </button>
            </span>
          )}
        </div>
      </div>

      {/* Projects */}
      {projects.length === 0 ? (
        <p className="text-sm text-ink-muted px-1">
          No projects yet.{company.canManage ? " Create one with “New project”." : " You'll see assigned projects here."}
        </p>
      ) : (
        <div className="grid gap-2.5">
          {projects.map((p) => (
            <ProjectRow key={p.id} project={p} company={company} canManage={company.canManage} onChanged={onChanged} />
          ))}
        </div>
      )}
    </div>
  );
}

function ProjectRow({
  project,
  company,
  canManage,
  onChanged,
}: {
  project: ProjectSummary;
  company: CompanyView;
  canManage: boolean;
  onChanged: () => Promise<void>;
}) {
  const router = useRouter();
  const [assignOpen, setAssignOpen] = useState(false);
  const positive = project.netProfit >= 0;

  async function toggleAssign(userId: string, assigned: boolean) {
    const url = `/api/projects/${project.id}/members`;
    if (assigned) {
      await fetch(`${url}?userId=${userId}`, { method: "DELETE" });
    } else {
      await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId }) });
    }
    await onChanged();
  }

  return (
    <div
      className="rounded-[14px] p-4 flex items-center justify-between gap-4 transition-colors group"
      style={{ background: "var(--surface-solid)", border: "1px solid var(--border)" }}
      onMouseEnter={() => prefetchProject(project.id)}
    >
      <button onClick={() => router.push(`/projects/${project.id}`)} className="flex-1 min-w-0 text-left">
        <div className="font-display font-bold text-lg truncate">{project.name}</div>
        <div className="label-mono mt-1">
          {project.holdYears}-yr hold · Rehab {formatMoney(project.totalRenovationCost, project.currency)} · Updated{" "}
          {new Date(project.updatedAt).toLocaleDateString()}
        </div>
      </button>

      <div className="flex items-center gap-3 shrink-0">
        <span className="pill" style={{ background: "var(--glass-2)", color: "var(--ink-muted)", border: "1px solid var(--border)" }} title={`${project.memberCount} with access`}>
          <Users size={12} /> {project.memberCount}
        </span>
        <div className="text-right">
          <div className="label-mono">Net profit</div>
          <div className={`font-mono font-bold flex items-center gap-1 justify-end ${positive ? "text-green" : "text-red"}`}>
            {positive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {formatMoney(project.netProfit, project.currency)}
          </div>
        </div>

        {canManage && (
          <div className="relative">
            <button onClick={() => setAssignOpen((o) => !o)} className="icon-btn" title="Assign people" aria-label="Assign people">
              <UserPlus size={14} />
            </button>
            {assignOpen && (
              <>
                <div className="fixed inset-0 z-[130]" onClick={() => setAssignOpen(false)} />
                <div
                  className="absolute right-0 mt-2 w-[230px] p-2 z-[140]"
                  style={{ borderRadius: 16, background: "var(--glass-strong)", backdropFilter: "var(--blur)", WebkitBackdropFilter: "var(--blur)", border: "1px solid var(--border)", borderTopColor: "var(--border-top)", boxShadow: "var(--shadow-lg)" }}
                >
                  <div className="label-mono px-2 py-1.5">Assign teammates</div>
                  {company.members.length === 0 ? (
                    <div className="px-2.5 py-2 text-[12px] text-ink-muted">Add teammates to the company first.</div>
                  ) : (
                    company.members.map((m) => {
                      const assigned = project.memberIds.includes(m.id);
                      return (
                        <button
                          key={m.id}
                          onClick={() => void toggleAssign(m.id, assigned)}
                          className="w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-[11px] text-[13px] font-semibold transition-colors hover:bg-[var(--accent-soft)]"
                        >
                          <span>@{m.tag}</span>
                          <span
                            className="w-4 h-4 rounded-[5px] flex items-center justify-center"
                            style={assigned ? { background: "var(--accent)", color: "#fff" } : { border: "1px solid var(--border)" }}
                          >
                            {assigned && <Check size={11} />}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
