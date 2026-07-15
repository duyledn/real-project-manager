"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { UserPlus } from "lucide-react";
import { useSession } from "@/lib/session-context";
import { useI18n } from "@/lib/i18n";
import { AuthFrame, Field } from "@/components/AuthFrame";

export default function SignupPage() {
  const { refresh } = useSession();
  const { t } = useI18n();
  const router = useRouter();
  const [tag, setTag] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tag, username, password, pin }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Could not create account");
      }
      await refresh();
      router.push("/");
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <AuthFrame title={t("Create your account")} subtitle={t("Pick a @tag — it's your name across the app")}>
      <form onSubmit={submit} className="space-y-3.5">
        <Field label="@tag" value={tag} onChange={(v) => setTag(v.replace(/^@+/, ""))} placeholder={t("yourhandle")} autoFocus hint={t("Letters, numbers, underscore. This is how teammates add you.")} />
        <Field label={t("Username")} value={username} onChange={setUsername} placeholder={t("for signing in")} />
        <Field label={t("Password")} value={password} onChange={setPassword} type="password" />
        <Field label={t("Recovery PIN")} value={pin} onChange={(v) => setPin(v.replace(/\D/g, "").slice(0, 6))} placeholder={t("6 digits")} hint={t("Used to reset your password if you forget it.")} />
        {error && <div className="text-[12.5px] text-red font-semibold">{t(error)}</div>}
        <button type="submit" disabled={busy} className="btn btn-blue w-full gap-1.5">
          <UserPlus size={16} /> {busy ? t("Creating…") : t("Create account")}
        </button>
      </form>
      <div className="mt-4 text-[12.5px]">
        <Link href="/login" className="font-bold text-accent">{t("Already have an account? Sign in")}</Link>
      </div>
    </AuthFrame>
  );
}
