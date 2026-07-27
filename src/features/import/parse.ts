import { newId } from "@/lib/storage";
import { toISODate } from "@/lib/calc";
import type { ParsedTransaction, TransactionFlag } from "./types";

/* ------------------------------------------------------------------ *
 * Amount parsing
 * ------------------------------------------------------------------ */

export interface AmountResult {
  value: number | null;
  /** Positive = money out. */
  outgoing: boolean;
  uncertain: boolean;
}

const CURRENCY_CHARS = "£$€";

/**
 * Parse a monetary token from messy real-world text. Handles:
 *  - currency symbols, thousands separators, both , and . decimals
 *  - parentheses or trailing DR/CR or leading - for sign
 */
export function parseAmount(input: string): AmountResult {
  if (!input) return { value: null, outgoing: true, uncertain: false };
  let s = input.trim();
  let outgoing = true;
  let uncertain = false;

  // Sign conventions.
  const isParenNeg = /^\(.*\)$/.test(s);
  const hasDR = /\bDR\b/i.test(s); // debit = money out
  const hasCR = /\bCR\b/i.test(s); // credit = money in
  if (s.trimStart().startsWith("+")) outgoing = false;
  if (isParenNeg) s = s.replace(/[()]/g, "");
  if (hasCR) outgoing = false;
  if (hasDR) outgoing = true;

  // Strip currency + letters, keep digits, separators and a leading minus.
  const cleaned = s.replace(new RegExp(`[${CURRENCY_CHARS}]`, "g"), "").replace(/[A-Za-z]/g, "").trim();
  const negative = /-/.test(cleaned) || isParenNeg;
  const digits = cleaned.replace(/[^0-9.,]/g, "");
  if (!digits || !/[0-9]/.test(digits)) return { value: null, outgoing, uncertain: false };

  const value = normalizeDecimal(digits);
  if (value == null) return { value: null, outgoing, uncertain: true };

  // A bare "-" with no DR/CR means money out on most statements.
  if (negative && !hasCR) outgoing = true;

  return { value: Math.abs(value), outgoing, uncertain };
}

/** Turn a digits+separators string into a number, inferring which separator is the decimal. */
function normalizeDecimal(raw: string): number | null {
  const hasComma = raw.includes(",");
  const hasDot = raw.includes(".");
  let s = raw;
  if (hasComma && hasDot) {
    // The last-occurring separator is the decimal point.
    if (raw.lastIndexOf(",") > raw.lastIndexOf(".")) {
      s = raw.replace(/\./g, "").replace(",", "."); // European 1.234,56
    } else {
      s = raw.replace(/,/g, ""); // US/UK 1,234.56
    }
  } else if (hasComma) {
    // Comma only: decimal if it looks like ",dd", else thousands.
    s = /,\d{2}$/.test(raw) && !/,\d{3}$/.test(raw) ? raw.replace(",", ".") : raw.replace(/,/g, "");
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/* ------------------------------------------------------------------ *
 * Date parsing
 * ------------------------------------------------------------------ */

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
};

export interface DateToken {
  /** Present when unambiguous or after order inference. */
  iso?: string;
  /** For numeric d/m/y dates, the two candidate positions if ambiguous. */
  a?: number;
  b?: number;
  year?: number;
  /** True when we still need day/month order resolved at the statement level. */
  ambiguous: boolean;
  raw: string;
}

/** Extract the first date-like token from a string. Order may stay ambiguous until resolved per-file. */
export function parseDateToken(input: string): DateToken | null {
  const s = input.trim();

  // ISO: 2024-01-15
  let m = s.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/);
  if (m) return { iso: buildISO(+m[1], +m[2], +m[3]), ambiguous: false, raw: m[0] };

  // Textual month: 15 Jan 2024 / 15 Jan / Jan 15, 2024
  m = s.match(/\b(\d{1,2})\s*([A-Za-z]{3,9})\.?\s*(\d{2,4})?\b/);
  if (m && MONTHS[m[2].toLowerCase()]) {
    const day = +m[1];
    const mon = MONTHS[m[2].toLowerCase()];
    const year = m[3] ? normYear(+m[3]) : new Date().getFullYear();
    return { iso: buildISO(year, mon, day), ambiguous: false, raw: m[0] };
  }
  m = s.match(/\b([A-Za-z]{3,9})\.?\s+(\d{1,2}),?\s*(\d{2,4})?\b/);
  if (m && MONTHS[m[1].toLowerCase()]) {
    const mon = MONTHS[m[1].toLowerCase()];
    const day = +m[2];
    const year = m[3] ? normYear(+m[3]) : new Date().getFullYear();
    return { iso: buildISO(year, mon, day), ambiguous: false, raw: m[0] };
  }

  // Numeric with separators: 15/01/2024, 01-15-24, 15.01.2024
  m = s.match(/\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})\b/);
  if (m) {
    const a = +m[1];
    const b = +m[2];
    const year = normYear(+m[3]);
    if (a > 12 && b <= 12) return { iso: buildISO(year, b, a), ambiguous: false, raw: m[0] };
    if (b > 12 && a <= 12) return { iso: buildISO(year, a, b), ambiguous: false, raw: m[0] };
    return { a, b, year, ambiguous: true, raw: m[0] }; // needs statement-level order
  }

  return null;
}

