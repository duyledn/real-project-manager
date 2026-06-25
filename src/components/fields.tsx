"use client";

import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import { Check, Loader2, AlertCircle, GripVertical } from "lucide-react";
import type { DragHandleProps } from "@/lib/useDragReorder";
import { useCurrency } from "@/lib/currency";

// --- Number input with thousands separators --------------------------------

/** Keep only digits, one decimal point, and an optional leading minus sign. */
function sanitizeNumeric(raw: string): string {
  let s = raw.replace(/[^0-9.\-]/g, "");
  const neg = s.startsWith("-");
  s = s.replace(/-/g, "");
  const firstDot = s.indexOf(".");
  if (firstDot !== -1) {
    s = s.slice(0, firstDot + 1) + s.slice(firstDot + 1).replace(/\./g, "");
  }
  return (neg ? "-" : "") + s;
}

/** Format a sanitized numeric string with thousands separators, preserving a
 *  trailing decimal the user is still typing (e.g. "1234." -> "1,234."). */
function formatNumeric(s: string): string {
  if (s === "" || s === "-") return s;
  let sign = "";
  if (s.startsWith("-")) {
    sign = "-";
    s = s.slice(1);
  }
  const dot = s.indexOf(".");
  let intPart = dot === -1 ? s : s.slice(0, dot);
  const decPart = dot === -1 ? "" : s.slice(dot);
  intPart = intPart.replace(/^0+(?=\d)/, ""); // drop leading zeros, keep a lone 0
  if (intPart === "") intPart = "0";
  const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return sign + withCommas + decPart;
}

function parseNumeric(s: string): number {
  const n = parseFloat(s.replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function fmtFull(n: number): string {
  if (!Number.isFinite(n)) return "";
  return n.toLocaleString("en-US", { maximumFractionDigits: 20 });
}

function countDigits(s: string): number {
  return (s.match(/\d/g) || []).length;
}

/** Caret index in `formatted` positioned right after the n-th digit. */
function caretAfterDigits(formatted: string, n: number): number {
  if (n <= 0) return 0;
  let count = 0;
  for (let i = 0; i < formatted.length; i++) {
    if (/\d/.test(formatted[i])) {
      count++;
      if (count === n) return i + 1;
    }
  }
  return formatted.length;
}

/**
 * A text input that shows numbers with thousands separators (1,234,567) while
 * keeping a real number model. Emits the parsed number via onChange. Restores
 * the caret position across reformatting so typing feels natural.
 */
export function NumberInput({
  value,
  onChange,
  min,
  className,
  placeholder,
  ariaLabel,
  onKeyDown,
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  className?: string;
  placeholder?: string;
  ariaLabel?: string;
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [text, setText] = useState(() => fmtFull(value));

  // Re-sync when the external value changes to something the draft doesn't match
  // (e.g. programmatic updates), but leave the user's in-progress text alone.
  useEffect(() => {
    if (parseNumeric(text) !== value) setText(fmtFull(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const input = e.target;
    const raw = input.value;
    const caret = input.selectionStart ?? raw.length;
    const digitsBeforeCaret = countDigits(raw.slice(0, caret));

    const sanitized = sanitizeNumeric(raw);
    const formatted = formatNumeric(sanitized);
    let next = parseNumeric(sanitized);
    if (min != null && next < min) next = min;

    setText(formatted);
    onChange(next);

    // Restore caret after React paints the reformatted value.
    requestAnimationFrame(() => {
      if (!ref.current) return;
      const pos = caretAfterDigits(formatted, digitsBeforeCaret);
      ref.current.setSelectionRange(pos, pos);
    });
  }

  return (
    <input
      ref={ref}
      type="text"
      inputMode="decimal"
      value={text}
      placeholder={placeholder}
      aria-label={ariaLabel}
      onChange={handleChange}
      onKeyDown={onKeyDown}
      onBlur={() => setText(fmtFull(value))}
      className={className}
    />
  );
}

/** Symbol for the active currency. */
export function currencySymbol(currency: "USD" | "VND"): string {
  return currency === "VND" ? "₫" : "$";
}

/**
 * A money input. The value is stored verbatim in the project's active currency
 * — no exchange-rate conversion happens here. Switching currency is done only
 * via the Convert button, which rewrites the stored amounts in one pass.
 */
export function MoneyInput({
  value,
  onChange,
  min,
  className,
  onKeyDown,
  ariaLabel,
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  className?: string;
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void;
  ariaLabel?: string;
}) {
  return (
    <NumberInput
      value={value}
      min={min}
      ariaLabel={ariaLabel}
      className={className}
      onKeyDown={onKeyDown}
      onChange={onChange}
    />
  );
}

/** A small grip icon that arms drag-reordering for a row. Spread the row's
 *  `handleProps` from useDragReorder onto it. */
export function DragHandle({ handleProps }: { handleProps: DragHandleProps }) {
  return (
    <span
      {...handleProps}
      title="Drag to reorder"
      aria-label="Drag to reorder"
      className="cursor-grab active:cursor-grabbing text-ink-muted hover:text-ink inline-flex items-center justify-center select-none"
    >
      <GripVertical size={14} />
    </span>
  );
}

export function SaveIndicator({ state }: { state: "idle" | "saving" | "saved" | "error" }) {
  if (state === "idle") return null;
  const map = {
    saving: { icon: <Loader2 size={12} className="animate-spin" />, text: "Saving…", cls: "text-ink-muted" },
    saved: { icon: <Check size={12} />, text: "Saved", cls: "text-green" },
    error: { icon: <AlertCircle size={12} />, text: "Save failed", cls: "text-red" },
  } as const;
  const m = map[state];
  return (
    <span className={`font-mono text-[11px] uppercase tracking-wider flex items-center gap-1.5 ${m.cls}`}>
      {m.icon} {m.text}
    </span>
  );
}

interface NumberFieldProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  prefix?: string;
  suffix?: string;
  step?: number;
  min?: number;
  hint?: string;
}

export function NumberField({ label, value, onChange, prefix, suffix, min, hint }: NumberFieldProps) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="label-mono">{label}</span>
      <span className="flex items-baseline gap-1 border-b-[1.5px] border-hair focus-within:border-blueprint pb-1.5 transition-colors">
        {prefix && <span className="font-mono text-ink-muted text-sm">{prefix}</span>}
        <NumberInput
          value={value}
          onChange={onChange}
          min={min}
          ariaLabel={label}
          className="w-full bg-transparent font-mono text-base font-semibold text-ink outline-none"
        />
        {suffix && <span className="font-mono text-ink-muted text-sm">{suffix}</span>}
      </span>
      {hint && <span className="text-[11px] text-ink-muted leading-tight">{hint}</span>}
    </label>
  );
}

/** A labeled money field. The symbol follows the active currency (USD/VND) and
 *  the entered value is stored verbatim in that currency (no live conversion). */
export function MoneyField({ label, value, onChange, min, hint }: { label: string; value: number; onChange: (v: number) => void; min?: number; hint?: string }) {
  const { currency } = useCurrency();
  return (
    <label className="flex flex-col gap-1.5">
      <span className="label-mono">{label}</span>
      <span className="flex items-baseline gap-1 border-b-[1.5px] border-hair focus-within:border-blueprint pb-1.5 transition-colors">
        <span className="font-mono text-ink-muted text-sm">{currencySymbol(currency)}</span>
        <MoneyInput
          value={value}
          onChange={onChange}
          min={min}
          ariaLabel={label}
          className="w-full bg-transparent font-mono text-base font-semibold text-ink outline-none"
        />
      </span>
      {hint && <span className="text-[11px] text-ink-muted leading-tight">{hint}</span>}
    </label>
  );
}

interface TextFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  hint?: string;
}

export function TextField({ label, value, onChange, placeholder, type = "text", hint }: TextFieldProps) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="label-mono">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="field-input text-base font-semibold"
      />
      {hint && <span className="text-[11px] text-ink-muted leading-tight">{hint}</span>}
    </label>
  );
}

