"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Shield, Building2, Crown, FolderKanban, Users } from "lucide-react";
import type { PublicUser } from "@/lib/types";
import { useSession } from "@/lib/session-context";

interface AdminAccess {
  user: PublicUser;
  level: "Owner" | "Member";
}
interface AdminProject {
  id: string;
  name: string;
  access: AdminAccess[];
}
interface AdminCompany {
  id: string;
  name: string;
  owner: PublicUser | null;
  members: PublicUser[];
  memberCount: number;
  projects: AdminProject[];
}
interface AdminData {
  totalUsers: number;
  totalCompanies: number;
  totalProjects: number;
  companies: AdminCompany[];
}

export default function AdminPage() {
  const { user, loading: sessionLoading } = useSession();
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (sessionLoading) return;
    if (user?.role !== "god") {
      setLoading(false);
      return;
    }
    fetch("/api/admin")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Could not load admin data"))))
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [user, sessionLoading]);

  if (!sessionLoading && user?.role !== "god") {
    return (
      <main className="max-w-3xl mx-auto px-5 py-16 text-center">
        <Shield size={28} className="mx-auto text-ink-muted mb-3" />
        <h1 className="font-display font-extrabold text-2xl">Admins only</h1>
        <p className="text-ink-muted text-sm mt-2">This console is restricted to the workspace administrator.</p>
        <Link href="/" className="btn mt-5 inline-flex gap-1.5"><ArrowLeft size={14} /> Back home</Link>
      </main>
    );
  }

  return (
    <main className="max-w-5xl mx-auto px-5 py-8">
      <div className="mb-5">
        <Link href="/" className="btn gap-1.5"><ArrowLeft size={14} /> All projects</Link>
      </div>
      <header className="panel p-6 mb-6 flex items-center gap-3">
        <div className="w-11 h-11 rounded-[13px] flex items-center justify-center shrink-0" style={{ background: "var(--accent-soft)" }}>
          <Shield size={22} className="text-accent" />
        </div>
        <div>
          <div className="text-[11px] font-bold tracking-[0.06em] uppercase text-accent">Administrator</div>
          <h1 className="font-display font-extrabold text-3xl leading-none">Admin console</h1>
        </div>
      </header>

      {error && <div className="panel border-red text-red p-4 mb-6 text-sm">{error}</div>}

      {loading ? (
        <div className="text-ink-muted text-sm">Loading…</div>
      ) : data ? (
        <>
          <div className="grid grid-cols-3 gap-3.5 mb-6">
            <Stat icon={Users} label="Users" value={data.totalUsers} />
            <Stat icon={Building2} label="Companies" value={data.totalCompanies} />
            <Stat icon={FolderKanban} label="Projects" value={data.totalProjects} />
          </div>

          <div className="space-y-5">
            {data.companies.map((c) => (
              <div key={c.id} className="panel p-5">
                <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Building2 size={18} className="text-accent shrink-0" />
                    <span className="font-display font-extrabold text-xl truncate">{c.name}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {c.owner && (
                      <span className="pill" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
                        <Crown size={12} /> @{c.owner.tag}
                      </span>
                    )}
                    <span className="pill" style={{ background: "var(--glass-2)", border: "1px solid var(--border)", color: "var(--ink-muted)" }}>
                      <Users size={12} /> {c.memberCount + 1} people
                    </span>
                  </div>
                </div>

                {c.projects.length === 0 ? (
                  <p className="text-sm text-ink-muted">No projects.</p>
                ) : (
                  <div className="rounded-[14px] overflow-hidden" style={{ border: "1px solid var(--border)" }}>
                    {c.projects.map((p) => (
                      <div key={p.id} className="px-4 py-3 border-b border-hair last:border-0">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <Link href={`/projects/${p.id}`} className="font-semibold hover:text-accent">{p.name}</Link>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {p.access.map((a) => (
                              <span
                                key={a.user.id}
                                className="pill !text-[10.5px]"
                                style={a.level === "Owner"
                                  ? { background: "var(--accent-soft)", color: "var(--accent)" }
                                  : { background: "var(--glass-2)", border: "1px solid var(--border)", color: "var(--text)" }}
                              >
                                @{a.user.tag} · {a.level}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      ) : null}
    </main>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: number }) {
  return (
    <div className="panel-2 p-4">
      <Icon size={20} className="text-accent" />
      <div className="font-mono text-[26px] font-extrabold tracking-tight mt-2">{value}</div>
      <div className="text-xs text-ink-muted font-medium">{label}</div>
    </div>
  );
}
