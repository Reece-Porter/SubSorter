import type { Subscription } from "./types";

const DAYS_PER_MONTH = 365.25 / 12; // ≈ 30.4375
const DAYS_PER_YEAR = 365.25;

/** Convert a subscription's cost to a normalised monthly-equivalent amount. */
export function monthlyEquivalent(sub: Pick<Subscription, "cost" | "frequency" | "customFrequencyDays">): number {
  const { cost, frequency, customFrequencyDays } = sub;
  switch (frequency) {
    case "weekly":
      return (cost * 52) / 12;
    case "monthly":
      return cost;
    case "yearly":
      return cost / 12;
    case "custom": {
      const days = customFrequencyDays && customFrequencyDays > 0 ? customFrequencyDays : 30;
      return cost * (DAYS_PER_MONTH / days);
    }
    default:
      return cost;
  }
}

/** Convert a subscription's cost to a normalised yearly-equivalent amount. */
export function yearlyEquivalent(sub: Pick<Subscription, "cost" | "frequency" | "customFrequencyDays">): number {
  const { cost, frequency, customFrequencyDays } = sub;
  switch (frequency) {
    case "weekly":
      return cost * 52;
    case "monthly":
      return cost * 12;
    case "yearly":
      return cost;
    case "custom": {
      const days = customFrequencyDays && customFrequencyDays > 0 ? customFrequencyDays : 30;
      return cost * (DAYS_PER_YEAR / days);
    }
    default:
      return cost * 12;
  }
}

/** Start-of-today in local time. */
export function today(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Parse an ISO date string (YYYY-MM-DD) as a local-midnight Date. */
export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

/** Format a Date as an ISO date string (YYYY-MM-DD) in local time. */
export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Whole days from today until the given ISO date. Negative = in the past. */
export function daysUntil(iso: string): number {
  const target = parseISODate(iso);
  const now = today();
  return Math.round((target.getTime() - now.getTime()) / 86_400_000);
}

/** Add days to an ISO date, returning a new ISO date. */
export function addDays(iso: string, days: number): string {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

export type Urgency = "overdue" | "critical" | "soon" | "upcoming" | "later";

/** Bucket a renewal by how close it is, for visual urgency. */
export function urgencyFor(iso: string): Urgency {
  const days = daysUntil(iso);
  if (days < 0) return "overdue";
  if (days <= 3) return "critical";
  if (days <= 7) return "soon";
  if (days <= 14) return "upcoming";
  return "later";
}

/**
 * Advance a next-billing date past today by whole cycles, so a date that has
 * slipped into the past rolls forward to the real next occurrence. Pure — does
 * not mutate. Returns the same date if it is already today or later.
 */
export function rollForward(sub: Subscription): string {
  let iso = sub.nextBillingDate;
  let guard = 0;
  while (daysUntil(iso) < 0 && guard < 1000) {
    switch (sub.frequency) {
      case "weekly":
        iso = addDays(iso, 7);
        break;
      case "monthly": {
        const d = parseISODate(iso);
        d.setMonth(d.getMonth() + 1);
        iso = toISODate(d);
        break;
      }
      case "yearly": {
        const d = parseISODate(iso);
        d.setFullYear(d.getFullYear() + 1);
        iso = toISODate(d);
        break;
      }
      case "custom":
        iso = addDays(iso, sub.customFrequencyDays && sub.customFrequencyDays > 0 ? sub.customFrequencyDays : 30);
        break;
    }
    guard += 1;
  }
  return iso;
}

/** Sum monthly-equivalent spend across the given (active) subscriptions. */
export function totalMonthly(subs: Subscription[]): number {
  return subs.reduce((sum, s) => sum + monthlyEquivalent(s), 0);
}

export function totalYearly(subs: Subscription[]): number {
  return subs.reduce((sum, s) => sum + yearlyEquivalent(s), 0);
}

/**
 * "Money you've stopped" — accumulated savings from cancelled subscriptions.
 * For each cancelled sub, counts its monthly-equivalent cost for every whole
 * month elapsed since it was cancelled, so the figure grows over time.
 */
export function savingsSince(subs: Subscription[]): number {
  const now = today().getTime();
  return subs.reduce((sum, s) => {
    if (s.status !== "cancelled" || !s.cancelledAt) return sum;
    const monthly = s.monthlyEquivalentAtCancel ?? monthlyEquivalent(s);
    const cancelled = new Date(s.cancelledAt).getTime();
    const monthsElapsed = Math.max(0, (now - cancelled) / (DAYS_PER_MONTH * 86_400_000));
    return sum + monthly * monthsElapsed;
  }, 0);
}
