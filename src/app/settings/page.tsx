"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Sun, Moon, Clock, Palette, UserRound, Upload, Trash2, Languages } from "lucide-react";
import { useTheme, type ThemeMode } from "@/lib/theme";
import { useI18n, type Lang } from "@/lib/i18n";
import { profileInitials } from "@/lib/useWorkspaceProfile";
import { useSession } from "@/lib/session-context";

/** Downscale an uploaded image to a small square data URL so localStorage stays
 *  light. Returns a JPEG/PNG data URL ~256px on the long edge. */
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

export default function WorkspaceSettingsPage() {
  const { mode, setMode } = useTheme();
  const { lang, setLang, t } = useI18n();
  const { user, refresh } = useSession();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const modeOptions: { key: ThemeMode; label: string; icon: typeof Sun; hint: string }[] = [
    { key: "light", label: "Light", icon: Sun, hint: "Always the warm daytime palette." },
    { key: "dark", label: "Dark", icon: Moon, hint: "Always the dark estate palette." },
    { key: "auto", label: "Auto", icon: Clock, hint: "Light by day, dark after 6 PM." },
  ];

  const langOptions: { key: Lang; label: string; flag: string; hint: string }[] = [
    { key: "en", label: "English", flag: "🇺🇸", hint: "Interface in English." },
    { key: "vi", label: "Vietnamese", flag: "🇻🇳", hint: "Giao diện bằng tiếng Việt." },
  ];

  async function saveAvatar(avatar: string) {
    await fetch("/api/auth/me", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ avatar }),
    });
    await refresh();
  }

  async function onPickAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      await saveAvatar(await fileToAvatarDataUrl(file));
    } catch (err) {
      window.alert(t((err as Error).message));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="max-w-3xl mx-auto px-5 py-8">
      <div className="mb-5">
        <Link href="/" className="btn gap-1.5">
          <ArrowLeft size={14} /> {t("All projects")}
        </Link>
      </div>

      <header className="mb-6">
        <div className="text-[11px] font-bold tracking-[0.06em] uppercase text-accent mb-1">{t("Workspace")}</div>
        <h1 className="font-display font-extrabold text-3xl leading-none">{t("Settings")}</h1>
        <p className="text-ink-muted text-sm mt-2">
          {t(
            "Preferences for your whole workspace and profile. Per-project options live under each project’s settings.",
          )}
        </p>
      </header>

      <div className="space-y-7">
        {/* Appearance */}
        <SettingsCard icon={Palette} title={t("Appearance")} caption={t("Applies across every project. Choose a fixed theme or follow the time of day.")}>
          <div className="grid grid-cols-3 gap-2.5">
            {modeOptions.map((opt) => {
              const Icon = opt.icon;
              const active = mode === opt.key;
              return (
                <button
                  key={opt.key}
                  onClick={() => setMode(opt.key)}
                  className="flex flex-col items-start gap-2 p-3.5 rounded-[14px] text-left transition-all"
                  style={active
                    ? { background: "var(--accent-soft)", border: "1px solid var(--accent)" }
                    : { background: "var(--glass-2)", border: "1px solid var(--border)" }}
                >
                  <Icon size={20} className={active ? "text-accent" : "text-ink-muted"} />
                  <span className="text-[13px] font-bold">{t(opt.label)}</span>
                  <span className="text-[11px] text-ink-muted leading-tight">{t(opt.hint)}</span>
                </button>
              );
            })}
          </div>
        </SettingsCard>

        {/* Language */}
        <SettingsCard icon={Languages} title={t("Language")} caption={t("Choose the interface language. Your data, figures, and currency stay exactly as entered.")}>
          <div className="grid grid-cols-2 gap-2.5">
            {langOptions.map((opt) => {
              const active = lang === opt.key;
              return (
                <button
                  key={opt.key}
                  onClick={() => setLang(opt.key)}
                  className="flex flex-col items-start gap-2 p-3.5 rounded-[14px] text-left transition-all"
                  style={active
                    ? { background: "var(--accent-soft)", border: "1px solid var(--accent)" }
                    : { background: "var(--glass-2)", border: "1px solid var(--border)" }}
                >
                  <span className="text-[20px] leading-none">{opt.flag}</span>
                  <span className="text-[13px] font-bold">{t(opt.label)}</span>
                  <span className="text-[11px] text-ink-muted leading-tight">{t(opt.hint)}</span>
                </button>
              );
            })}
          </div>
        </SettingsCard>

        {/* Profile */}
        <SettingsCard icon={UserRound} title={t("Profile")} caption={t("Your @tag and avatar, shown in the top-right of the nav bar.")}>

          <div className="flex items-center gap-4 flex-wrap">
            {user?.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.avatar} alt={t("Avatar")} className="w-20 h-20 rounded-full object-cover" style={{ border: "1px solid var(--border)" }} />
            ) : (
              <div className="w-20 h-20 rounded-full flex items-center justify-center text-white font-extrabold text-xl" style={{ background: "linear-gradient(150deg,#7A8C5A,#9DAE6E)" }}>
                {profileInitials(user?.tag ?? "")}
              </div>
            )}
            <div className="flex-1 min-w-[200px]">
              <div className="mb-3">
                <div className="label-mono mb-1">{t("Handle")}</div>
                <div className="font-extrabold text-lg">@{user?.tag ?? "—"}</div>
                <div className="text-[11.5px] text-ink-muted">
                  {user?.role === "god" ? t("Administrator") : user?.username}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input ref={fileRef} type="file" accept="image/*" onChange={onPickAvatar} className="hidden" />
                <button onClick={() => fileRef.current?.click()} disabled={busy} className="btn gap-1.5">
                  <Upload size={15} /> {busy ? t("Processing…") : user?.avatar ? t("Replace photo") : t("Upload photo")}
                </button>
                {user?.avatar && (
                  <button onClick={() => void saveAvatar("")} className="btn btn-ghost gap-1.5">
                    <Trash2 size={14} /> {t("Remove")}
                  </button>
                )}
              </div>
            </div>
          </div>
        </SettingsCard>
      </div>
    </main>
  );
}

function SettingsCard({
  icon: Icon,
  title,
  caption,
  children,
}: {
  icon: typeof Sun;
  title: string;
  caption: string;
  children: React.ReactNode;
}) {
  return (
    <section className="panel p-[18px]">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-9 h-9 rounded-[11px] flex items-center justify-center shrink-0" style={{ background: "var(--accent-soft)" }}>
          <Icon size={18} className="text-accent" />
        </div>
        <div>
          <h2 className="font-extrabold text-[15px] leading-tight">{title}</h2>
          <p className="text-[12px] text-ink-muted mt-0.5 max-w-lg">{caption}</p>
        </div>
      </div>
      {children}
    </section>
  );
}
