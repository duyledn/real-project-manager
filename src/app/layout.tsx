import type { Metadata } from "next";
import "./globals.css";
import { CurrencyProvider } from "@/lib/currency";
import { ThemeProvider, themeInitScript } from "@/lib/theme";
import { SessionProvider } from "@/lib/session-context";
import { Background } from "@/components/Background";
import { AppShell } from "@/components/AppShell";

export const metadata: Metadata = {
  title: "Real Project Manager",
  description:
    "Buy-rehab-hold remodel cost estimator and multi-year investment analysis.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Apply persisted theme before first paint to avoid a flash. */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-screen">
        <ThemeProvider>
          <CurrencyProvider>
            <SessionProvider>
              <Background />
              <div className="relative z-10">
                <AppShell>{children}</AppShell>
              </div>
            </SessionProvider>
          </CurrencyProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
