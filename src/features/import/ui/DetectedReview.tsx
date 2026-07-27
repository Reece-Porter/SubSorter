"use client";

import { useState } from "react";
import { Badge, Button, Input, Select, cx } from "@/components/ui";
import { CATEGORIES, FREQUENCIES, type Subscription } from "@/lib/types";
import { formatDate, formatMoney } from "@/lib/format";
import { categoryColor } from "@/lib/category";
import { useStore, type NewSubscriptionInput } from "@/lib/store";
import type { DetectedSubscription } from "../types";

interface RowState extends DetectedSubscription {
  included: boolean;
  editing: boolean;
}

function ConfidenceBadge({ c }: { c: number }) {
  if (c >= 0.75) return <Badge tone="positive">High confidence</Badge>;
  if (c >= 0.5) return <Badge tone="neutral">Likely</Badge>;
  return <Badge tone="accentSoft">Uncertain</Badge>;
}

export function DetectedReview({
  detected,
  onDone,
  onBack,
}: {
  detected: DetectedSubscription[];
  onDone: (count: number) => void;
  onBack: () => void;
}) {
  const { addManySubscriptions, settings } = useStore();
  const [rows, setRows] = useState<RowState[]>(() =>
    detected.map((d) => ({ ...d, included: !d.needsReview, editing: false }))
  );

  const update = (id: string, patch: Partial<RowState>) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const includedRows = rows.filter((r) => r.included);
  const includedMonthly = includedRows.reduce((s, r) => {
    const mult = r.frequency === "yearly" ? 1 / 12 : r.frequency === "weekly" ? 52 / 12 : 1;
    return s + r.cost * mult;
  }, 0);

  const doImport = () => {
    const inputs: NewSubscriptionInput[] = includedRows.map((r) => ({
      name: r.name,
      cost: r.cost,
      frequency: r.frequency,
      customFrequencyDays: r.customFrequencyDays,
      nextBillingDate: r.nextBillingDate,
      category: r.category,
      notes: `Imported — detected from ${r.occurrences.length} charge${r.occurrences.length === 1 ? "" : "s"}.`,
    }));
    addManySubscriptions(inputs);
    onDone(inputs.length);
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-ink-900">Review detected subscriptions</h2>
        <p className="text-sm text-ink-500">
          Confirm, edit, or dismiss each one. Uncertain matches start unchecked — nothing is added until you import.
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-hairline bg-card px-6 py-10 text-center text-sm text-ink-500">
          No recurring charges stood out. You can go back and try another statement, or add subscriptions manually.
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <div
              key={r.id}
              className={cx(
                "rounded-2xl border bg-card p-4 shadow-card transition-opacity",
                r.included ? "border-hairline" : "border-hairline opacity-60"
              )}
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={r.included}
                  onChange={(e) => update(r.id, { included: e.target.checked })}
                  className="mt-1 h-4 w-4 shrink-0 accent-accent-500"
                  aria-label={`Include ${r.name}`}
                />
                <div className="min-w-0 flex-1">
                  {r.editing ? (
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Input value={r.name} onChange={(e) => update(r.id, { name: e.target.value })} placeholder="Name" />
                      <Input
                        inputMode="decimal"
                        className="tnum"
                        value={String(r.cost)}
                        onChange={(e) => update(r.id, { cost: Number(e.target.value) || 0 })}
                        placeholder="Cost"
                      />
                      <Select
                        value={r.frequency}
                        onChange={(e) => update(r.id, { frequency: e.target.value as Subscription["frequency"] })}
                      >
                        {FREQUENCIES.map((f) => (
                          <option key={f.value} value={f.value}>
                            {f.label}
                          </option>
                        ))}
                      </Select>
                      <Select
                        value={r.category}
                        onChange={(e) => update(r.id, { category: e.target.value as Subscription["category"] })}
                      >
                        {CATEGORIES.map((c) => (
                          <option key={c.value} value={c.value}>
                            {c.label}
                          </option>
                        ))}
                      </Select>
                      <Input
                        type="date"
                        className="tnum"
                        value={r.nextBillingDate}
                        onChange={(e) => update(r.id, { nextBillingDate: e.target.value })}
                      />
                      <Button size="sm" variant="secondary" onClick={() => update(r.id, { editing: false })}>
                        Done
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: categoryColor(r.category) }}
                          />
                          <span className="truncate font-semibold text-ink-900">{r.name}</span>
                        </div>
                        <span className="tnum shrink-0 font-semibold text-ink-900">
                          {formatMoney(r.cost, settings.currency)}
                          <span className="text-xs font-normal text-ink-400">
                            /{r.frequency === "yearly" ? "yr" : r.frequency === "weekly" ? "wk" : r.frequency === "custom" ? "cycle" : "mo"}
                          </span>
                        </span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-500">
                        <ConfidenceBadge c={r.confidence} />
                        <span>Next: {formatDate(r.nextBillingDate)}</span>
                        <span>
                          {r.occurrences.length} charge{r.occurrences.length === 1 ? "" : "s"} found
                        </span>
                      </div>
                      {r.reasons.length > 0 && (
                        <ul className="mt-2 space-y-0.5">
                          {r.reasons.map((reason, i) => (
                            <li key={i} className="flex items-start gap-1.5 text-xs text-accent-ink">
                              <span aria-hidden>⚠</span>
                              {reason}
                            </li>
                          ))}
                        </ul>
                      )}
                    </>
                  )}
                </div>
              </div>

              {!r.editing && (
                <div className="mt-3 flex items-center gap-3 border-t border-hairline pt-2.5 pl-7">
                  <button className="text-xs font-medium text-accent-ink hover:underline" onClick={() => update(r.id, { editing: true })}>
                    Edit
                  </button>
                  <button
                    className="text-xs font-medium text-ink-500 hover:text-danger-600"
                    onClick={() => setRows((rs) => rs.filter((x) => x.id !== r.id))}
                  >
                    Dismiss
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="sticky bottom-16 sm:bottom-4 z-10 rounded-2xl border border-hairline bg-card/95 p-3 shadow-pop backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm">
            <span className="font-semibold text-ink-900">{includedRows.length} selected</span>
            <span className="ml-2 text-ink-500 tnum">
              {formatMoney(includedMonthly, settings.currency)}/mo
            </span>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onBack}>
              Back
            </Button>
            <Button variant="primary" onClick={doImport} disabled={includedRows.length === 0}>
              Import {includedRows.length > 0 ? includedRows.length : ""}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
