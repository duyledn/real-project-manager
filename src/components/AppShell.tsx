"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "@/lib/session-context";
import { TopNav } from "@/components/TopNav";

const PUBLIC_ROUTES = ["/login", "/signup", "/recover"];

/** Auth gate + global chrome. Public auth routes render bare; everything else
 *  requires a signed-in user (redirecting to /login otherwise). */
export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const isPublic = PUBLIC_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "/"));

  useEffect(() => {
    if (!loading && !user && !isPublic) router.replace("/login");
  }, [loading, user, isPublic, router]);

  if (isPublic) return <>{children}</>;

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="panel px-6 py-4 text-sm text-ink-muted">Loading…</div>
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
