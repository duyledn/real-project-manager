"use client";

import type { LucideIcon } from "lucide-react";

type MetricCardProps = {
  color: string;
  icon: LucideIcon;
  value: string;
  label: string;
  note: string;
};

export function MetricCard({ color, icon: Icon, value, label, note }: MetricCardProps) {
  return (
    <div
      style={{
        background: `linear-gradient(155deg, ${color}1F, var(--glass-2) 62%)`,
        border: "1px solid var(--border)",
        borderTopColor: "var(--border-top)",
        borderRadius: 18,
        padding: 16,
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <div
          className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px]"
          style={{ background: `${color}26`, color }}
        >
          <Icon size={18} />
        </div>
        <span
          className="rounded-full px-2 py-[3px] text-[10.5px] font-bold"
          style={{ color, background: `${color}1C` }}
        >
          {note}
        </span>
      </div>
      <div className="mt-[10px] truncate font-mono text-[23px] font-extrabold tracking-tight">{value}</div>
      <div className="mt-0.5 text-[12.5px] font-medium text-ink-muted">{label}</div>
    </div>
  );
}
