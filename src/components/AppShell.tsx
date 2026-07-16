"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "@/lib/session-context";
import { useI18n } from "@/lib/i18n";
import { TopNav } from "@/components/TopNav";

const PUBLIC_ROUTES = ["/login", "/signup", "/recover"];
const BARE_ROUTES = ["/mail-tracker"];

/** Auth gate + global chrome. Public auth routes render bare; everything else
 *  requires a signed-in user (redirecting to /login otherwise). */
export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useSession();
  const { t } = useI18n();
  const pathname = usePathname();
  const router = useRouter();
  const isPublic = PUBLIC_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "/"));
  const isBare = BARE_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "/"));
  const bypassAuth = isPublic || isBare;

  useEffect(() => {
    if (!loading && !user && !bypassAuth) router.replace("/login");
  }, [loading, user, bypassAuth, router]);

  if (bypassAuth) return <>{children}</>;

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="panel px-6 py-4 text-sm text-ink-muted">{t("Loading…")}</div>
      </div>
    );
  }

  return (
    <>
      <TopNav />
      {children}
    </>
  );
}
