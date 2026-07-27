import type { ExtractionResult, ParsedTransaction } from "./types";
import { buildTransaction, parseAmount, parseDateToken, resolveDateOrder, type DateToken } from "./parse";

/** Parse CSV text into rows, handling quotes, escaped quotes, and , ; or tab delimiters. */
export function parseCsv(text: string): string[][] {
  const delimiter = detectDelimiter(text);
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === delimiter) {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((f) => f.trim() !== "")) rows.push(row);
      row = [];
    } else {
      field += c;
    }
  }
  if (field !== "" || row.length) {
    row.push(field);
    if (row.some((f) => f.trim() !== "")) rows.push(row);
  }
  return rows;
}

function detectDelimiter(text: string): string {
  const sample = text.split(/\r?\n/).slice(0, 5).join("\n");
  const counts: Record<string, number> = { ",": 0, ";": 0, "\t": 0 };
  for (const d of Object.keys(counts)) counts[d] = (sample.match(new RegExp(`\\${d === "\t" ? "t" : d}`, "g")) || []).length;
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0] || ",";
}

interface ColumnMap {
  date: number;
  description: number;
  amount: number;
  debit: number;
  credit: number;
  hasHeader: boolean;
}

const DATE_HEADERS = /date|posted|transaction date/i;
const DESC_HEADERS = /desc|detail|narrative|merchant|payee|reference|memo|name|particulars/i;
const AMOUNT_HEADERS = /amount|value|sum/i;
const DEBIT_HEADERS = /debit|withdrawal|paid out|money out|out|dr\b/i;
const CREDIT_HEADERS = /credit|deposit|paid in|money in|in\b|cr\b/i;

/** Work out which columns hold the date, description and amount(s). */
function mapColumns(rows: string[][]): ColumnMap {
  const header = rows[0] ?? [];
  const looksLikeHeader = header.some((h) => DATE_HEADERS.test(h) || DESC_HEADERS.test(h) || AMOUNT_HEADERS.test(h));

  const map: ColumnMap = { date: -1, description: -1, amount: -1, debit: -1, credit: -1, hasHeader: looksLikeHeader };

  if (looksLikeHeader) {
    header.forEach((h, i) => {
      const t = h.trim();
      if (map.date < 0 && DATE_HEADERS.test(t)) map.date = i;
      if (map.debit < 0 && DEBIT_HEADERS.test(t)) map.debit = i;
      if (map.credit < 0 && CREDIT_HEADERS.test(t)) map.credit = i;
      if (map.amount < 0 && AMOUNT_HEADERS.test(t)) map.amount = i;
    });
    // Description: prefer a matching header, else the widest text column.
    header.forEach((h, i) => {
      if (map.description < 0 && DESC_HEADERS.test(h.trim())) map.description = i;
    });
  }

  // Fall back to content sniffing for anything still unknown.
  const body = rows.slice(looksLikeHeader ? 1 : 0, looksLikeHeader ? 21 : 20);
  const colCount = Math.max(...rows.map((r) => r.length), 0);
  const stats = Array.from({ length: colCount }, (_, c) => {
    let dateHits = 0;
    let amountHits = 0;
    let textLen = 0;
    for (const r of body) {
      const cell = (r[c] ?? "").trim();
      if (!cell) continue;
      if (parseDateToken(cell)) dateHits++;
      const amt = parseAmount(cell);
      if (amt.value != null && /\d/.test(cell) && !parseDateToken(cell)) amountHits++;
      if (!/^\W*\d/.test(cell)) textLen += cell.length;
    }
    return { c, dateHits, amountHits, textLen };
  });

  if (map.date < 0) map.date = stats.slice().sort((a, b) => b.dateHits - a.dateHits)[0]?.dateHits ? stats.slice().sort((a, b) => b.dateHits - a.dateHits)[0].c : -1;
  if (map.description < 0) map.description = stats.slice().sort((a, b) => b.textLen - a.textLen)[0]?.c ?? -1;
  if (map.amount < 0 && map.debit < 0) {
    const best = stats.filter((s) => s.c !== map.date && s.c !== map.description).sort((a, b) => b.amountHits - a.amountHits)[0];
    if (best?.amountHits) map.amount = best.c;
  }
  return map;
}

