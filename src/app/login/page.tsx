"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogIn } from "lucide-react";
import { useSession } from "@/lib/session-context";
import { useI18n } from "@/lib/i18n";
import { AuthFrame, Field } from "@/components/AuthFrame";

export default function LoginPage() {
  const { refresh } = useSession();
  const { t } = useI18n();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Could not sign in");
      }
      await refresh();
      router.push("/");
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <AuthFrame title={t("Welcome back")} subtitle={t("Sign in to your workspace")}>
      <form onSubmit={submit} className="space-y-3.5">
        <Field label={t("Username")} value={username} onChange={setUsername} autoFocus />
        <Field label={t("Password")} value={password} onChange={setPassword} type="password" />
        {error && <div className="text-[12.5px] text-red font-semibold">{t(error)}</div>}
        <button type="submit" disabled={busy} className="btn btn-blue w-full gap-1.5">
          <LogIn size={16} /> {busy ? t("Signing in…") : t("Sign in")}
        </button>
      </form>
      <div className="flex items-center justify-between mt-4 text-[12.5px]">
        <Link href="/signup" className="font-bold text-accent">{t("Create an account")}</Link>
        <Link href="/recover" className="text-ink-muted hover:text-accent">{t("Forgot password?")}</Link>
      </div>
    </AuthFrame>
  );
}
