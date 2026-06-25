import type { Metadata } from "next";
import "./globals.css";
import { CurrencyProvider } from "@/lib/currency";
import { ThemeProvider, themeInitScript } from "@/lib/theme";
import { Background } from "@/components/Background";

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
            <Background />
            <div className="relative z-10">{children}</div>
          </CurrencyProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
