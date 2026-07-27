"use client";

import { useMemo, useState } from "react";
import { SubscriptionCard } from "@/components/SubscriptionCard";
import { SubscriptionForm } from "@/components/SubscriptionForm";
import { IconFlag } from "@/components/icons";
import { useStore } from "@/lib/store";
import { monthlyEquivalent } from "@/lib/calc";
import { formatMoney } from "@/lib/format";
import type { Subscription } from "@/lib/types";

export default function ReviewPage() {
  const { ready, subscriptions, settings } = useStore();
  const [editing, setEditing] = useState<Subscription | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const flagged = useMemo(
    () => subscriptions.filter((s) => s.flaggedUnused && s.status === "active"),
    [subscriptions]
  );
  const potentialMonthly = flagged.reduce((sum, s) => sum + monthlyEquivalent(s), 0);

  const openEdit = (s: Subscription) => {
    setEditing(s);
    setFormOpen(true);
  };

  if (!ready) return <div className="h-40 animate-pulse rounded-2xl bg-sunken" />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="serif text-[26px] tracking-tight text-ink-900">Review</h1>
        <p className="text-sm text-ink-500">Subscriptions you&apos;ve flagged as &ldquo;not sure I use this&rdquo;.</p>
      </div>

      {flagged.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-hairline bg-card px-6 py-14 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-accent-50 text-accent-ink">
            <IconFlag width={26} height={26} />
          </span>
          <h2 className="serif mt-4 text-xl text-ink-900">Nothing to review</h2>
          <p className="mx-auto mt-1.5 max-w-sm text-sm text-ink-500">
            On any subscription card, tap <strong>&ldquo;Not sure I use this&rdquo;</strong> and it&apos;ll appear here so
            you can decide whether to keep or cancel it.
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-accent-100 bg-accent-50/60 px-5 py-4">
            <p className="max-w-md text-sm text-ink-700">
              You&apos;re unsure about <strong>{flagged.length}</strong>{" "}
              {flagged.length === 1 ? "subscription" : "subscriptions"}. Cancelling could save you
            </p>
            <p className="serif tnum text-[28px] leading-none text-accent-ink">
              {formatMoney(potentialMonthly * 12, settings.currency)}
              <span className="font-sans text-sm font-normal text-ink-500">/yr</span>
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {flagged.map((s) => (
              <SubscriptionCard key={s.id} sub={s} onEdit={openEdit} />
            ))}
          </div>
        </>
      )}

      <SubscriptionForm open={formOpen} onClose={() => setFormOpen(false)} editing={editing} />
    </div>
  );
}
