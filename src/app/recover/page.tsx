"use client";

import { useState } from "react";
import Link from "next/link";
import { KeyRound, Check } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { AuthFrame, Field } from "@/components/AuthFrame";

export default function RecoverPage() {
  const { t } = useI18n();
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/recover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, pin, newPassword }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Could not reset password");
      }
      setDone(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthFrame title={t("Reset password")} subtitle={t("Use your 6-digit recovery PIN")}>
      {done ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-green font-semibold">
            <Check size={18} /> {t("Password updated.")}
          </div>
          <Link href="/login" className="btn btn-blue w-full justify-center">{t("Back to sign in")}</Link>
        </div>
      ) : (
        <>
          <form onSubmit={submit} className="space-y-3.5">
            <Field label={t("Username")} value={username} onChange={setUsername} autoFocus />
            <Field label={t("Recovery PIN")} value={pin} onChange={(v) => setPin(v.replace(/\D/g, "").slice(0, 6))} placeholder={t("6 digits")} />
            <Field label={t("New password")} value={newPassword} onChange={setNewPassword} type="password" />
            {error && <div className="text-[12.5px] text-red font-semibold">{t(error)}</div>}
            <button type="submit" disabled={busy} className="btn btn-blue w-full gap-1.5">
              <KeyRound size={16} /> {busy ? t("Resetting…") : t("Reset password")}
            </button>
          </form>
          <div className="mt-4 text-[12.5px]">
            <Link href="/login" className="font-bold text-accent">{t("Back to sign in")}</Link>
          </div>
        </>
      )}
    </AuthFrame>
  );
}
