"use client";

/** A table header cell with a drag-to-resize grip on its right edge. Pair with
 *  `useColumnWidths` + a <colgroup> of <col> elements keyed by the same `col`. */
export function ResizableTh({
  label,
  col,
  startResize,
  align = "left",
  className = "",
  style,
}: {
  label: React.ReactNode;
  col: string;
  startResize: (col: string, e: React.PointerEvent) => void;
  align?: "left" | "right" | "center";
  className?: string;
  /** Merged over the defaults — e.g. to make the header sticky. `position` is
   *  forced to a positioned value so the resize grip anchors correctly. */
  style?: React.CSSProperties;
}) {
  const alignClass = align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
  return (
    <th className={`label-mono p-2.5 ${alignClass} ${className}`} style={{ position: "relative", ...style }}>
      {label}
      <span
        className="col-grip"
        onPointerDown={(e) => startResize(col, e)}
        role="separator"
        aria-orientation="vertical"
        aria-label={typeof label === "string" ? `Resize ${label} column` : "Resize column"}
      />
    </th>
  );
}
