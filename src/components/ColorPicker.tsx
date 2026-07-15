"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { JOB_COLOR_PALETTE } from "@/lib/jobs";
import { useI18n } from "@/lib/i18n";

const POPOVER_W = 184;
const POPOVER_H = 230;

/**
 * A small color swatch that opens a 7×5 palette popover (7 main colors, 5
 * shades each), plus a "no color" option. `value` is a hex string ("" = none).
 *
 * The popover is rendered in a portal on <body> and fixed-positioned next to the
 * swatch. The portal is essential: ancestor panels use `backdrop-filter`, which
 * makes a `position: fixed` child resolve against that filtered ancestor instead
 * of the viewport — which is what made the popover land in random spots.
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
  const { t } = useI18n();
  const btnRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  function toggle() {
    if (pos) {
      setPos(null);
      return;
    }
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    // Open just below-right of the swatch, flipping up / clamping in if it would
    // overflow the viewport.
    let top = r.bottom + 6;
    if (top + POPOVER_H > window.innerHeight) top = Math.max(8, r.top - POPOVER_H - 6);
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
        title={t(title)}
        aria-label={t(title)}
        className="rounded-[5px] shrink-0 hover:scale-110 transition-transform"
        style={{
          width: size,
          height: size,
          border: "1px solid var(--border)",
          background:
            value ||
            "repeating-conic-gradient(rgba(120,86,60,0.22) 0% 25%, transparent 0% 50%) 50% / 8px 8px",
        }}
      />

      {pos &&
        typeof document !== "undefined" &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[140]" onClick={() => setPos(null)} aria-hidden />
            <div
              className="fixed z-[150] p-2.5"
              style={{
                top: pos.top,
                left: pos.left,
                width: POPOVER_W,
                borderRadius: 16,
                background: "var(--glass-strong)",
                backdropFilter: "var(--blur)",
                WebkitBackdropFilter: "var(--blur)",
                border: "1px solid var(--border)",
                borderTopColor: "var(--border-top)",
                boxShadow: "var(--shadow-lg)",
              }}
            >
              <div className="label-mono mb-2">{t(title)}</div>
              <div className="space-y-1">
                {JOB_COLOR_PALETTE.map((row) => (
                  <div key={row.name} className="flex gap-1" title={t(row.name)}>
                    {row.shades.map((hex) => (
                      <button
                        key={hex}
                        type="button"
                        onClick={() => {
                          onChange(hex);
                          setPos(null);
                        }}
                        className="w-6 h-6 rounded-md hover:scale-110 transition-transform"
                        style={{
                          background: hex,
                          outline: value === hex ? "2px solid var(--accent)" : "1px solid var(--border)",
                          outlineOffset: value === hex ? "1px" : "0",
                        }}
                        aria-label={`${t(row.name)} ${hex}`}
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
                className="mt-2 w-full font-mono text-[10px] uppercase tracking-wider rounded-[10px] py-1.5 transition-colors text-ink-muted hover:text-accent"
                style={{ border: "1px solid var(--border)", background: "var(--glass-2)" }}
              >
                {t(emptyLabel)}
              </button>
            </div>
          </>,
          document.body,
        )}
    </>
  );
}

/** Append an alpha hex to a 6-digit hex color for a subtle row tint. */
export function tint(hex: string, alpha = "22"): string | undefined {
  if (!hex || hex.length !== 7) return undefined;
  return hex + alpha;
}
