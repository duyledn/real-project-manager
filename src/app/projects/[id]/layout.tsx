"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, ArrowLeftRight } from "lucide-react";
import { use, useEffect } from "react";
import { useCurrency, convertProjectCurrency } from "@/lib/currency";
import { ProjectProvider, useProjectContext } from "@/lib/projectContext";
import { NumberInput } from "@/components/fields";

const PHASES = [
  {
    label: "Phase 1 — Preparations & Calculation",
    tabs: [
      { slug: "", label: "Inputs" },
      { slug: "analysis", label: "Analysis" },
      { slug: "math", label: "Math Check" },
      { slug: "report", label: "Report" },
    ],
  },
  {
    label: "Phase 2 — Project Management",
    tabs: [{ slug: "manage", label: "Manage" }],
  },
];

/** Header currency control. The project's stored currency is the source of
 *  truth; the display currency just mirrors it. Pressing Convert rewrites every
 *  stored amount into the other currency (rounded) and flips the project — the
 *  only place a conversion ever happens. */
function CurrencyControls() {
  const { project, setProject } = useProjectContext();
  const { currency, setCurrency, exchangeRate, setExchangeRate } = useCurrency();

  // Keep the display currency in sync with whatever project is open.
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
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1.5 panel px-3 py-1.5">
        <span className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">1 USD =</span>
        <NumberInput
          value={exchangeRate}
          min={1}
          onChange={(v) => setExchangeRate(v || 25500)}
          ariaLabel="VND per USD exchange rate"
          className="w-24 bg-transparent font-mono text-xs text-right text-ink outline-none"
        />
        <span className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">VND</span>
      </div>
      <div className="flex items-center border-[1.5px] border-ink overflow-hidden">
        <span className="font-mono text-xs uppercase tracking-wider px-3 py-1.5 bg-ink text-panel">
          {currency}
        </span>
        <button
          onClick={handleConvert}
          title={`Convert all amounts to ${target}`}
          className="font-mono text-xs uppercase tracking-wider px-3 py-1.5 text-ink hover:bg-paper flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeftRight size={12} /> To {target}
        </button>
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
  const pathname = usePathname();
  const base = `/projects/${id}`;

  return (
    <ProjectProvider id={id}>
      <div className="max-w-5xl mx-auto px-5 py-8 print-root">
        <div className="flex items-center justify-between mb-5 gap-4 flex-wrap no-print">
          <Link href="/" className="font-mono text-xs uppercase tracking-wider text-ink-muted hover:text-blueprint flex items-center gap-1.5">
            <ArrowLeft size={14} /> All projects
          </Link>

          <CurrencyControls />
        </div>

        <div className="mb-7 no-print space-y-2.5">
          {PHASES.map((phase) => (
            <div key={phase.label}>
              <div className="label-mono mb-1.5">{phase.label}</div>
              <nav className="flex border-[1.5px] border-ink panel overflow-hidden">
                {phase.tabs.map((tab) => {
                  const href = tab.slug ? `${base}/${tab.slug}` : base;
                  const active = pathname === href;
                  return (
                    <Link
                      key={tab.slug}
                      href={href}
                      className={`flex-1 text-center font-mono text-xs uppercase tracking-wider py-3 border-r-[1.5px] border-ink last:border-r-0 transition-colors ${
                        active ? "bg-ink text-panel" : "text-ink hover:bg-paper"
                      }`}
                    >
                      {tab.label}
                    </Link>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>

        {children}
      </div>
    </ProjectProvider>
  );
}
