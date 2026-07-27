import type { BillingFrequency, Category } from "@/lib/types";

export type ImportSource = "csv" | "pdf" | "image";

/** A single parsed statement line, normalised across CSV / PDF / image sources. */
export interface ParsedTransaction {
  id: string;
  /** ISO date (YYYY-MM-DD) if we could parse one, else undefined. */
  date?: string;
  /** The raw date text as it appeared, for the preview. */
  rawDate?: string;
  /** Cleaned merchant / description. */
  description: string;
  /** Positive number = money out (a charge). We only track outgoing charges. */
  amount: number;
  /** The original raw line/row, shown in the extraction preview. */
  raw: string;
  /** Warnings, e.g. "garbled-merchant", "implausible-amount", "no-date". */
  flags: TransactionFlag[];
}

export type TransactionFlag =
  | "no-date"
  | "implausible-amount"
  | "garbled-merchant"
  | "amount-uncertain";

/** A candidate recurring subscription detected from grouped transactions. */
export interface DetectedSubscription {
  id: string;
  name: string;
  /** Representative (median) charge amount. */
  cost: number;
  frequency: BillingFrequency;
  customFrequencyDays?: number;
  category: Category;
  /** Predicted next billing date (ISO). */
  nextBillingDate: string;
  /** The transactions that make up this group. */
  occurrences: ParsedTransaction[];
  /** 0..1 — how confident we are this is a real recurring charge. */
  confidence: number;
  /** Human-readable reasons this was (or wasn't) flagged for review. */
  reasons: string[];
  /** True when the user should double-check before importing. */
  needsReview: boolean;
}

/** Result of extracting text/rows from a file, before recurring-charge detection. */
export interface ExtractionResult {
  source: ImportSource;
  fileName: string;
  transactions: ParsedTransaction[];
  /** Raw text lines (PDF/image) or a note about CSV columns, for the preview. */
  rawLines: string[];
  /** Non-fatal notes to surface to the user. */
  notes: string[];
}
