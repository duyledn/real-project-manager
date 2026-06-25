"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, ChevronDown, ExternalLink } from "lucide-react";
import { useSubcontractors } from "@/lib/useSubcontractors";
import { makeSubcontractorInput } from "@/lib/defaults";
import type { SubcontractorWithJobs, SubcontractorInput } from "@/lib/types";

export default function SubcontractorsPage() {
  const { subs, loading, error, create, update, remove } = useSubcontractors();
  const [creating, setCreating] = useState(false);

  async function addSub() {
    setCreating(true);
    try {
      await create({ ...makeSubcontractorInput(), companyName: "New Subcontractor" });
    } finally {
      setCreating(false);
    }
  }

  return (
    <main className="max-w-5xl mx-auto px-5 py-10">
      <div className="flex items-center justify-between mb-5 gap-4 flex-wrap">
        <Link href="/" className="font-mono text-xs uppercase tracking-wider text-ink-muted hover:text-blueprint flex items-center gap-1.5">
          <ArrowLeft size={14} /> All projects
        </Link>
      </div>

      <header className="panel mb-7 p-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="font-mono text-[11px] tracking-widest text-blueprint uppercase mb-2">
            Shared across every project
          </div>
          <h1 className="font-display font-extrabold text-4xl leading-none">Subcontractor Database</h1>
          <p className="text-ink-muted text-sm mt-2 max-w-lg">
            Everyone you work with, in one place. Their info auto-fills bid-request emails, and each
            record shows every project job they&rsquo;re engaged on.
          </p>
        </div>
        <button onClick={addSub} disabled={creating} className="btn btn-blue flex items-center gap-2 shrink-0">
          <Plus size={15} /> {creating ? "Adding…" : "Add subcontractor"}
        </button>
      </header>

      {error && <div className="panel border-red text-red p-4 mb-6 font-mono text-sm">{error}</div>}

      {loading ? (
        <div className="font-mono text-ink-muted text-sm uppercase tracking-wide">Loading…</div>
      ) : subs.length === 0 ? (
        <div className="panel p-10 text-center text-ink-muted">
          No subcontractors yet. Add your first to start building bids.
        </div>
      ) : (
        <div className="space-y-3">
          {subs.map((s) => (
            <SubCard key={s.id} sub={s} onSave={update} onRemove={remove} />
          ))}
        </div>
      )}
    </main>
  );
}

function SubCard({
  sub,
  onSave,
  onRemove,
}: {
  sub: SubcontractorWithJobs;
  onSave: (id: string, input: SubcontractorInput) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
}) {
  const [form, setForm] = useState<SubcontractorInput>(toInput(sub));
  const [open, setOpen] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep local form in sync if the underlying record changes (e.g. after reload)
  useEffect(() => {
    setForm(toInput(sub));
  }, [sub]);

  function patch(field: keyof SubcontractorInput, value: string) {
    const next = { ...form, [field]: value };
    setForm(next);
    setSaveState("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      await onSave(sub.id, next);
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 1500);
    }, 600);
  }

  return (
    <div className="panel">
      <div className="p-4 flex items-center justify-between gap-3 flex-wrap">
        <input
          value={form.companyName}
          onChange={(e) => patch("companyName", e.target.value)}
          placeholder="Company name"
          className="font-display font-bold text-xl bg-transparent outline-none border-b-[1.5px] border-transparent focus:border-blueprint flex-1 min-w-[180px]"
        />
        <div className="flex items-center gap-3">
          {saveState !== "idle" && (
            <span className="font-mono text-[11px] uppercase tracking-wider text-ink-muted">
              {saveState === "saving" ? "Saving…" : "Saved"}
            </span>
          )}
          {sub.relatedJobs.length > 0 && (
            <span className="font-mono text-[11px] uppercase tracking-wider text-green">
              {sub.relatedJobs.length} job{sub.relatedJobs.length > 1 ? "s" : ""}
            </span>
          )}
          <button onClick={() => setOpen((o) => !o)} className="icon-btn flex items-center justify-center" aria-label="Toggle details">
            <ChevronDown size={15} className={`transition-transform ${open ? "" : "-rotate-90"}`} />
          </button>
          <button onClick={() => onRemove(sub.id)} className="icon-btn flex items-center justify-center" aria-label="Delete subcontractor">
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t-[1.5px] border-hair p-5 space-y-5">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Field label="Representative" value={form.representativeName} onChange={(v) => patch("representativeName", v)} placeholder="Contact name" />
            <Field label="Phone" value={form.phone} onChange={(v) => patch("phone", v)} placeholder="(555) 555-5555" />
            <Field label="Email" value={form.email} onChange={(v) => patch("email", v)} placeholder="name@company.com" />
            <Field label="Worker's Comp" value={form.workersComp} onChange={(v) => patch("workersComp", v)} placeholder="Link or expiry date" />
            <Field label="W-9" value={form.w9} onChange={(v) => patch("w9", v)} placeholder="Link or status" />
            <Field label="Business License" value={form.businessLicense} onChange={(v) => patch("businessLicense", v)} placeholder="Link or number" />
          </div>

          <div>
            <div className="label-mono mb-2">Related Jobs</div>
            {sub.relatedJobs.length === 0 ? (
              <p className="text-sm text-ink-muted">Not assigned to any project jobs yet.</p>
            ) : (
              <div className="border-[1.5px] border-hair divide-y divide-hair">
                {sub.relatedJobs.map((j, i) => (
                  <Link
                    key={i}
                    href={`/projects/${j.projectId}/manage`}
                    className="flex items-center justify-between px-3 py-2 hover:bg-paper transition-colors group"
                  >
                    <span className="text-sm">
                      <span className="font-semibold">{j.projectName}</span>
                      <span className="text-ink-muted"> · {j.jobCategory}</span>
                    </span>
                    <span className="flex items-center gap-2">
                      <StatusPill status={j.status} />
                      <ExternalLink size={13} className="text-ink-muted opacity-0 group-hover:opacity-100" />
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="label-mono">{label}</span>
      <input value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className="field-input" />
    </label>
  );
}

function StatusPill({ status }: { status: string }) {
  const active = ["Bid approved", "Work-in-progress", "Finished", "Partially-paid", "Fully-paid"].includes(status);
  return (
    <span className={`font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 border ${active ? "border-green text-green" : "border-hair text-ink-muted"}`}>
      {status}
    </span>
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
