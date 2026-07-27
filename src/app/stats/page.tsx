"use client";

import { useMemo } from "react";
import { StatTile } from "@/components/StatTile";
import { IconChart } from "@/components/icons";
import { useStore } from "@/lib/store";
import { monthlyEquivalent, savingsSince, totalMonthly, totalYearly } from "@/lib/calc";
import { formatMoney, formatMoneyRounded } from "@/lib/format";
import { CATEGORY_META, categoryColor, categoryLabel } from "@/lib/category";
import type { Category } from "@/lib/types";

export default function StatsPage() {
  const { ready, subscriptions, settings } = useStore();

  const active = useMemo(() => subscriptions.filter((s) => s.status === "active"), [subscriptions]);
  const cancelled = subscriptions.filter((s) => s.status === "cancelled");

  const byCategory = useMemo(() => {
    const map = new Map<Category, { monthly: number; count: number }>();
    for (const s of active) {
      const cur = map.get(s.category) ?? { monthly: 0, count: 0 };
      cur.monthly += monthlyEquivalent(s);
      cur.count += 1;
      map.set(s.category, cur);
    }
    return (Object.keys(CATEGORY_META) as Category[])
      .map((cat) => ({ cat, ...(map.get(cat) ?? { monthly: 0, count: 0 }) }))
      .filter((r) => r.count > 0)
      .sort((a, b) => b.monthly - a.monthly);
  }, [active]);

  const monthly = totalMonthly(active);
  const yearly = totalYearly(active);
  const savings = savingsSince(subscriptions);
  const maxCat = byCategory[0]?.monthly ?? 0;

  if (!ready) return <div className="h-40 animate-pulse rounded-2xl bg-sunken" />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="serif text-[26px] tracking-tight text-ink-900">Stats</h1>
        <p className="text-sm text-ink-500">Where your recurring money goes.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatTile label="Monthly spend" value={formatMoney(monthly, settings.currency)} tone="brand" />
        <StatTile label="Yearly spend" value={formatMoneyRounded(yearly, settings.currency)} />
        <div className="col-span-2 sm:col-span-1">
          <StatTile
            label="Money you've stopped"
            value={formatMoney(savings, settings.currency)}
            sub={cancelled.length ? `Since cancelling ${cancelled.length}` : "Cancel something to start"}
            tone={savings > 0 ? "positive" : "default"}
          />
        </div>
      </div>

      <section className="rounded-2xl border border-hairline bg-card p-5 shadow-card">
        <h2 className="text-sm font-semibold text-ink-900">Spend by category</h2>
        <p className="text-xs text-ink-500">Monthly-equivalent, active subscriptions</p>

        {byCategory.length === 0 ? (
          <div className="mt-6 flex flex-col items-center gap-2 py-6 text-center text-sm text-ink-500">
            <IconChart width={28} height={28} className="text-ink-400" />
            No active subscriptions to chart yet.
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            {byCategory.map(({ cat, monthly: m, count }) => {
              const pct = maxCat > 0 ? Math.max(4, (m / maxCat) * 100) : 0;
              const share = monthly > 0 ? Math.round((m / monthly) * 100) : 0;
              return (
                <div key={cat}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 font-medium text-ink-800">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: categoryColor(cat) }} />
                      {categoryLabel(cat)}
                      <span className="text-xs font-normal text-ink-400">
                        · {count} {count === 1 ? "sub" : "subs"}
                      </span>
                    </span>
                    <span className="tnum font-semibold text-ink-900">
                      {formatMoney(m, settings.currency)}
                      <span className="ml-1.5 text-xs font-normal text-ink-400">{share}%</span>
                    </span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-sunken">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, backgroundColor: categoryColor(cat) }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {cancelled.length > 0 && (
        <section className="rounded-2xl border border-positive-500/25 bg-positive-50/40 p-5">
          <h2 className="text-sm font-semibold text-ink-900">Cancelled subscriptions</h2>
          <ul className="mt-3 divide-y divide-positive-500/15">
            {cancelled.map((s) => (
              <li key={s.id} className="flex items-center justify-between py-2 text-sm">
                <span className="text-ink-700">{s.name}</span>
                <span className="tnum text-ink-600">
                  {formatMoney(s.monthlyEquivalentAtCancel ?? monthlyEquivalent(s), settings.currency)}/mo saved
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
