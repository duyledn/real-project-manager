"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, Settings, FolderOpen, Shield, LogOut } from "lucide-react";
import type { ProjectSummary } from "@/lib/types";
import { Logo } from "@/components/Logo";
import { useSession } from "@/lib/session-context";
import { useI18n } from "@/lib/i18n";
import { profileInitials } from "@/lib/useWorkspaceProfile";
import { prefetchProject } from "@/lib/useProject";

const menuPanel: React.CSSProperties = {
  borderRadius: 16,
  background: "var(--glass-strong)",
  backdropFilter: "var(--blur)",
  WebkitBackdropFilter: "var(--blur)",
  border: "1px solid var(--border)",
  borderTopColor: "var(--border-top)",
  boxShadow: "var(--shadow-lg)",
};

/** Global top navigation bar: brand (→ landing) on the left; Projects menu,
 *  workspace Settings, and the user menu on the right. */
export function TopNav() {
  const { t } = useI18n();
  return (
    <div className="no-print sticky top-0 z-[100] px-4 sm:px-6 pt-3">
      <nav
        className="panel max-w-[1240px] mx-auto flex items-center justify-between gap-4 px-4 py-2.5"
        style={{ background: "var(--glass-strong)" }}
      >
        <Link href="/" className="flex items-center gap-3 min-w-0 group" title={t("Back to all projects")}>
          <Logo size={30} className="text-accent shrink-0 transition-transform group-hover:scale-105" />
          <div className="font-extrabold text-[14.5px] tracking-tight whitespace-nowrap hidden sm:block">
            Real Project Manager
          </div>
        </Link>

        <div className="flex items-center gap-1.5 sm:gap-2.5">
          <ProjectsMenu />
          <Link href="/settings" title={t("Workspace & profile settings")} aria-label={t("Workspace settings")} className="icon-btn">
            <Settings size={16} />
          </Link>
          <UserMenu />
        </div>
      </nav>
    </div>
  );
}

function UserMenu() {
  const { user, logout } = useSession();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  if (!user) return null;

  return (
    <div ref={ref} className="relative shrink-0">
      <button onClick={() => setOpen((o) => !o)} className="shrink-0" aria-haspopup="menu" aria-expanded={open} title={`@${user.tag}`}>
        {user.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.avatar} alt="Profile" className="w-9 h-9 rounded-full object-cover" style={{ border: "1px solid var(--border)" }} />
        ) : (
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-extrabold text-[12px]" style={{ background: "linear-gradient(150deg,#7A8C5A,#9DAE6E)" }}>
            {profileInitials(user.tag)}
          </div>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[220px] p-2 z-[120]" style={menuPanel}>
          <div className="px-2.5 py-2 mb-1">
            <div className="text-[13px] font-extrabold">@{user.tag}</div>
            <div className="text-[11px] text-ink-muted">
              {user.role === "god" ? t("Admin · full control") : user.username}
            </div>
          </div>
          <div className="h-px mb-1 mx-1" style={{ background: "var(--border)" }} />
          {user.role === "god" && (
            <Link href="/admin" onClick={() => setOpen(false)} className="flex items-center gap-2 px-2.5 py-2 rounded-[11px] text-[13px] font-semibold transition-colors hover:bg-[var(--accent-soft)]">
              <Shield size={15} className="text-accent" /> {t("Admin console")}
            </Link>
          )}
          <Link href="/settings" onClick={() => setOpen(false)} className="flex items-center gap-2 px-2.5 py-2 rounded-[11px] text-[13px] font-semibold transition-colors hover:bg-[var(--accent-soft)]">
            <Settings size={15} /> {t("Settings")}
          </Link>
          <button onClick={() => void logout()} className="w-full flex items-center gap-2 px-2.5 py-2 rounded-[11px] text-[13px] font-semibold text-red transition-colors hover:bg-[var(--accent-soft)]">
            <LogOut size={15} /> {t("Sign out")}
          </button>
        </div>
      )}
    </div>
  );
}

function ProjectsMenu() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loaded, setLoaded] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function ensureLoaded() {
    if (loaded) return;
    try {
      const res = await fetch("/api/projects");
      if (res.ok) setProjects(await res.json());
    } catch {
      /* ignore */
    } finally {
      setLoaded(true);
    }
  }

  function openMenu() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    void ensureLoaded();
    setOpen(true);
  }
  function scheduleClose() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), 140);
  }

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div ref={wrapRef} className="relative" onMouseEnter={openMenu} onMouseLeave={scheduleClose}>
      <button onClick={() => (open ? setOpen(false) : openMenu())} className="btn gap-1.5" aria-haspopup="menu" aria-expanded={open}>
        <FolderOpen size={15} className="text-accent" />
        <span className="hidden sm:inline">{t("Projects")}</span>
        <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[260px] p-2 z-[120]" style={menuPanel}>
          <div className="label-mono px-2 py-1.5">{t("Your projects")}</div>
          <div className="max-h-[320px] overflow-auto flex flex-col gap-0.5">
            {!loaded ? (
              <div className="px-2.5 py-2 text-[12.5px] text-ink-muted">{t("Loading…")}</div>
            ) : projects.length === 0 ? (
              <div className="px-2.5 py-2 text-[12.5px] text-ink-muted">{t("No projects yet.")}</div>
            ) : (
              projects.map((p) => (
                <Link
                  key={p.id}
                  href={`/projects/${p.id}`}
                  prefetch
                  onMouseEnter={() => prefetchProject(p.id)}
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-[11px] text-[13px] font-semibold transition-colors hover:bg-[var(--accent-soft)]"
                >
                  <span className="truncate">{p.name}</span>
                  <span className="text-[10.5px] text-faint font-medium shrink-0">{t("{years}-yr", { years: p.holdYears })}</span>
                </Link>
              ))
            )}
          </div>
          <div className="h-px my-1.5 mx-1" style={{ background: "var(--border)" }} />
          <Link href="/" onClick={() => setOpen(false)} className="flex items-center gap-2 px-2.5 py-2 rounded-[11px] text-[12.5px] font-bold text-accent transition-colors hover:bg-[var(--accent-soft)]">
            <FolderOpen size={14} /> {t("View all projects")}
          </Link>
        </div>
      )}
    </div>
  );
}
