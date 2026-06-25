import type { Metadata } from "next";
import "./globals.css";
import { CurrencyProvider } from "@/lib/currency";

export const metadata: Metadata = {
  title: "Remodel Estimator",
  description:
    "Buy-rehab-hold remodel cost estimator and multi-year investment analysis.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body className="min-h-screen">
        <CurrencyProvider>{children}</CurrencyProvider>
      </body>
    </html>
  );
}
