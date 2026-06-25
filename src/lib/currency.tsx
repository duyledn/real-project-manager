"use client";

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import type { Currency, Project } from "./types";

export type { Currency };

const LS_CURRENCY = "re_currency";
const LS_RATE = "re_exchange_rate";

interface CurrencyContextValue {
  /** The currency money is currently displayed in. Mirrors the active
   *  project's stored currency while a project is open. */
  currency: Currency;
  exchangeRate: number; // VND per 1 USD
  setCurrency: (c: Currency) => void;
  setExchangeRate: (r: number) => void;
  fmtMoney: (n: number | null | undefined) => string;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

/** Convert USD → VND, rounding the result UP to the nearest 1,000 VND. */
export function usdToVnd(usd: number, exchangeRate: number): number {
  return Math.ceil((usd * exchangeRate) / 1000) * 1000;
}

/** Convert VND → USD, rounding the result UP to the nearest whole dollar
 *  (i.e. rounding up the single/ones digit). */
export function vndToUsd(vnd: number, exchangeRate: number): number {
  return Math.ceil(vnd / exchangeRate);
}

/** Convert a single amount into `target`, applying the matching rounding rule. */
export function convertAmount(amount: number, target: Currency, exchangeRate: number): number {
  if (!Number.isFinite(amount)) return amount;
  return target === "VND" ? usdToVnd(amount, exchangeRate) : vndToUsd(amount, exchangeRate);
}

/** Rewrite every money figure on a project into `target` currency (in place,
 *  rounded), and flip its `currency` flag. Non-money fields (rates, percentages,
 *  counts, years) are left untouched. */
export function convertProjectCurrency(p: Project, target: Currency, exchangeRate: number): Project {
  const c = (n: number) => convertAmount(n, target, exchangeRate);
  return {
    ...p,
    currency: target,
    purchasePrice: c(p.purchasePrice),
    closingCosts: c(p.closingCosts),
    borrowed: c(p.borrowed),
    adr: c(p.adr),
    exitValueOverride: p.exitValueOverride == null ? p.exitValueOverride : c(p.exitValueOverride),
    items: p.items.map((i) => ({ ...i, unitCost: c(i.unitCost) })),
    expenses: p.expenses.map((e) => ({ ...e, amount: c(e.amount) })),
    incomes: p.incomes.map((i) => ({ ...i, amount: c(i.amount) })),
    jobs: p.jobs.map((j) => ({
      ...j,
      estimatedCost: c(j.estimatedCost),
      bidders: j.bidders.map((b) => ({ ...b, bidPrice: c(b.bidPrice) })),
    })),
  };
}

/** Format a raw number as money in the given currency. The number is taken
 *  as-is (already in that currency) — no exchange-rate conversion happens here. */
export function formatMoney(n: number | null | undefined, currency: Currency): string {
  const v = typeof n === "number" && Number.isFinite(n) ? n : 0;
  if (currency === "VND") {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(v);
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(v);
}

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
    (n: number | null | undefined): string => formatMoney(n, currency),
    [currency],
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
