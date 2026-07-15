"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeftRight,
  ClipboardList,
  Upload,
  Trash2,
  ImageIcon,
  Bell,
  Users2,
  FileDown,
  History,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useProjectContext } from "@/lib/projectContext";
import { useCurrency, convertProjectCurrency } from "@/lib/currency";
import { DateField, NumberInput, TextField } from "@/components/fields";
import { useI18n } from "@/lib/i18n";

const STRATEGY_PRESETS = [
  "Buy-Rehab-Hold Rental",
  "Buy-Rehab-Sell (Flip)",
  "Short-Term / Vacation Rental",
  "BRRRR",
  "New Construction",
  "Commercial / Mixed-Use",
];

/** Downscale an uploaded image to a small square data URL so the project JSON
 *  stays light. Returns a JPEG/PNG data URL ~256px on the long edge. */
function fileToAvatarDataUrl(file: File, max = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Could not load image"));
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas unavailable"));
        ctx.drawImage(img, 0, 0, w, h);
        const hasAlpha = file.type === "image/png";
        resolve(canvas.toDataURL(hasAlpha ? "image/png" : "image/jpeg", 0.85));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export default function SettingsPage() {
  const { t, lang } = useI18n();
  const { project, setProject, loading, error } = useProjectContext();
  const { currency, exchangeRate, setExchangeRate, setCurrency } = useCurrency();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const lastNonEmptyNameRef = useRef("");
  const [busy, setBusy] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  if (loading) return <div className="text-ink-muted text-sm">{t("Loading…")}</div>;
  if (error) return <div className="panel border-red text-red p-4 text-sm">{t(error)}</div>;
  if (!project) return null;

  const target = currency === "USD" ? "VND" : "USD";
  function handleConvert() {
    const rate = exchangeRate;
    if (!Number.isFinite(rate) || rate <= 0) {
      window.alert(t("Set a valid exchange rate first."));
      return;
    }
    const ok = window.confirm(
      t("Convert every amount in this project from {from} to {to} at {rate} ₫/USD? This rewrites the saved values and cannot be undone automatically.", { from: currency, to: target, rate: rate.toLocaleString(lang === "vi" ? "vi-VN" : "en-US") }),
    );
    if (!ok) return;
    setProject((prev) => convertProjectCurrency(prev, target, rate));
    setCurrency(target);
  }

  async function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file
    if (!file) return;
    setBusy(true);
    try {
      const dataUrl = await fileToAvatarDataUrl(file);
      setProject((p) => ({ ...p, profileImage: dataUrl }));
    } catch (err) {
      window.alert(t((err as Error).message));
    } finally {
      setBusy(false);
    }
  }

  // Require the user to type "<project name> delete" before the button arms.
  const deletePhrase = t("{name} delete", { name: project.name });
  const canDelete = confirmText.trim().toLowerCase() === deletePhrase.trim().toLowerCase();

  async function deleteProject() {
    if (!canDelete) return;
    setDeleting(true);
    const res = await fetch(`/api/projects/${project!.id}`, { method: "DELETE" });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      window.alert(t(j.error || "Could not delete project"));
      setDeleting(false);
      return;
    }
    router.push("/");
  }

  return (
    <div className="space-y-7 max-w-3xl">
      <p className="text-sm text-ink-muted">
        {t("Settings for")} <span className="font-semibold text-ink">{project.name}</span>. {t("Looking for theme or profile? Those live in")} <span className="font-semibold text-ink">{t("workspace Settings")}</span> {t("(top-right gear).")}
      </p>

      {/* ---- Project details ---- */}
      <SettingsCard
        icon={ClipboardList}
        title={t("Project details")}
        caption={t("Changes save automatically. New jobs default to the anticipated start date.")}
      >
        <div className="grid sm:grid-cols-2 gap-5">
          <label className="flex flex-col gap-1.5">
            <span className="label-mono">{t("Project Name")}</span>
            <input
              value={project.name}
              onFocus={() => {
                if (project.name.trim()) lastNonEmptyNameRef.current = project.name;
              }}
              onChange={(e) => setProject((p) => ({ ...p, name: e.target.value }))}
              onBlur={(e) => {
                if (!e.target.value.trim()) {
                  setProject((p) => ({ ...p, name: lastNonEmptyNameRef.current || "Untitled project" }));
                } else {
                  lastNonEmptyNameRef.current = e.target.value;
                }
              }}
              placeholder={t("Project name")}
              className="field-input text-base font-semibold"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="label-mono">{t("Investment Strategy")}</span>
            <input
              value={project.investmentStrategy}
              onChange={(e) => setProject((p) => ({ ...p, investmentStrategy: e.target.value }))}
              list="strategy-presets"
              placeholder={t("e.g. Buy-Rehab-Hold Rental")}
              className="field-input text-base font-semibold"
            />
            <datalist id="strategy-presets">
              {STRATEGY_PRESETS.map((s) => (
                <option key={s} value={s} label={t(s)} />
              ))}
            </datalist>
          </label>
          <TextField label={t("Project Address")} value={project.projectAddress}
            onChange={(v) => setProject((p) => ({ ...p, projectAddress: v }))} placeholder={t("123 Main St, City")} />
          <DateField label={t("Anticipated Start Date")} value={project.startDate}
            onChange={(v) => setProject((p) => ({ ...p, startDate: v }))} />
          <TextField label={t("Project Manager")} value={project.projectManager}
            onChange={(v) => setProject((p) => ({ ...p, projectManager: v }))} placeholder={t("Name")} />
          <TextField label={t("Owner")} value={project.owner}
            onChange={(v) => setProject((p) => ({ ...p, owner: v }))} placeholder={t("Name")} />
          <TextField label={t("General Contractor")} value={project.generalContractor}
            onChange={(v) => setProject((p) => ({ ...p, generalContractor: v }))} placeholder={t("Company / name")} />
        </div>
      </SettingsCard>

      {/* ---- Currency ---- */}
      <SettingsCard
        icon={ArrowLeftRight}
        title={t("Currency")}
        caption={t("The project stores every figure in one currency. Converting rewrites all saved amounts at the rate below.")}
      >
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <div className="label-mono mb-1.5">{t("Active currency")}</div>
            <div className="font-mono text-2xl font-extrabold">{currency}</div>
          </div>
          <div className="flex-1 min-w-[180px]">
            <div className="label-mono mb-1.5">{t("Exchange rate (1 USD = ₫)")}</div>
            <div className="field-input flex items-center gap-2">
              <NumberInput
                value={exchangeRate}
                min={1}
                onChange={(v) => setExchangeRate(v || 25500)}
                ariaLabel={t("VND per USD exchange rate")}
                className="w-full bg-transparent font-mono text-base text-ink outline-none"
              />
              <span className="text-ink-muted font-mono text-sm">₫</span>
            </div>
          </div>
          <button onClick={handleConvert} className="btn btn-blue gap-1.5">
            <ArrowLeftRight size={15} /> {t("Convert to {currency}", { currency: target })}
          </button>
        </div>
        <p className="text-[11.5px] text-ink-muted mt-3">
          {t("Tip: the header badge always shows the active currency. Conversion rounds each amount and flips the project — there is no live FX on individual fields.")}
        </p>
      </SettingsCard>

      {/* ---- Project image ---- */}
      <SettingsCard
        icon={ImageIcon}
        title={t("Project image")}
      >
        <div className="flex items-center gap-4 flex-wrap">
          {project.profileImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={project.profileImage}
              alt={t("Project")}
              className="w-20 h-20 rounded-[18px] object-cover"
              style={{ border: "1px solid var(--border)" }}
            />
          ) : (
            <div
              className="w-20 h-20 rounded-[18px] flex items-center justify-center text-ink-muted"
              style={{ background: "var(--glass-2)", border: "1px dashed var(--border)" }}
            >
              <ImageIcon size={24} />
            </div>
          )}
          <div className="flex items-center gap-2">
            <input ref={fileRef} type="file" accept="image/*" onChange={onPickImage} className="hidden" />
            <button onClick={() => fileRef.current?.click()} disabled={busy} className="btn gap-1.5">
              <Upload size={15} /> {t(busy ? "Processing…" : project.profileImage ? "Replace" : "Upload")}
            </button>
            {project.profileImage && (
              <button onClick={() => setProject((p) => ({ ...p, profileImage: "" }))} className="btn btn-ghost gap-1.5">
                <Trash2 size={14} /> {t("Remove")}
              </button>
            )}
          </div>
        </div>
      </SettingsCard>

      {/* ---- Recommended (roadmap) ---- */}
      <SettingsCard
        icon={Bell}
        title={t("Recommended next")}
        caption={t("Settings worth adding as the tool grows — not wired up yet.")}
      >
        <div className="grid sm:grid-cols-2 gap-2.5">
          {[
            { icon: Users2, label: "Collaborators & roles", text: "Invite teammates with view / edit access." },
            { icon: Bell, label: "Alerts", text: "Notify on compliance gaps or schedule slips." },
            { icon: FileDown, label: "Export & backup", text: "Download the project as JSON / Excel." },
            { icon: History, label: "Activity log", text: "Track edits and currency conversions over time." },
          ].map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.label} className="panel-2 p-3.5 flex gap-3">
                <Icon size={18} className="text-accent shrink-0 mt-0.5" />
                <div>
                  <div className="text-[13px] font-bold">{t(f.label)}</div>
                  <div className="text-[11.5px] text-ink-muted leading-tight mt-0.5">{t(f.text)}</div>
                </div>
              </div>
            );
          })}
        </div>
      </SettingsCard>

      {/* ---- Danger zone ---- */}
      <div className="rounded-[20px] p-5" style={{ border: "1px solid var(--neg)", background: "var(--accent-soft)" }}>
        <div className="font-extrabold text-[14.5px] text-red mb-1">{t("Danger zone")}</div>
        <p className="text-[12.5px] text-ink-muted max-w-lg mb-3">
          {t("Permanently delete this project and all of its jobs, bids, and financials. Subcontractor records are shared and stay in the database. This cannot be undone.")}
        </p>
        <div className="text-[12.5px] mb-1.5">
          {t("To confirm, type")} {" "}
          <span className="font-mono font-bold text-red select-all">{deletePhrase}</span>{" "}
          {t("below.")}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={deletePhrase}
            aria-label={t("Type the project name followed by delete")}
            className="field-input flex-1 min-w-[220px] max-w-sm"
            style={{ borderColor: confirmText && !canDelete ? "var(--neg)" : undefined }}
          />
          <button
            onClick={deleteProject}
            disabled={!canDelete || deleting}
            className="btn gap-1.5 shrink-0"
            style={canDelete ? { background: "var(--neg)", color: "#fff", border: "none" } : undefined}
          >
            <Trash2 size={14} /> {t(deleting ? "Deleting…" : "Delete project")}
          </button>
        </div>
      </div>
    </div>
  );
}

function SettingsCard({
  icon: Icon,
  title,
  caption,
  children,
}: {
  icon: LucideIcon;
  title: string;
  caption?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="panel-2 p-[18px]">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-9 h-9 rounded-[11px] flex items-center justify-center shrink-0" style={{ background: "var(--accent-soft)" }}>
          <Icon size={18} className="text-accent" />
        </div>
        <div>
          <h2 className="font-extrabold text-[15px] leading-tight">{title}</h2>
          {caption && <p className="text-[12px] text-ink-muted mt-0.5 max-w-lg">{caption}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}
