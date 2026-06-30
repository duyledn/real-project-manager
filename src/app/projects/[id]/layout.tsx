"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { use, useEffect, useRef, useState } from "react";
import {
  LayoutDashboard,
  Calculator,
  LayoutGrid,
  Users,
  ChevronsUpDown,
  Settings,
  Plus,
} from "lucide-react";
import { useCurrency } from "@/lib/currency";
import { ProjectProvider, useProjectContext } from "@/lib/projectContext";
import { prefetchProject } from "@/lib/useProject";
import type { ProjectSummary } from "@/lib/types";

const FINANCIALS_SUBTABS = [
  { slug: "inputs", label: "Inputs" },
  { slug: "analysis", label: "Analysis" },
  { slug: "math", label: "Math" },
  { slug: "report", label: "Report" },
];

/** Keeps the displayed currency mirroring the active project's stored currency.
 *  No UI — the header currency control now lives in Project settings. */
function CurrencySync() {
  const { project } = useProjectContext();
  const { setCurrency } = useCurrency();
  useEffect(() => {
    if (project) setCurrency(project.currency);
  }, [project?.currency, setCurrency]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

/** Sidebar project switcher: clicking the up/down arrow opens a list of the
 *  other projects to jump straight to, instead of bouncing to the landing page. */
function ProjectSwitcher({ currentId }: { currentId: string }) {
  const [open, setOpen] = useState(false);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loaded, setLoaded] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || loaded) return;
    fetch("/api/projects")
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setProjects(d))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [open, loaded]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        onClick={() => setOpen((o) => !o)}
        title="Switch project"
        aria-label="Switch project"
        aria-expanded={open}
        className="text-faint hover:text-accent transition-colors"
      >
        <ChevronsUpDown size={18} />
      </button>

      {open && (
        <div
          className="absolute left-0 top-full mt-2 w-[252px] p-2 z-[120]"
          style={{
            borderRadius: 16,
            background: "var(--glass-strong)",
            backdropFilter: "var(--blur)",
            WebkitBackdropFilter: "var(--blur)",
            border: "1px solid var(--border)",
            borderTopColor: "var(--border-top)",
            boxShadow: "var(--shadow-lg)",
          }}
        >
          <div className="label-mono px-2 py-1.5">Switch project</div>
          <div className="max-h-[300px] overflow-auto flex flex-col gap-0.5">
            {!loaded ? (
              <div className="px-2.5 py-2 text-[12.5px] text-ink-muted">Loading…</div>
            ) : projects.length === 0 ? (
              <div className="px-2.5 py-2 text-[12.5px] text-ink-muted">No projects yet.</div>
            ) : (
              projects.map((p) => {
                const active = p.id === currentId;
                return (
                  <Link
                    key={p.id}
                    href={`/projects/${p.id}`}
                    prefetch
                    onMouseEnter={() => prefetchProject(p.id)}
                    onClick={() => setOpen(false)}
                    className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-[11px] text-[13px] font-semibold transition-colors hover:bg-[var(--accent-soft)]"
                    style={active ? { background: "var(--accent-soft)", color: "var(--accent)" } : undefined}
                  >
                    <span className="truncate">{p.name}</span>
                    {active && <span className="text-[10px] font-bold uppercase tracking-wider shrink-0">Current</span>}
                  </Link>
                );
              })
            )}
          </div>
          <div className="h-px my-1.5 mx-1" style={{ background: "var(--border)" }} />
          <Link
            href="/"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-2.5 py-2 rounded-[11px] text-[12.5px] font-bold text-accent transition-colors hover:bg-[var(--accent-soft)]"
          >
            <Plus size={14} /> New / all projects
          </Link>
        </div>
      )}
    </div>
  );
}

