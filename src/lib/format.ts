import { CURRENCIES } from "./types";
import { daysUntil, parseISODate } from "./calc";

export function currencySymbol(code: string): string {
  return CURRENCIES.find((c) => c.value === code)?.symbol ?? "";
}

/** Format an amount as currency. Whole numbers drop the decimals for a cleaner numeric hierarchy. */
export function formatMoney(amount: number, currency: string, opts?: { alwaysDecimals?: boolean }): string {
  try {
    const isWhole = Math.abs(amount % 1) < 0.005;
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      minimumFractionDigits: opts?.alwaysDecimals || !isWhole ? 2 : 0,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currencySymbol(currency)}${amount.toFixed(2)}`;
  }
}

/** Compact money for big totals, keeping cents when small. */
export function formatMoneyRounded(amount: number, currency: string): string {
  return formatMoney(Math.round(amount), currency);
}

export function formatDate(iso: string): string {
  return parseISODate(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Human phrase for a renewal date, e.g. "in 3 days", "today", "2 days ago". */
export function renewalPhrase(iso: string): string {
  const d = daysUntil(iso);
  if (d === 0) return "Renews today";
  if (d === 1) return "Renews tomorrow";
  if (d > 1) return `Renews in ${d} days`;
  if (d === -1) return "Renewed yesterday";
  return `Renewed ${Math.abs(d)} days ago`;
}
