"use client";

import { Building2 } from "lucide-react";

/** Centered glass card used by the login / signup / recover screens. */
export function AuthFrame({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <main className="min-h-screen flex items-center justify-center px-5 py-10">
      <div className="w-[400px] max-w-full">
        <div className="flex items-center gap-3 mb-6 justify-center">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(150deg,var(--accent),var(--accent-2))", boxShadow: "0 6px 16px var(--accent-soft)" }}>
            <Building2 size={22} className="text-white" />
          </div>
          <div className="font-extrabold text-lg tracking-tight">Real Project Manager</div>
        </div>
        <div className="panel p-6">
          <h1 className="font-display font-extrabold text-2xl leading-none">{title}</h1>
          <p className="text-ink-muted text-sm mt-1.5 mb-5">{subtitle}</p>
          {children}
        </div>
      </div>
    </main>
  );
}

export function Field({
  label,
  value,
  onChange,
  type = "text",
  autoFocus,
  placeholder,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoFocus?: boolean;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="label-mono">{label}</span>
      <input
        type={type}
        value={value}
        autoFocus={autoFocus}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="field-input text-base"
      />
      {hint && <span className="text-[11px] text-ink-muted leading-tight">{hint}</span>}
    </label>
  );
}
