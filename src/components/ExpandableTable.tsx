"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Maximize2, X } from "lucide-react";
import { createPortal } from "react-dom";

import { useI18n } from "@/lib/i18n";

type ExpandableTableProps = {
  children: ReactNode;
  label: string;
  className?: string;
  viewportClassName?: string;
};

/**
 * Keeps one table subtree mounted at a time. Opening the overlay moves the
 * render into a portal while all controlled values and edit callbacks continue
 * to use the same parent state as the inline view.
 */
export function ExpandableTable({
  children,
  label,
  className = "",
  viewportClassName = "",
}: ExpandableTableProps) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!expanded) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setExpanded(false);
    };
    document.addEventListener("keydown", onKeyDown);
    const frame = requestAnimationFrame(() => closeRef.current?.focus());

    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      requestAnimationFrame(() => triggerRef.current?.focus());
    };
  }, [expanded]);

  const viewport = (
    <div
      className={`expandable-table__viewport ${expanded ? "expandable-table__viewport--expanded" : ""} ${viewportClassName}`}
    >
      {children}
    </div>
  );

  if (expanded && typeof document !== "undefined") {
    return createPortal(
      <div className="expandable-table__overlay" role="dialog" aria-modal="true" aria-label={label}>
        <button
          type="button"
          className="expandable-table__backdrop"
          onClick={() => setExpanded(false)}
          aria-label={t("Close")}
        />
        <section className="expandable-table__dialog glass-dialog">
          <header className="expandable-table__header">
            <h2 className="min-w-0 truncate font-display text-lg font-extrabold">{label}</h2>
            <button
              ref={closeRef}
              type="button"
              className="icon-btn shrink-0"
              onClick={() => setExpanded(false)}
              aria-label={t("Close")}
              title={t("Close")}
            >
              <X size={17} />
            </button>
          </header>
          {viewport}
        </section>
      </div>,
      document.body,
    );
  }

  return (
    <div className={`expandable-table ${className}`}>
      <div className="expandable-table__toolbar no-print">
        <button
          ref={triggerRef}
          type="button"
          className="icon-btn"
          onClick={() => setExpanded(true)}
          aria-label={t("Expand")}
          title={t("Expand")}
        >
          <Maximize2 size={16} />
        </button>
      </div>
      {viewport}
    </div>
  );
}