export function DateField({ label, value, onChange, hint }: { label: string; value: string; onChange: (v: string) => void; hint?: string }) {
  return <TextField label={label} value={value} onChange={onChange} type="date" hint={hint} />;
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  hint?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="label-mono">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="field-input text-base font-semibold">
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {hint && <span className="text-[11px] text-ink-muted leading-tight">{hint}</span>}
    </label>
  );
}

export function ToggleField({
  label,
  value,
  onChange,
  trueLabel = "Yes",
  falseLabel = "No",
  hint,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  trueLabel?: string;
  falseLabel?: string;
  hint?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="label-mono">{label}</span>
      <span className="flex border-[1.5px] border-hair">
        <button
          type="button"
          onClick={() => onChange(true)}
          className={`flex-1 font-mono text-xs uppercase py-1.5 transition-colors ${value ? "bg-blueprint text-panel" : "text-ink-muted hover:bg-paper"}`}
        >
          {trueLabel}
        </button>
        <button
          type="button"
          onClick={() => onChange(false)}
          className={`flex-1 font-mono text-xs uppercase py-1.5 transition-colors ${!value ? "bg-blueprint text-panel" : "text-ink-muted hover:bg-paper"}`}
        >
          {falseLabel}
        </button>
      </span>
      {hint && <span className="text-[11px] text-ink-muted leading-tight">{hint}</span>}
    </label>
  );
}

export function SectionHeader({ num, title, caption }: { num: string; title: string; caption?: string }) {
  return (
    <div className="flex gap-3.5 mb-4 items-start">
      <span className="font-display font-extrabold text-3xl leading-none text-blueprint min-w-[42px]">{num}</span>
      <div>
        <h2 className="font-display font-bold text-xl uppercase tracking-wide leading-tight">{title}</h2>
        {caption && <p className="text-sm text-ink-muted mt-1 max-w-xl">{caption}</p>}
      </div>
    </div>
  );
}
