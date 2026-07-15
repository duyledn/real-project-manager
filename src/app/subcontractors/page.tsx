"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Trash2,
  ChevronDown,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  Building2,
} from "lucide-react";
import { useSubcontractors } from "@/lib/useSubcontractors";
import { useColumnWidths } from "@/lib/useColumnWidths";
import { makeSubcontractorInput } from "@/lib/defaults";
import { subCompliance, initialsOf } from "@/lib/bidStatus";
import { useI18n } from "@/lib/i18n";
import { ResizableTh } from "@/components/ResizableTh";
import type { SubcontractorWithJobs, SubcontractorInput } from "@/lib/types";

export default function SubcontractorsPage() {
  const { subs, loading, error, create, update, remove } = useSubcontractors();
  const { t } = useI18n();
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);

  // Where the user came from (a project) so we can offer a contextual "Back".
  const [fromId, setFromId] = useState<string | null>(null);
  const [fromName, setFromName] = useState<string | null>(null);

  useEffect(() => {
    const from = new URLSearchParams(window.location.search).get("from");
    if (!from) return;
    setFromId(from);
    fetch(`/api/projects/${from}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((p) => p && setFromName(p.name))
      .catch(() => {});
  }, []);

  async function addSub() {
    setCreating(true);
    try {
      const created = await create({ ...makeSubcontractorInput(), companyName: "New Subcontractor" });
      // Focus the new row's name field so the user can keep typing / Enter again.
      setFocusId(created.id);
    } finally {
      setCreating(false);
    }
  }

  const compliantCount = subs.filter((s) => subCompliance(s).ok).length;

  const { widths, startResize } = useColumnWidths("subs", { company: 220, rep: 176, phone: 160, email: 224, comp: 176 });
  const subsTableWidth = 36 + widths.company + widths.rep + widths.phone + widths.email + widths.comp + 64 + 40;

  return (
    <main className="max-w-6xl mx-auto px-5 py-8">
      {/* Back navigation */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <Link href="/" className="btn gap-1.5">
          <ArrowLeft size={14} /> {t("All projects")}
        </Link>
        {fromId && (
          <Link href={`/projects/${fromId}`} className="btn gap-1.5">
            <Building2 size={14} /> {t("Back to {name}", { name: fromName || t("project") })}
          </Link>
        )}
      </div>

      <header className="panel mb-6 p-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold tracking-[0.06em] uppercase text-accent mb-2">
            {t("Shared across every project")}
          </div>
          <h1 className="font-display font-extrabold text-4xl leading-none">{t("Subcontractor Database")}</h1>
          <p className="text-ink-muted text-sm mt-2 max-w-lg">
            {t("Everyone you work with, in one spreadsheet — phone, representative, and compliance at a glance. Their info auto-fills bid-request emails and links to every job they're engaged on.")}
          </p>
        </div>
        <div className="flex flex-col items-end gap-3 shrink-0">
          <button onClick={addSub} disabled={creating} className="btn btn-blue flex items-center gap-2">
            <Plus size={15} /> {creating ? t("Adding…") : t("Add subcontractor")}
          </button>
          {subs.length > 0 && (
            <div className="text-[11.5px] text-ink-muted">
              <span className="font-bold text-green">{compliantCount}</span> {t("of {total} fully compliant", { total: subs.length })}
            </div>
          )}
        </div>
      </header>

      {error && <div className="panel border-red text-red p-4 mb-6 text-sm">{t(error)}</div>}

      {loading ? (
        <div className="text-ink-muted text-sm">{t("Loading…")}</div>
      ) : subs.length === 0 ? (
        <div className="panel p-10 text-center text-ink-muted">
          {t("No subcontractors yet. Add your first to start building bids.")}
        </div>
      ) : (
        <div className="panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="border-collapse text-sm" style={{ tableLayout: "fixed", width: subsTableWidth }}>
              <colgroup>
                <col style={{ width: 36 }} />
                <col style={{ width: widths.company }} />
                <col style={{ width: widths.rep }} />
                <col style={{ width: widths.phone }} />
                <col style={{ width: widths.email }} />
                <col style={{ width: widths.comp }} />
                <col style={{ width: 64 }} />
                <col style={{ width: 40 }} />
              </colgroup>
              <thead>
                <tr className="border-b-[1.5px] border-ink">
                  <th />
                  <ResizableTh label={t("Company")} col="company" startResize={startResize} />
                  <ResizableTh label={t("Representative")} col="rep" startResize={startResize} />
                  <ResizableTh label={t("Phone")} col="phone" startResize={startResize} />
                  <ResizableTh label={t("Email")} col="email" startResize={startResize} />
                  <ResizableTh label={t("Compliance")} col="comp" startResize={startResize} />
                  <th className="text-center label-mono p-2.5">{t("Jobs")}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {subs.map((s) => (
                  <SubRow
                    key={s.id}
                    sub={s}
                    open={openId === s.id}
                    onToggle={() => setOpenId((id) => (id === s.id ? null : s.id))}
                    onSave={update}
                    onRemove={remove}
                    onAddRow={addSub}
                    focusId={focusId}
                    onFocused={() => setFocusId(null)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  );
}

function SubRow({
  sub,
  open,
  onToggle,
  onSave,
  onRemove,
  onAddRow,
  focusId,
  onFocused,
}: {
  sub: SubcontractorWithJobs;
  open: boolean;
  onToggle: () => void;
  onSave: (id: string, input: SubcontractorInput) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
  onAddRow: () => void;
  focusId: string | null;
  onFocused: () => void;
}) {
  const { t } = useI18n();
  const [form, setForm] = useState<SubcontractorInput>(toInput(sub));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setForm(toInput(sub));
  }, [sub]);

  // When this row is the freshly-added one, focus + select its name field.
  useEffect(() => {
    if (focusId === sub.id && nameRef.current) {
      nameRef.current.focus();
      nameRef.current.select();
      onFocused();
    }
  }, [focusId, sub.id, onFocused]);

  function patch(field: keyof SubcontractorInput, value: string) {
    const next = { ...form, [field]: value };
    setForm(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void onSave(sub.id, next), 600);
  }

  const comp = subCompliance({ ...sub, ...form } as SubcontractorWithJobs);

  return (
    <>
      <tr
        className="border-b border-hair transition-colors hover:bg-[var(--glass-2)]"
        style={{ background: open ? "var(--glass-2)" : undefined }}
      >
        <td className="p-1.5 text-center">
          <button onClick={onToggle} className="icon-btn" aria-label={t("Toggle details")}>
            <ChevronDown size={15} className={`transition-transform ${open ? "" : "-rotate-90"}`} />
          </button>
        </td>
        <td className="p-1.5">
          <div className="flex items-center gap-2.5">
            <div
              className="w-12 h-12 rounded-[14px] flex items-center justify-center text-[13px] font-extrabold text-accent shrink-0"
              style={{ background: "var(--accent-soft)", border: "1px solid var(--border)" }}
            >
              {initialsOf(form.companyName || "?")}
            </div>
            <input
              ref={nameRef}
              value={form.companyName}
              onChange={(e) => patch("companyName", e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onAddRow();
                }
              }}
              placeholder={t("Company name")}
              className="cell-input font-semibold"
            />
          </div>
        </td>
        <td className="p-1.5">
          <input value={form.representativeName} onChange={(e) => patch("representativeName", e.target.value)} placeholder={t("Contact name")} className="cell-input" />
        </td>
        <td className="p-1.5">
          <input value={form.phone} onChange={(e) => patch("phone", e.target.value)} placeholder="(555) 555-5555" className="cell-input font-mono text-[12.5px]" />
        </td>
        <td className="p-1.5">
          <input value={form.email} onChange={(e) => patch("email", e.target.value)} placeholder="name@company.com" className="cell-input text-[12.5px]" />
        </td>
        <td className="p-2.5">
          <ComplianceBadge ok={comp.ok} missing={comp.missing} />
        </td>
        <td className="p-2.5 text-center">
          {sub.relatedJobs.length > 0 ? (
            <span className="pill" style={{ color: "var(--accent)", background: "var(--accent-soft)" }}>{sub.relatedJobs.length}</span>
          ) : (
            <span className="text-faint">—</span>
          )}
        </td>
        <td className="p-1.5 text-center">
          <button onClick={() => onRemove(sub.id)} className="icon-btn" aria-label={t("Delete subcontractor")}>
            <Trash2 size={13} />
          </button>
        </td>
      </tr>

      {open && (
        <tr style={{ background: "var(--glass-2)" }}>
          <td />
          <td colSpan={7} className="px-4 pb-5 pt-1">
            <div
              className="rounded-[18px] p-4"
              style={{ background: "var(--surface-solid)", border: "1px solid var(--border)", boxShadow: "var(--shadow)" }}
            >
            <div className="grid sm:grid-cols-3 gap-4 mb-4">
              <DetailField label={t("Worker's Comp")} value={form.workersComp} onChange={(v) => patch("workersComp", v)} placeholder={t("Link or expiry date")} ok={!!form.workersComp.trim()} />
                  <DetailField label={t("W-9")} value={form.w9} onChange={(v) => patch("w9", v)} placeholder={t("Link or status")} ok={!!form.w9.trim()} />
              <DetailField label={t("Business License")} value={form.businessLicense} onChange={(v) => patch("businessLicense", v)} placeholder={t("Link or number")} ok={!!form.businessLicense.trim()} />
            </div>
            <div className="label-mono mb-2">{t("Related jobs")}</div>
            {sub.relatedJobs.length === 0 ? (
              <p className="text-sm text-ink-muted">{t("Not assigned to any project jobs yet.")}</p>
            ) : (
              <div className="rounded-[14px] overflow-hidden" style={{ border: "1px solid var(--border)" }}>
                {sub.relatedJobs.map((j, i) => (
                  <Link
                    key={i}
                    href={`/projects/${j.projectId}/manage`}
                    className="flex items-center justify-between px-3.5 py-2.5 transition-colors hover:bg-[var(--accent-soft)] border-b border-hair last:border-0 group"
                  >
                    <span className="text-sm">
                      <span className="font-semibold">{j.projectName}</span>
                      <span className="text-ink-muted"> · {j.jobCategory}</span>
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="text-[11px] text-ink-muted font-medium">{t(j.status)}</span>
                      <ExternalLink size={13} className="text-ink-muted opacity-0 group-hover:opacity-100" />
                    </span>
                  </Link>
                ))}
              </div>
            )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function ComplianceBadge({ ok, missing }: { ok: boolean; missing: string[] }) {
  const { t } = useI18n();
  if (ok) {
    return (
      <span className="pill" style={{ color: "var(--pos)", background: "rgba(90,161,94,0.16)" }}>
        <ShieldCheck size={13} /> {t("Compliant")}
      </span>
    );
  }
  return (
    <span className="pill" title={t("Missing {docs}", { docs: missing.map((doc) => t(doc)).join(", ") })} style={{ color: "var(--warn)", background: "rgba(201,138,46,0.16)" }}>
      <ShieldAlert size={13} /> {t("Missing {n}", { n: missing.length })}
    </span>
  );
}

function DetailField({
  label,
  value,
  onChange,
  placeholder,
  ok,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  ok: boolean;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="label-mono flex items-center gap-1.5">
        {label}
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: ok ? "var(--pos)" : "var(--warn)" }} />
      </span>
      <input value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className="field-input" />
    </label>
  );
}

function toInput(s: SubcontractorWithJobs): SubcontractorInput {
  return {
    companyName: s.companyName,
    representativeName: s.representativeName,
    phone: s.phone,
    email: s.email,
    workersComp: s.workersComp,
    w9: s.w9,
    businessLicense: s.businessLicense,
  };
}
