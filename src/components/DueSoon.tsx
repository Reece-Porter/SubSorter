"use client";

import Link from "next/link";
import { Badge, cx } from "./ui";
import { IconBell } from "./icons";
import type { Subscription } from "@/lib/types";
import { daysUntil, urgencyFor } from "@/lib/calc";
import { formatDate, formatMoney } from "@/lib/format";
import { useStore } from "@/lib/store";

/** Always-visible "due soon" panel: anything active renewing within 7 days. */
export function DueSoon({ subs }: { subs: Subscription[] }) {
  const { settings } = useStore();
  const dueSoon = subs
    .filter((s) => s.status === "active" && daysUntil(s.nextBillingDate) <= 7)
    .sort((a, b) => daysUntil(a.nextBillingDate) - daysUntil(b.nextBillingDate));

  if (dueSoon.length === 0) return null;

  return (
    <section className="rounded-2xl border border-caution-500/30 bg-caution-50/50 p-4 sm:p-5">
      <div className="flex items-center gap-2">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-caution-500/15 text-caution-600">
          <IconBell width={16} height={16} />
        </span>
        <h2 className="text-sm font-semibold text-ink-900">Due soon</h2>
        <Badge tone="caution">{dueSoon.length}</Badge>
        <span className="ml-auto text-xs text-ink-500 hidden sm:inline">Renewing within 7 days</span>
      </div>
      <ul className="mt-3 divide-y divide-caution-500/15">
        {dueSoon.map((s) => {
          const d = daysUntil(s.nextBillingDate);
          const u = urgencyFor(s.nextBillingDate);
          return (
            <li key={s.id} className="flex items-center justify-between gap-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink-800">{s.name}</p>
                <p className="text-xs text-ink-500">{formatDate(s.nextBillingDate)}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="tnum text-sm font-medium text-ink-800">
                  {formatMoney(s.cost, settings.currency)}
                </span>
                <span
                  className={cx(
                    "tnum rounded-full px-2 py-0.5 text-xs font-semibold",
                    u === "critical" || u === "overdue"
                      ? "bg-urgent-500 text-white"
                      : "bg-caution-500 text-white"
                  )}
                >
                  {d <= 0 ? "today" : `${d}d`}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-[11px] leading-relaxed text-caution-600/90">
        This in-app list is your reliable reminder. Without an account or server, Subscription Ghost can&apos;t push
        alerts when the app is closed —{" "}
        <Link href="/settings" className="underline underline-offset-2">
          enable browser notifications
        </Link>{" "}
        for alerts while it&apos;s open.
      </p>
    </section>
  );
}
