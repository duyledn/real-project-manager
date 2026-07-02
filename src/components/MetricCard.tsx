"use client";

import type { LucideIcon } from "lucide-react";

type MetricCardProps = {
  color: string;
  icon: LucideIcon;
  value: string;
  label: string;
  note: string;
  bars: number[];
};

export function MetricCard({ color, icon: Icon, value, label, note, bars }: MetricCardProps) {
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
      <div className="mt-[10px] flex h-[30px] items-end gap-[3px]">
        {bars.slice(0, 7).map((v, i) => {
          const clamped = Math.max(0, Math.min(1, v));
          return (
            <div
              key={`${label}-${i}`}
              style={{
                width: 5,
                height: 5 + Math.round(clamped * 24),
                background: color,
                borderRadius: "2px 2px 0 0",
                opacity: 0.38 + clamped * 0.62,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
