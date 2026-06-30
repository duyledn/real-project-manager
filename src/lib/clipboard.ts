/**
 * Copy a 2D array of cells to the clipboard as TSV (tab-separated, CRLF rows) —
 * the format Excel and Google Sheets paste into cleanly. Numbers are emitted
 * without thousands separators so spreadsheets parse them as numbers.
 */
export function downloadCsv(filename: string, rows: (string | number)[][]): void {
  const esc = (cell: string | number) => {
    const s = String(cell ?? "");
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = rows.map((r) => r.map(esc).join(",")).join("\r\n");
  // Prepend a BOM so Excel opens UTF-8 correctly.
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function copyRowsAsTSV(rows: (string | number)[][]): Promise<boolean> {
  const tsv = rows
    .map((r) => r.map((cell) => String(cell ?? "")).join("\t"))
    .join("\r\n");
  try {
    await navigator.clipboard.writeText(tsv);
    return true;
  } catch {
    // Fallback for older browsers / insecure contexts.
    try {
      const ta = document.createElement("textarea");
      ta.value = tsv;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}