function normYear(y: number): number {
  if (y >= 1000) return y;
  return y >= 70 ? 1900 + y : 2000 + y;
}

function buildISO(y: number, mon: number, day: number): string | undefined {
  if (mon < 1 || mon > 12 || day < 1 || day > 31) return undefined;
  const d = new Date(y, mon - 1, day);
  if (d.getFullYear() !== y || d.getMonth() !== mon - 1 || d.getDate() !== day) return undefined;
  return toISODate(d);
}

/**
 * Given all ambiguous numeric date tokens in a file, infer whether the first
 * field is the day (DD/MM) or the month (MM/DD), then resolve each to an ISO date.
 * Falls back to day-first (the more common international convention) when unclear.
 */
export function resolveDateOrder(tokens: DateToken[]): (string | undefined)[] {
  let firstIsDay = 0;
  let firstIsMonth = 0;
  for (const t of tokens) {
    if (t.iso || t.a == null || t.b == null) continue;
    if (t.a > 12) firstIsDay += 1; // first field can only be a day
    if (t.b > 12) firstIsMonth += 1; // second field can only be a day → first is month
  }
  const dayFirst = firstIsMonth > firstIsDay ? false : true;
  return tokens.map((t) => {
    if (t.iso) return t.iso;
    if (t.a == null || t.b == null) return undefined;
    const [mon, day] = dayFirst ? [t.b, t.a] : [t.a, t.b];
    return buildISO(t.year ?? new Date().getFullYear(), mon, day);
  });
}

/* ------------------------------------------------------------------ *
 * Merchant / description cleaning
 * ------------------------------------------------------------------ */

const NOISE_PREFIXES = /\b(POS|VISA|MASTERCARD|DEBIT|CREDIT|CARD|PAYMENT|PMT|PURCHASE|DIRECT DEBIT|DD|RECURRING|WWW|TXN|REF)\b/gi;
const CURRENCY_CODES = /\b(GBP|USD|EUR|CAD|AUD|NZD|CHF|JPY|SEK|NOK|DKK)\b/gi;

/** A cleaned, human-readable merchant name for display. */
export function cleanDescription(input: string): string {
  let s = input.replace(/\s+/g, " ").trim();
  s = s.replace(/\b\d{2}[/.-]\d{2}[/.-]\d{2,4}\b/g, ""); // embedded dates
  s = s.replace(/\b[A-Z]{2,3}#?\d{4,}\b/g, ""); // reference codes
  s = s.replace(CURRENCY_CODES, " "); // stray currency codes (e.g. "GBP")
  s = s.replace(/\*+/g, " ");
  s = s.replace(/\s{2,}/g, " ").trim();
  // Title-case ALL-CAPS merchants for readability.
  if (s === s.toUpperCase()) {
    s = s
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return s || input.trim();
}

/** A canonical key used to group repeated charges from the same merchant. */
export function merchantKey(input: string): string {
  let s = input.toUpperCase();
  s = s.replace(NOISE_PREFIXES, " ");
  s = s.replace(CURRENCY_CODES, " ");
  s = s.replace(/[^A-Z ]+/g, " "); // drop digits, punctuation, refs
  s = s.replace(/\b[A-Z]\b/g, " "); // drop stray single letters
  s = s.replace(/\s+/g, " ").trim();
  // Keep the most descriptive leading words (merchant name usually comes first).
  return s.split(" ").slice(0, 3).join(" ");
}

/** Heuristic: does this look like OCR garble rather than a real merchant name? */
export function looksGarbled(desc: string): boolean {
  const letters = desc.replace(/[^A-Za-z]/g, "");
  if (letters.length < 2) return true;
  const nonAlpha = desc.replace(/[A-Za-z0-9 ]/g, "").length;
  if (nonAlpha / Math.max(1, desc.length) > 0.4) return true; // too much punctuation
  const longTokens = desc.split(/\s+/).filter((t) => t.length >= 4);
  const vowelless = longTokens.filter((t) => !/[aeiouAEIOU]/.test(t));
  if (longTokens.length > 0 && vowelless.length / longTokens.length > 0.6) return true;
  return false;
}

/* ------------------------------------------------------------------ *
 * Line → transaction
 * ------------------------------------------------------------------ */

const MAX_PLAUSIBLE = 100_000;

/** Build a ParsedTransaction from an already-split description / date / amount. */
export function buildTransaction(parts: {
  rawLine: string;
  description: string;
  dateToken: DateToken | null;
  amount: AmountResult;
}): ParsedTransaction | null {
  const flags: TransactionFlag[] = [];
  const display = cleanDescription(parts.description);

  if (parts.amount.value == null) return null; // no amount → not a transaction line
  const value = parts.amount.value;

  if (value <= 0 || value > MAX_PLAUSIBLE) flags.push("implausible-amount");
  if (parts.amount.uncertain) flags.push("amount-uncertain");
  if (!parts.dateToken?.iso && !parts.dateToken?.ambiguous) flags.push("no-date");
  if (looksGarbled(display)) flags.push("garbled-merchant");

  return {
    id: newId(),
    date: parts.dateToken?.iso,
    rawDate: parts.dateToken?.raw,
    description: display,
    amount: value,
    raw: parts.rawLine.trim(),
    flags,
  };
}
