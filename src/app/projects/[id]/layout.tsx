"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { use, useEffect } from "react";
import {
  LayoutDashboard,
  Calculator,
  LayoutGrid,
  Users,
  ChevronsUpDown,
  Building2,
  ArrowLeft,
  ArrowLeftRight,
} from "lucide-react";
import { useCurrency, convertProjectCurrency } from "@/lib/currency";
import { ProjectProvider, useProjectContext } from "@/lib/projectContext";
import { NumberInput } from "@/components/fields";
import { ThemeToggle } from "@/components/ThemeToggle";

const FINANCIALS_SUBTABS = [
  { slug: "inputs", label: "Inputs" },
  { slug: "analysis", label: "Analysis" },
  { slug: "math", label: "Math" },
  { slug: "report", label: "Report" },
];

/** Header currency control. The project's stored currency is the source of
 *  truth; the display currency mirrors it. Pressing Convert rewrites every
 *  stored amount into the other currency (rounded, behind a confirm) and flips
 *  the project — the only place a conversion ever happens. */
function CurrencyControls() {
  const { project, setProject } = useProjectContext();
  const { currency, setCurrency, exchangeRate, setExchangeRate } = useCurrency();

  useEffect(() => {
    if (project) setCurrency(project.currency);
  }, [project?.currency, setCurrency]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!project) return null;
  const target = currency === "USD" ? "VND" : "USD";

  function handleConvert() {
    const rate = exchangeRate;
    if (!Number.isFinite(rate) || rate <= 0) {
      window.alert("Set a valid exchange rate first.");
      return;
    }
    const ok = window.confirm(
      `Convert every amount in this project from ${currency} to ${target} at ${rate.toLocaleString("en-US")} ₫/USD? This rewrites the saved values.`,
    );
    if (!ok) return;
    setProject((prev) => convertProjectCurrency(prev, target, rate));
    setCurrency(target);
  }

  return (
    <div className="flex items-center gap-2.5">
      <div className="hidden sm:flex items-center gap-1.5 panel-2 px-3 py-1.5">
        <span className="text-[10px] uppercase tracking-wider text-ink-muted font-bold">1 USD =</span>
        <NumberInput
          value={exchangeRate}
          min={1}
          onChange={(v) => setExchangeRate(v || 25500)}
          ariaLabel="VND per USD exchange rate"
          className="w-20 bg-transparent font-mono text-xs text-right text-ink outline-none"
        />
        <span className="text-[10px] uppercase tracking-wider text-ink-muted font-bold">₫</span>
      </div>
      <div className="flex items-center gap-0.5 p-1 rounded-[13px]" style={{ background: "var(--glass-2)", border: "1px solid var(--border)" }}>
        <span className="px-3 py-1.5 rounded-[10px] text-xs font-bold" style={{ background: "var(--seg-active)", color: "var(--text)", boxShadow: "var(--shadow)" }}>
          {currency}
        </span>
        <button
          onClick={handleConvert}
          title={`Convert all amounts to ${target}`}
          className="px-3 py-1.5 rounded-[10px] text-xs font-bold text-ink-muted hover:text-accent flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeftRight size={13} /> To {target}
        </button>
      </div>
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
  const isDashboard = sub === "";

  const nav = [
    { key: "dashboard", label: "Dashboard", icon: LayoutDashboard, href: base, active: isDashboard },
    { key: "financials", label: "Financials", icon: Calculator, href: `${base}/inputs`, active: inFinancials },
    { key: "jobs", label: "Jobs & Bids", icon: LayoutGrid, href: `${base}/manage`, active: inManage },
    { key: "subs", label: "Subcontractors", icon: Users, href: `/subcontractors`, active: false },
  ];

  const screen = isDashboard
    ? { kicker: "Overview", title: "Dashboard" }
    : inFinancials
      ? { kicker: "Project finance", title: "Financials" }
      : inManage
        ? { kicker: "The hero workspace", title: "Jobs & Bids" }
        : { kicker: "Project", title: project?.name ?? "Project" };

  const initials = (project?.name ?? "Project")
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div className="max-w-[1240px] mx-auto px-4 sm:px-6 py-5 print-root">
      {/* Global top bar */}
      <div className="panel no-print flex items-center justify-between gap-4 px-4 py-2.5 sticky top-3 z-50 mb-5"
        style={{ background: "var(--glass-strong)" }}>
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "linear-gradient(150deg,var(--accent),var(--accent-2))", boxShadow: "0 6px 16px var(--accent-soft)" }}>
            <Building2 size={20} className="text-white" />
          </div>
          <div className="min-w-0">
            <div className="font-extrabold text-[14.5px] tracking-tight whitespace-nowrap">Real Project Manager</div>
            <div className="text-[11px] text-ink-muted font-medium whitespace-nowrap">Warm liquid glass</div>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <CurrencyControls />
          <ThemeToggle />
        </div>
      </div>

      {/* Sidebar + main */}
      <div className="flex gap-4 sm:gap-[18px] items-start">
        <aside className="panel no-print w-[244px] shrink-0 p-[15px] hidden lg:flex flex-col self-stretch" style={{ borderRadius: 26 }}>
          <div className="panel-2 flex items-center gap-3 p-[11px] mb-4">
            <div className="w-9 h-9 rounded-[11px] flex items-center justify-center text-white font-extrabold text-[13px] shrink-0"
              style={{ background: "linear-gradient(150deg,#7A8C5A,#9DAE6E)" }}>
              {initials || "PR"}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-bold text-[13.5px] truncate">{project?.name ?? "Project"}</div>
              <div className="text-[11px] text-ink-muted font-medium">
                {project ? `${project.holdYears}-yr hold · Active` : "Loading…"}
              </div>
            </div>
            <Link href="/" title="All projects" className="text-faint hover:text-accent">
              <ChevronsUpDown size={18} />
            </Link>
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

          <div className="mt-auto">
            <div className="h-px my-3 mx-1.5" style={{ background: "var(--border)" }} />
            <Link href="/" className="flex items-center gap-2.5 px-3 py-2.5 rounded-[14px] text-[13px] font-bold text-ink-muted hover:text-accent transition-colors">
              <ArrowLeft size={19} />
              <span>All projects</span>
            </Link>
          </div>
        </aside>

        <main className="panel flex-1 min-w-0 flex flex-col overflow-hidden self-stretch" style={{ borderRadius: 26 }}>
          <div className="no-print flex items-center justify-between gap-4 px-5 sm:px-6 py-4 border-b" style={{ borderColor: "var(--border)" }}>
            <div className="min-w-0">
              <div className="text-[11px] font-bold tracking-[0.06em] uppercase text-accent">{screen.kicker}</div>
              <div className="text-[22px] font-extrabold tracking-tight mt-0.5 truncate">{screen.title}</div>
            </div>
            <nav className="flex lg:hidden gap-1 p-1 rounded-[13px]" style={{ background: "var(--glass-2)", border: "1px solid var(--border)" }}>
              {nav.map((item) => {
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
