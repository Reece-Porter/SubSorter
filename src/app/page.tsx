"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui";
import { IconPlus } from "@/components/icons";
import { StatTile } from "@/components/StatTile";
import { DueSoon } from "@/components/DueSoon";
import { SubscriptionCard } from "@/components/SubscriptionCard";
import { SubscriptionForm } from "@/components/SubscriptionForm";
import { EmptyState } from "@/components/EmptyState";
import { useStore } from "@/lib/store";
import { daysUntil, savingsSince, totalMonthly, totalYearly } from "@/lib/calc";
import { formatMoney, formatMoneyRounded } from "@/lib/format";
import type { Subscription } from "@/lib/types";

export default function DashboardPage() {
  const { ready, subscriptions, settings } = useStore();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Subscription | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  const active = useMemo(
    () =>
      subscriptions
        .filter((s) => s.status === "active")
        .sort((a, b) => daysUntil(a.nextBillingDate) - daysUntil(b.nextBillingDate)),
    [subscriptions]
  );
  const paused = subscriptions.filter((s) => s.status === "paused");
  const cancelled = subscriptions.filter((s) => s.status === "cancelled");

  const monthly = totalMonthly(active);
  const yearly = totalYearly(active);
  const savings = savingsSince(subscriptions);

  const openAdd = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (s: Subscription) => {
    setEditing(s);
    setFormOpen(true);
  };

  if (!ready) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-40 animate-pulse rounded-lg bg-canvas-sunken" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-canvas-sunken" />
          ))}
        </div>
        <div className="h-40 animate-pulse rounded-2xl bg-canvas-sunken" />
      </div>
    );
  }

  const isEmpty = subscriptions.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ink-900">Dashboard</h1>
          <p className="text-sm text-ink-500">
            {active.length} active {active.length === 1 ? "subscription" : "subscriptions"}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Link href="/import">
            <Button variant="secondary">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 16V4M8 8l4-4 4 4M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
              </svg>
              <span className="hidden sm:inline">Import</span>
            </Button>
          </Link>
          <Button variant="primary" onClick={openAdd}>
            <IconPlus width={18} height={18} />
            <span className="hidden sm:inline">Add subscription</span>
            <span className="sm:hidden">Add</span>
          </Button>
        </div>
      </div>

      {isEmpty ? (
        <EmptyState onAdd={openAdd} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="col-span-2 sm:col-span-1">
              <StatTile
                label="Monthly spend"
                value={formatMoney(monthly, settings.currency)}
                sub="Across active subscriptions"
                tone="brand"
                size="lg"
              />
            </div>
            <StatTile label="Yearly spend" value={formatMoneyRounded(yearly, settings.currency)} sub="Projected over 12 months" />
            <StatTile
              label="Stopped so far"
              value={formatMoney(savings, settings.currency)}
              sub={cancelled.length ? `${cancelled.length} cancelled` : "Nothing cancelled yet"}
              tone={savings > 0 ? "positive" : "default"}
            />
          </div>

          <DueSoon subs={subscriptions} />

          <section>
            <h2 className="mb-3 text-sm font-semibold text-ink-700">Active — soonest renewals first</h2>
            {active.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-line bg-canvas-card px-4 py-8 text-center text-sm text-ink-500">
                No active subscriptions. Add one to get started.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {active.map((s) => (
                  <SubscriptionCard key={s.id} sub={s} onEdit={openEdit} />
                ))}
              </div>
            )}
          </section>

          {(paused.length > 0 || cancelled.length > 0) && (
            <section>
              <button
                onClick={() => setShowInactive((v) => !v)}
                className="text-sm font-medium text-ink-600 hover:text-ink-900"
              >
                {showInactive ? "Hide" : "Show"} paused &amp; cancelled ({paused.length + cancelled.length})
              </button>
              {showInactive && (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {[...paused, ...cancelled].map((s) => (
                    <SubscriptionCard key={s.id} sub={s} onEdit={openEdit} />
                  ))}
                </div>
              )}
            </section>
          )}
        </>
      )}

      <SubscriptionForm open={formOpen} onClose={() => setFormOpen(false)} editing={editing} />
    </div>
  );
}