export function extractFromCsv(text: string, fileName: string): ExtractionResult {
  const rows = parseCsv(text);
  const notes: string[] = [];
  if (rows.length === 0) {
    return { source: "csv", fileName, transactions: [], rawLines: [], notes: ["The file appears to be empty."] };
  }
  const map = mapColumns(rows);
  const body = map.hasHeader ? rows.slice(1) : rows;

  if (map.description < 0 || (map.amount < 0 && map.debit < 0 && map.credit < 0)) {
    notes.push(
      "Couldn't confidently find description and amount columns — some rows may be misread. Please check the preview."
    );
  }

  // First pass: collect date tokens so we can resolve DD/MM vs MM/DD across the file.
  const staged = body.map((r) => {
    const dateCell = map.date >= 0 ? r[map.date] ?? "" : r.find((c) => parseDateToken(c)) ?? "";
    const token = parseDateToken(dateCell);
    return { r, token };
  });
  const resolved = resolveDateOrder(staged.map((s) => s.token).filter(Boolean) as DateToken[]);
  // Re-thread resolved ISO dates back onto tokens (only ambiguous ones changed).
  let ri = 0;
  const tokens: (DateToken | null)[] = staged.map((s) => {
    if (!s.token) return null;
    const iso = resolved[ri++];
    return { ...s.token, iso: iso ?? s.token.iso };
  });

  // If a single amount column mixes positive and negative values, negatives are
  // charges and positives are money in. If it's all one sign, treat all as charges.
  const amountColHasNegatives =
    map.amount >= 0 &&
    body.some((r) => /[-(]/.test((r[map.amount] ?? "").trim()) || /\bDR\b/i.test(r[map.amount] ?? ""));

  const transactions: ParsedTransaction[] = [];
  staged.forEach(({ r }, idx) => {
    const description = map.description >= 0 ? r[map.description] ?? "" : r.join(" ");
    const amount = readAmount(r, map, amountColHasNegatives);
    if (!amount || !amount.outgoing) return; // skip credits / money in
    const tx = buildTransaction({
      rawLine: r.join(" · "),
      description,
      dateToken: tokens[idx],
      amount,
    });
    if (tx) transactions.push(tx);
  });

  return {
    source: "csv",
    fileName,
    transactions,
    rawLines: rows.slice(0, 12).map((r) => r.join(" | ")),
    notes,
  };
}

function readAmount(row: string[], map: ColumnMap, amountColHasNegatives: boolean) {
  if (map.debit >= 0 || map.credit >= 0) {
    const debit = map.debit >= 0 ? parseAmount(row[map.debit] ?? "") : { value: null, outgoing: true, uncertain: false };
    const credit = map.credit >= 0 ? parseAmount(row[map.credit] ?? "") : { value: null, outgoing: false, uncertain: false };
    if (debit.value) return { value: debit.value, outgoing: true, uncertain: debit.uncertain };
    if (credit.value) return { value: credit.value, outgoing: false, uncertain: credit.uncertain };
    return null;
  }
  if (map.amount >= 0) {
    const cell = (row[map.amount] ?? "").trim();
    const parsed = parseAmount(cell);
    if (parsed.value == null) return null;
    const rawNegative = /^[-(]/.test(cell) || /-/.test(cell) || /\bDR\b/i.test(cell);
    const isCredit = /\bCR\b/i.test(cell) || cell.trimStart().startsWith("+");
    // In a signed column, an unsigned/positive value means money in.
    const outgoing = rawNegative ? true : isCredit ? false : amountColHasNegatives ? false : true;
    return { value: parsed.value, outgoing, uncertain: parsed.uncertain };
  }
  return null;
}
