"use client";

import { Badge, Button, cx } from "@/components/ui";
import { formatMoney } from "@/lib/format";
import type { ExtractionResult, TransactionFlag } from "../types";
import { useStore } from "@/lib/store";

const FLAG_LABEL: Record<TransactionFlag, string> = {
  "no-date": "no date",
  "implausible-amount": "check amount",
  "garbled-merchant": "check name",
  "amount-uncertain": "amount unclear",
};

export function ExtractionPreview({
  result,
  onBack,
  onContinue,
}: {
  result: ExtractionResult;
  onBack: () => void;
  onContinue: () => void;
}) {
  const { settings } = useStore();
  const { transactions, rawLines, notes, source } = result;
  const flaggedCount = transactions.filter((t) => t.flags.length > 0).length;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-ink-900">Check what we read</h2>
        <p className="text-sm text-ink-500">
          {transactions.length} transaction{transactions.length === 1 ? "" : "s"} found in{" "}
          <span className="font-medium">{result.fileName}</span>
          {source === "image" && " (via OCR)"}. Nothing has been added yet.
        </p>
      </div>

      {notes.map((n, i) => (
        <div key={i} className="rounded-xl bg-caution-50 px-4 py-3 text-sm text-caution-600">
          {n}
        </div>
      ))}

      {flaggedCount > 0 && (
        <div className="rounded-xl bg-caution-50 px-4 py-3 text-sm text-caution-600">
          {flaggedCount} row{flaggedCount === 1 ? "" : "s"} looked unusual and {flaggedCount === 1 ? "is" : "are"} marked
          below — {source === "image" ? "OCR can misread digits, so " : ""}please double-check them.
        </div>
      )}

      {transactions.length > 0 ? (
        <div className="overflow-hidden rounded-2xl border border-line">
          <div className="max-h-80 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-canvas-sunken text-left text-xs uppercase tracking-wide text-ink-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Date</th>
                  <th className="px-3 py-2 font-medium">Description</th>
                  <th className="px-3 py-2 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {transactions.map((t) => (
                  <tr key={t.id} className={cx(t.flags.length > 0 && "bg-caution-50/40")}>
                    <td className="whitespace-nowrap px-3 py-2 tnum text-ink-600">
                      {t.date ?? <span className="text-caution-600">{t.rawDate ?? "—"}</span>}
                    </td>
                    <td className="px-3 py-2 text-ink-800">
                      {t.description}
                      {t.flags.map((f) => (
                        <Badge key={f} tone="accentSoft" className="ml-1.5 align-middle">
                          {FLAG_LABEL[f]}
                        </Badge>
                      ))}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right tnum font-medium text-ink-800">
                      {formatMoney(t.amount, settings.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <details className="rounded-2xl border border-line bg-canvas-card p-4">
          <summary className="cursor-pointer text-sm font-medium text-ink-700">
            No transactions detected — show raw extracted lines
          </summary>
          <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap rounded-xl bg-canvas-sunken p-3 text-xs text-ink-600">
            {rawLines.join("\n") || "(nothing extracted)"}
          </pre>
        </details>
      )}

      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" onClick={onBack}>
          ← Choose another file
        </Button>
        <Button variant="primary" onClick={onContinue} disabled={transactions.length === 0}>
          Find recurring charges →
        </Button>
      </div>
    </div>
  );
}
