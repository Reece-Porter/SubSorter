import type { ImportSource, ParsedTransaction } from "./types";
import { buildTransaction, parseAmount, parseDateToken, resolveDateOrder, type DateToken } from "./parse";

/** Money token near the end of a statement line, incl. optional currency + CR/DR. */
const MONEY_RE = /[£$€]?\s?-?\(?\d[\d.,]*\d\)?(?:\s?(?:CR|DR))?/gi;
const DATE_ANY_RE =
  /\b(\d{4}-\d{1,2}-\d{1,2}|\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}|\d{1,2}\s*[A-Za-z]{3,9}\.?\s*\d{0,4}|[A-Za-z]{3,9}\.?\s+\d{1,2},?\s*\d{0,4})\b/;

/**
 * Parse free-text statement lines (from PDF text or OCR) into transactions.
 * Each line typically looks like: <date> <merchant ...> <amount>.
 */
export function extractFromTextLines(
  rawText: string,
  fileName: string,
  source: ImportSource
): { transactions: ParsedTransaction[]; rawLines: string[] } {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter((l) => l.length > 0);

  interface Staged {
    line: string;
    description: string;
    token: DateToken | null;
    amountStr: string;
  }
  const staged: Staged[] = [];

  for (const line of lines) {
    // Amount: take the last money-like match on the line (statement amounts sit at the end).
    const moneyMatches = [...line.matchAll(MONEY_RE)].filter((m) => /\d/.test(m[0]));
    if (moneyMatches.length === 0) continue;
    const amountStr = moneyMatches[moneyMatches.length - 1][0];

    // Date: first date-like token anywhere on the line.
    const dateMatch = line.match(DATE_ANY_RE);
    const token = dateMatch ? parseDateToken(dateMatch[0]) : null;

    // Description: the line with date + amount stripped out.
    let description = line;
    if (dateMatch) description = description.replace(dateMatch[0], " ");
    description = description.replace(amountStr, " ").replace(/\s+/g, " ").trim();
    if (!description) continue;

    staged.push({ line, description, token, amountStr });
  }

  // Resolve DD/MM vs MM/DD across the whole document.
  const resolved = resolveDateOrder(staged.map((s) => s.token).filter(Boolean) as DateToken[]);
  let ri = 0;
  const tokens = staged.map((s) => {
    if (!s.token) return null;
    const iso = resolved[ri++];
    return { ...s.token, iso: iso ?? s.token.iso };
  });

  const transactions: ParsedTransaction[] = [];
  staged.forEach((s, idx) => {
    const amount = parseAmount(s.amountStr);
    if (!amount || amount.value == null || !amount.outgoing) return;
    const tx = buildTransaction({
      rawLine: s.line,
      description: s.description,
      dateToken: tokens[idx],
      amount,
    });
    if (tx) transactions.push(tx);
  });

  return { transactions, rawLines: lines.slice(0, 40) };
}