function ShellChrome({ id, children }: { id: string; children: React.ReactNode }) {
  const { project } = useProjectContext();
  const pathname = usePathname();
  const base = `/projects/${id}`;

  const sub = pathname.slice(base.length).replace(/^\//, ""); // "", "inputs", "manage"…
  const inFinancials = ["inputs", "analysis", "math", "report"].includes(sub);
  const inManage = sub === "manage";
  const inSettings = sub === "settings";
  const isDashboard = sub === "";

  const nav = [
    { key: "dashboard", label: "Dashboard", icon: LayoutDashboard, href: base, active: isDashboard },
    { key: "financials", label: "Financials", icon: Calculator, href: `${base}/inputs`, active: inFinancials },
    { key: "jobs", label: "Jobs & Bids", icon: LayoutGrid, href: `${base}/manage`, active: inManage },
    { key: "subs", label: "Subcontractors", icon: Users, href: `/subcontractors?from=${id}`, active: false },
  ];

  const screen = isDashboard
    ? { kicker: "Overview", title: "Dashboard" }
    : inFinancials
      ? { kicker: "Project finance", title: "Financials" }
      : inManage
        ? { kicker: "The hero workspace", title: "Jobs & Bids" }
        : inSettings
          ? { kicker: "Preferences", title: "Project settings" }
          : { kicker: "Project", title: project?.name ?? "Project" };

  const initials = (project?.name ?? "Project")
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div className="max-w-[1240px] mx-auto px-4 sm:px-6 py-5 print-root">
      <CurrencySync />

      {/* Sidebar + main */}
      <div className="flex gap-4 sm:gap-[18px] items-start">
        <aside className="panel no-print w-[244px] shrink-0 p-[15px] hidden lg:flex flex-col self-stretch" style={{ borderRadius: 26 }}>
          <div className="panel-2 flex items-center gap-3 p-[11px] mb-4">
            {project?.profileImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={project.profileImage}
                alt=""
                className="w-9 h-9 rounded-[11px] object-cover shrink-0"
                style={{ border: "1px solid var(--border)" }}
              />
            ) : (
              <div className="w-9 h-9 rounded-[11px] flex items-center justify-center text-white font-extrabold text-[13px] shrink-0"
                style={{ background: "linear-gradient(150deg,#7A8C5A,#9DAE6E)" }}>
                {initials || "PR"}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="font-bold text-[13.5px] truncate">{project?.name ?? "Project"}</div>
              <div className="text-[11px] text-ink-muted font-medium">
                {project ? `${project.holdYears}-yr hold · Active` : "Loading…"}
              </div>
            </div>
            <ProjectSwitcher currentId={id} />
          </div>

          <div className="label-mono px-2 pb-2">Workspace</div>
          <nav className="flex flex-col gap-1">
            {nav.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-[14px] text-[13px] font-bold transition-colors"
                  style={item.active
                    ? { background: "var(--seg-active)", color: "var(--text)", boxShadow: "var(--shadow)" }
                    : { color: "var(--muted)" }}
                >
                  <Icon size={19} className={item.active ? "text-accent" : ""} />
                  <span className="flex-1 text-left">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Project settings sits just below the workspace nav. */}
          <div className="h-px my-3 mx-1.5" style={{ background: "var(--border)" }} />
          <Link
            href={`${base}/settings`}
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-[14px] text-[13px] font-bold transition-colors"
            style={inSettings
              ? { background: "var(--seg-active)", color: "var(--text)", boxShadow: "var(--shadow)" }
              : { color: "var(--muted)" }}
          >
            <Settings size={19} className={inSettings ? "text-accent" : ""} />
            <span className="flex-1 text-left">Project settings</span>
          </Link>
        </aside>

        <main className="panel flex-1 min-w-0 flex flex-col overflow-hidden self-stretch" style={{ borderRadius: 26 }}>
          <div className="no-print flex items-center justify-between gap-4 px-5 sm:px-6 py-4 border-b" style={{ borderColor: "var(--border)" }}>
            <div className="min-w-0">
              <div className="text-[11px] font-bold tracking-[0.06em] uppercase text-accent">{screen.kicker}</div>
              <div className="text-[22px] font-extrabold tracking-tight mt-0.5 truncate">{screen.title}</div>
            </div>
            <nav className="flex lg:hidden gap-1 p-1 rounded-[13px]" style={{ background: "var(--glass-2)", border: "1px solid var(--border)" }}>
              {[...nav, { key: "settings", label: "Project settings", icon: Settings, href: `${base}/settings`, active: inSettings }].map((item) => {
                const Icon = item.icon;
                return (
                  <Link key={item.key} href={item.href} className="p-2 rounded-[10px]"
                    style={item.active ? { background: "var(--seg-active)", color: "var(--accent)" } : { color: "var(--muted)" }}>
                    <Icon size={18} />
                  </Link>
                );
              })}
            </nav>
          </div>

          {inFinancials && (
            <div className="no-print px-5 sm:px-6 pt-4">
              <div className="inline-flex gap-1 p-1 rounded-[13px]" style={{ background: "var(--glass-2)", border: "1px solid var(--border)" }}>
                {FINANCIALS_SUBTABS.map((t) => {
                  const href = `${base}/${t.slug}`;
                  const active = pathname === href;
                  return (
                    <Link
                      key={t.slug}
                      href={href}
                      className="px-4 py-2 rounded-[10px] text-[12.5px] font-bold transition-colors"
                      style={active
                        ? { background: "var(--seg-active)", color: "var(--text)", boxShadow: "var(--shadow)" }
                        : { color: "var(--muted)" }}
                    >
                      {t.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex-1 overflow-auto p-5 sm:p-6" style={{ animation: "riseIn .4s ease both" }}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <ProjectProvider id={id}>
      <ShellChrome id={id}>{children}</ShellChrome>
    </ProjectProvider>
  );
}
