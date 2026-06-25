"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { use } from "react";
import { useCurrency, type Currency } from "@/lib/currency";
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
  const { currency, setCurrency, exchangeRate, setExchangeRate } = useCurrency();

  return (
    <div className="max-w-5xl mx-auto px-5 py-8 print-root">
      <div className="flex items-center justify-between mb-5 gap-4 flex-wrap no-print">
        <Link href="/" className="font-mono text-xs uppercase tracking-wider text-ink-muted hover:text-blueprint flex items-center gap-1.5">
          <ArrowLeft size={14} /> All projects
        </Link>

        {/* Currency switcher */}
        <div className="flex items-center gap-3">
          <div className="flex border-[1.5px] border-ink overflow-hidden">
            {(["USD", "VND"] as Currency[]).map((c) => (
              <button
                key={c}
                onClick={() => setCurrency(c)}
                className={`font-mono text-xs uppercase tracking-wider px-3 py-1.5 border-r-[1.5px] border-ink last:border-r-0 transition-colors ${
                  currency === c ? "bg-ink text-panel" : "text-ink hover:bg-paper"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
          {currency === "VND" && (
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
          )}
        </div>
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
  );
}
