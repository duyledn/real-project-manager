"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { use, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  LayoutDashboard,
  Calculator,
  LayoutGrid,
  CalendarRange,
  FolderOpen,
  Users,
  ChevronsUpDown,
  Settings,
  Plus,
} from "lucide-react";
import { useCurrency } from "@/lib/currency";
import { ProjectProvider, useProjectContext } from "@/lib/projectContext";
import { prefetchProject } from "@/lib/useProject";
import { useSession } from "@/lib/session-context";
import { useI18n } from "@/lib/i18n";
import { profileInitials } from "@/lib/useWorkspaceProfile";
import type { ProjectSummary } from "@/lib/types";
import { SaveIndicator } from "@/components/fields";

const FINANCIALS_SUBTABS = [
  { slug: "construction", label: "Construction Estimate" },
  { slug: "investment", label: "Investment Estimates" },
  { slug: "analysis", label: "Analysis" },
  { slug: "math", label: "Math check" },
  { slug: "report", label: "Investment report" },
];

const FINANCIALS_SLUGS = FINANCIALS_SUBTABS.map((t) => t.slug);
const SIDEBAR_TOP = 79;

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
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loaded, setLoaded] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);

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
      const target = e.target as Node;
      if (ref.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setRect(ref.current?.getBoundingClientRect() ?? null);
    const close = (event: Event) => {
      const target = event.target;
      if (target instanceof Node && menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    window.addEventListener("scroll", close, true);
    return () => window.removeEventListener("scroll", close, true);
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

      {open && rect && typeof document !== "undefined" && createPortal(
        <div
          ref={menuRef}
          className="p-2 z-[120]"
          style={{
            position: "fixed",
            top: rect.bottom + 8,
            left: rect.left,
            width: 252,
            borderRadius: 16,
            background: "var(--glass-strong)",
            backdropFilter: "var(--blur)",
            WebkitBackdropFilter: "var(--blur)",
            border: "1px solid var(--border)",
            borderTopColor: "var(--border-top)",
            boxShadow: "var(--shadow-lg)",
          }}
        >
          <div className="label-mono px-2 py-1.5">{t("Switch project")}</div>
          <div className="max-h-[300px] overflow-auto flex flex-col gap-0.5">
            {!loaded ? (
              <div className="px-2.5 py-2 text-[12.5px] text-ink-muted">{t("Loading…")}</div>
            ) : projects.length === 0 ? (
              <div className="px-2.5 py-2 text-[12.5px] text-ink-muted">{t("No projects yet.")}</div>
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
                    {active && <span className="text-[10px] font-bold uppercase tracking-wider shrink-0">{t("Current")}</span>}
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
            <Plus size={14} /> {t("New / all projects")}
          </Link>
        </div>,
        document.body,
      )}
    </div>
  );
}

function ShellChrome({ id, children }: { id: string; children: React.ReactNode }) {
  const { project, saveState } = useProjectContext();
  const { user } = useSession();
  const { t } = useI18n();
  const pathname = usePathname();
  const base = `/projects/${id}`;

  const sub = pathname.slice(base.length).replace(/^\//, ""); // "", "construction", "manage"…
  const inFinancials = FINANCIALS_SLUGS.includes(sub);
  const inManage = sub === "manage";
  const inScheduling = sub === "scheduling";
  const inFiles = sub === "files";
  const inSettings = sub === "settings";
  const isDashboard = sub === "";

  // Pending-decision badge on Jobs & Bids: bids that have arrived but aren't
  // yet acted on. Mirrors the Dashboard's "Bids needing your decision" count.
  const pendingBids =
    project?.jobs.reduce(
      (n, j) => n + j.bidders.filter((b) => b.status === "Bid received").length,
      0,
    ) ?? 0;

  // Primary "WORKSPACE" group — the project's own screens.
  const nav = [
    { key: "dashboard", label: "Dashboard", icon: LayoutDashboard, href: base, active: isDashboard },
    { key: "financials", label: "Financials", icon: Calculator, href: `${base}/construction`, active: inFinancials },
    {
      key: "jobs",
      label: "Jobs & Bids",
      icon: LayoutGrid,
      href: `${base}/manage`,
      active: inManage,
      badge: pendingBids || undefined,
    },
    { key: "scheduling", label: "Schedule", icon: CalendarRange, href: `${base}/scheduling`, active: inScheduling },
    { key: "files", label: "Files", icon: FolderOpen, href: `${base}/files`, active: inFiles },
  ];

  // Bottom group — cross-cutting destinations + the user card.
  const bottomNav = [
    { key: "subs", label: "Subcontractors", icon: Users, href: `/subcontractors?from=${id}`, active: false },
    { key: "settings", label: "Project settings", icon: Settings, href: `${base}/settings`, active: inSettings },
  ];

  const navItemStyle = (active: boolean): React.CSSProperties =>
    active
      ? { background: "var(--accent-soft)", color: "var(--accent)" }
      : { color: "var(--muted)" };

  const screen = isDashboard
    ? { kicker: t("Overview"), title: t("Dashboard") }
    : inFinancials
      ? { kicker: t("Project finance"), title: t("Financials") }
      : inManage
        ? { kicker: t("The hero workspace"), title: t("Jobs & Bids") }
        : inScheduling
          ? { kicker: t("Timeline"), title: t("Schedule") }
          : inFiles
            ? { kicker: t("Workspace"), title: t("Files") }
            : inSettings
              ? { kicker: t("Preferences"), title: t("Project settings") }
              : { kicker: t("Project"), title: project?.name ?? t("Project") };

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
        <aside
          className="panel no-print w-[252px] shrink-0 p-[15px] hidden lg:flex flex-col self-stretch"
          style={{
            borderRadius: 26,
            position: "sticky",
            top: SIDEBAR_TOP,
            maxHeight: `calc(100vh - ${SIDEBAR_TOP + 12}px)`,
            overflowY: "auto",
          }}
        >
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
              <div className="font-bold text-[13.5px] truncate">{project?.name ?? t("Project")}</div>
              <div className="text-[11px] text-ink-muted font-medium">
                {project ? t("{years}-yr hold · Active", { years: project.holdYears }) : t("Loading…")}
              </div>
            </div>
            <ProjectSwitcher currentId={id} />
          </div>

          <div className="label-mono px-2 pb-2">{t("Workspace")}</div>
          <nav className="flex flex-col gap-1">
            {nav.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-[14px] text-[13px] font-bold transition-colors hover:bg-[var(--glass-2)]"
                  style={navItemStyle(item.active)}
                >
                  <Icon size={19} className={item.active ? "text-accent" : ""} />
                  <span className="flex-1 text-left">{t(item.label)}</span>
                  {item.badge != null && (
                    <span
                      className="text-[10.5px] font-extrabold leading-none px-2 py-1 rounded-full"
                      style={{ background: "var(--accent)", color: "#fff" }}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Bottom group: cross-cutting links + the signed-in user card. */}
          <div className="mt-auto flex flex-col gap-1">
            <div className="h-px my-3 mx-1.5" style={{ background: "var(--border)" }} />
            {bottomNav.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-[14px] text-[13px] font-bold transition-colors hover:bg-[var(--glass-2)]"
                  style={navItemStyle(item.active)}
                >
                  <Icon size={19} className={item.active ? "text-accent" : ""} />
                  <span className="flex-1 text-left">{t(item.label)}</span>
                </Link>
              );
            })}

            {user && (
              <div
                className="flex items-center gap-2.5 p-2.5 rounded-[14px] mt-1.5"
                style={{ background: "var(--glass-2)", border: "1px solid var(--border)" }}
              >
                {user.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.avatar}
                    alt=""
                    className="w-[30px] h-[30px] rounded-full object-cover shrink-0"
                    style={{ border: "1px solid var(--border)" }}
                  />
                ) : (
                  <div
                    className="w-[30px] h-[30px] rounded-full flex items-center justify-center text-white font-bold text-[12px] shrink-0"
                    style={{ background: "linear-gradient(150deg,var(--accent),var(--accent-2))" }}
                  >
                    {profileInitials(user.tag)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-[12.5px] font-bold truncate">{user.username || `@${user.tag}`}</div>
                  <div className="text-[10.5px] text-ink-muted">
                    {user.role === "god" ? t("Admin · full control") : t("Project manager")}
                  </div>
                </div>
              </div>
            )}
          </div>
        </aside>

        <main className="panel flex-1 min-w-0 flex flex-col overflow-hidden self-stretch" style={{ borderRadius: 26 }}>
          <div className="no-print flex items-center justify-between gap-4 px-5 sm:px-6 py-4 border-b" style={{ borderColor: "var(--border)" }}>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-bold tracking-[0.06em] uppercase text-accent">{screen.kicker}</div>
              <div className="text-[22px] font-extrabold tracking-tight mt-0.5 truncate">{screen.title}</div>
            </div>
            <div className="no-print shrink-0"><SaveIndicator state={saveState} /></div>
            <nav className="flex lg:hidden gap-1 p-1 rounded-[13px]" style={{ background: "var(--glass-2)", border: "1px solid var(--border)" }}>
              {[...nav, ...bottomNav].map((item) => {
                const Icon = item.icon;
                return (
                  <Link key={item.key} href={item.href} className="p-2 rounded-[10px]"
                    style={item.active ? { background: "var(--accent-soft)", color: "var(--accent)" } : { color: "var(--muted)" }}>
                    <Icon size={18} />
                  </Link>
                );
              })}
            </nav>
          </div>

          {inFinancials && (
            <div className="no-print px-5 sm:px-6 pt-4">
              <div className="inline-flex gap-1 p-1 rounded-[13px]" style={{ background: "var(--glass-2)", border: "1px solid var(--border)" }}>
                {FINANCIALS_SUBTABS.map((tab) => {
                  const href = `${base}/${tab.slug}`;
                  const active = pathname === href;
                  return (
                    <Link
                      key={tab.slug}
                      href={href}
                      className="px-4 py-2 rounded-[10px] text-[12.5px] font-bold transition-colors"
                      style={active
                        ? { background: "var(--seg-active)", color: "var(--text)", boxShadow: "var(--shadow)" }
                        : { color: "var(--muted)" }}
                    >
                      {t(tab.label)}
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
