"use client";

import { useRef, useState } from "react";
import { JOB_COLOR_PALETTE } from "@/lib/jobs";

const POPOVER_W = 184;
const POPOVER_H = 230;

/**
 * A small color swatch that opens a 7×5 palette popover (7 main colors, 5
 * shades each), plus a "no color" option. `value` is a hex string ("" = none).
 * The popover is fixed-positioned so it escapes scrollable table containers.
 */
export function ColorPicker({
  value,
  onChange,
  size = 16,
  title = "Color",
  emptyLabel = "No color",
}: {
  value: string;
  onChange: (hex: string) => void;
  size?: number;
  title?: string;
  emptyLabel?: string;
}) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  function toggle() {
    if (pos) {
      setPos(null);
      return;
    }
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    let top = r.bottom + 4;
    if (top + POPOVER_H > window.innerHeight) top = Math.max(8, r.top - POPOVER_H - 4);
    let left = r.left;
    if (left + POPOVER_W > window.innerWidth) left = window.innerWidth - POPOVER_W - 8;
    setPos({ top, left });
  }

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        title={title}
        aria-label={title}
        className="rounded-sm border border-hair shrink-0 hover:scale-110 transition-transform"
        style={{
          width: size,
          height: size,
          background:
            value ||
            "repeating-conic-gradient(rgba(26,35,50,0.18) 0% 25%, transparent 0% 50%) 50% / 8px 8px",
        }}
      />

      {pos && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setPos(null)} aria-hidden />
          <div
            className="fixed z-50 bg-panel border-[1.5px] border-ink shadow-xl p-2.5"
            style={{ top: pos.top, left: pos.left, width: POPOVER_W }}
          >
            <div className="label-mono mb-2">{title}</div>
            <div className="space-y-1">
              {JOB_COLOR_PALETTE.map((row) => (
                <div key={row.name} className="flex gap-1" title={row.name}>
                  {row.shades.map((hex) => (
                    <button
                      key={hex}
                      type="button"
                      onClick={() => {
                        onChange(hex);
                        setPos(null);
                      }}
                      className="w-6 h-6 rounded-sm hover:scale-110 transition-transform"
                      style={{
                        background: hex,
                        outline: value === hex ? "2px solid #1A2332" : "1px solid rgba(26,35,50,0.18)",
                        outlineOffset: value === hex ? "1px" : "0",
                      }}
                      aria-label={`${row.name} ${hex}`}
                    />
                  ))}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                onChange("");
                setPos(null);
              }}
              className="mt-2 w-full font-mono text-[10px] uppercase tracking-wider border border-hair py-1 hover:bg-paper transition-colors"
            >
              {emptyLabel}
            </button>
          </div>
        </>
      )}
    </>
  );
}

/** Append an alpha hex to a 6-digit hex color for a subtle row tint. */
export function tint(hex: string, alpha = "22"): string | undefined {
  if (!hex || hex.length !== 7) return undefined;
  return hex + alpha;
}
