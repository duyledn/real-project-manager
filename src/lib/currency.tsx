"use client";

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";

export type Currency = "USD" | "VND";

const LS_CURRENCY = "re_currency";
const LS_RATE = "re_exchange_rate";

interface CurrencyContextValue {
  currency: Currency;
  exchangeRate: number; // VND per 1 USD
  setCurrency: (c: Currency) => void;
  setExchangeRate: (r: number) => void;
  fmtMoney: (n: number | null | undefined) => string;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>("USD");
  const [exchangeRate, setExchangeRateState] = useState(25500);

  // Restore the remembered currency + rate on first load.
  useEffect(() => {
    try {
      const c = localStorage.getItem(LS_CURRENCY);
      const r = localStorage.getItem(LS_RATE);
      if (c === "USD" || c === "VND") setCurrencyState(c);
      if (r) {
        const n = parseFloat(r);
        if (Number.isFinite(n) && n > 0) setExchangeRateState(n);
      }
    } catch {
      /* localStorage unavailable — ignore */
    }
  }, []);

  const setCurrency = useCallback((c: Currency) => {
    setCurrencyState(c);
    try {
      localStorage.setItem(LS_CURRENCY, c);
    } catch {
      /* ignore */
    }
  }, []);

  const setExchangeRate = useCallback((r: number) => {
    setExchangeRateState(r);
    try {
      localStorage.setItem(LS_RATE, String(r));
    } catch {
      /* ignore */
    }
  }, []);

  const fmtMoney = useCallback(
    (n: number | null | undefined): string => {
      const v = typeof n === "number" && Number.isFinite(n) ? n : 0;
      if (currency === "VND") {
        const vnd = v * exchangeRate;
        return new Intl.NumberFormat("vi-VN", {
          style: "currency",
          currency: "VND",
          maximumFractionDigits: 0,
        }).format(vnd);
      }
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(v);
    },
    [currency, exchangeRate],
  );

  return (
    <CurrencyContext.Provider value={{ currency, exchangeRate, setCurrency, setExchangeRate, fmtMoney }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency(): CurrencyContextValue {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be inside CurrencyProvider");
  return ctx;
}
