"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type ColumnWidths = Record<string, number>;

const MIN_W = 56;
const EVENT = "re-colwidths";
const lsKey = (key: string) => `re_colw_${key}`;

/**
 * Resizable column widths for a table, persisted to localStorage and synced
 * live across every table that shares the same `key` (e.g. the grouped-view
 * sub-tables). Render the returned widths into a <colgroup>, and wire
 * `startResize(col, e)` to a grip on each header's right edge.
 *
 * SSR-safe: first render always uses `defaults` (matching the server), then the
 * stored widths load in an effect — so there's no hydration mismatch.
 */
export function useColumnWidths(key: string, defaults: ColumnWidths) {
  const [widths, setWidths] = useState<ColumnWidths>(defaults);
  const drag = useRef<{ col: string; startX: number; startW: number } | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(lsKey(key));
      if (raw) setWidths((w) => ({ ...w, ...JSON.parse(raw) }));
    } catch {
      /* ignore */
    }
    const onSync = (e: Event) => {
      const d = (e as CustomEvent).detail as { key: string; widths: ColumnWidths };
      if (d.key === key) setWidths(d.widths);
    };
    window.addEventListener(EVENT, onSync);
    return () => window.removeEventListener(EVENT, onSync);
  }, [key]);

  const commit = useCallback(
    (next: ColumnWidths) => {
      setWidths(next);
      try {
        localStorage.setItem(lsKey(key), JSON.stringify(next));
      } catch {
        /* ignore */
      }
      window.dispatchEvent(new CustomEvent(EVENT, { detail: { key, widths: next } }));
    },
    [key],
  );

  const startResize = useCallback(
    (col: string, e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      drag.current = { col, startX: e.clientX, startW: widths[col] ?? MIN_W };

      const onMove = (ev: PointerEvent) => {
        const d = drag.current;
        if (!d) return;
        const w = Math.max(MIN_W, Math.round(d.startW + (ev.clientX - d.startX)));
        commit({ ...widths, [d.col]: w });
      };
      const onUp = () => {
        drag.current = null;
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [widths, commit],
  );

  return { widths, startResize };
}
