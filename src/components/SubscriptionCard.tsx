"use client";

import React, { useState } from "react";
import { Badge, Button, cx } from "./ui";
import { IconBell, IconCheck, IconEdit, IconFlag, IconPause, IconPlay, IconQuestion, IconTrash, IconUndo } from "./icons";
import type { Subscription } from "@/lib/types";
import { daysUntil, monthlyEquivalent, urgencyFor } from "@/lib/calc";
import { formatDate, formatMoney, renewalPhrase } from "@/lib/format";
import { categoryColor, categoryLabel } from "@/lib/category";
import { cancelNow, useStore } from "@/lib/store";

const FREQ_LABEL: Record<Subscription["frequency"], string> = {
  weekly: "/wk",
  monthly: "/mo",
  yearly: "/yr",
  custom: "/cycle",
};

function UrgencyStrip({ sub }: { sub: Subscription }) {
  if (sub.status === "cancelled") return <span className="block h-1 w-full rounded-full bg-positive-500/70" />;
  if (sub.status === "paused") return <span className="block h-1 w-full rounded-full bg-ink-400/50" />;
  const u = urgencyFor(sub.nextBillingDate);
  const cls: Record<string, string> = {
    overdue: "bg-urgent-500",
    critical: "bg-urgent-500",
    soon: "bg-caution-500",
    upcoming: "bg-brand-500/50",
    later: "bg-line",
  };
  return <span className={cx("block h-1 w-full rounded-full", cls[u])} />;
}

function RenewalBadge({ sub }: { sub: Subscription }) {
  if (sub.status === "cancelled")
    return <Badge tone="positive"><IconCheck width={12} height={12} /> Cancelled</Badge>;
  if (sub.status === "paused") return <Badge tone="muted">Paused</Badge>;

  const d = daysUntil(sub.nextBillingDate);
  const u = urgencyFor(sub.nextBillingDate);
  const tone = u === "critical" || u === "overdue" ? "urgent" : u === "soon" ? "caution" : "neutral";
  return (
    <Badge tone={tone}>
      {d < 0 ? renewalPhrase(sub.nextBillingDate) : d === 0 ? "Renews today" : `${d}d`}
    </Badge>
  );
}

export function SubscriptionCard({ sub, onEdit }: { sub: Subscription; onEdit: (s: Subscription) => void }) {
  const { settings, markForCancellation, undoCancellation, toggleFlagged, pauseSubscription, updateSubscription, removeSubscription } =
    useStore();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const monthly = monthlyEquivalent(sub);
  const markedForCancel = Boolean(sub.cancelReminder) && sub.status === "active";
  const isCancelled = sub.status === "cancelled";

  return (
    <div
      className={cx(
        "group rounded-2xl border bg-canvas-card shadow-card transition-shadow hover:shadow-cardHover",
        sub.flaggedUnused && sub.status === "active" ? "border-caution-500/40" : "border-line"
      )}
    >
      <div className="px-4 pt-3">
        <UrgencyStrip sub={sub} />
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: categoryColor(sub.category) }}
                aria-hidden
              />
              <h3 className={cx("truncate font-semibold text-ink-900", isCancelled && "line-through text-ink-500")}>
                {sub.name}
              </h3>
            </div>
            <p className="mt-0.5 text-xs text-ink-500">
              {categoryLabel(sub.category)} · {formatMoney(monthly, settings.currency)}/mo equivalent
            </p>
          </div>
          <div className="text-right shrink-0">
            <div className="tnum text-lg font-semibold text-ink-900">
              {formatMoney(sub.cost, settings.currency)}
              <span className="text-xs font-normal text-ink-400">{FREQ_LABEL[sub.frequency]}</span>
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <RenewalBadge sub={sub} />
          {!isCancelled && <span className="text-xs text-ink-500">{formatDate(sub.nextBillingDate)}</span>}
          {sub.flaggedUnused && sub.status === "active" && (
            <Badge tone="caution">
              <IconQuestion width={12} height={12} /> Not sure I use this
            </Badge>
          )}
        </div>

        {markedForCancel && sub.cancelReminder && (
          <div className="mt-3 flex items-start gap-2 rounded-xl bg-caution-50 px-3 py-2 text-xs text-caution-600">
            <IconBell width={14} height={14} className="mt-0.5 shrink-0" />
            <span>
              Reminder set for <strong>{formatDate(sub.cancelReminder.reminderDate)}</strong> — cancel shortly before it
              renews. Confirm below once you&apos;ve actually cancelled.
            </span>
          </div>
        )}

        {sub.notes && <p className="mt-3 text-sm text-ink-600">{sub.notes}</p>}

        {/* Actions */}
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-3">
          {isCancelled ? (
            <Button size="sm" variant="ghost" onClick={() => undoCancellation(sub.id)}>
              <IconUndo width={15} height={15} /> Reactivate
            </Button>
          ) : markedForCancel ? (
            <>
              <Button
                size="sm"
                variant="primary"
                onClick={() => updateSubscription(sub.id, cancelNow(sub))}
                title="I've cancelled this with the provider"
              >
                <IconCheck width={15} height={15} /> Confirm cancelled
              </Button>
              <Button size="sm" variant="ghost" onClick={() => undoCancellation(sub.id)}>
                Keep it
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" variant="secondary" onClick={() => markForCancellation(sub.id)}>
                <IconBell width={15} height={15} /> Cancel this
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => toggleFlagged(sub.id)}
                className={cx(sub.flaggedUnused && "text-caution-600")}
              >
                <IconFlag width={15} height={15} /> {sub.flaggedUnused ? "Unflag" : "Not sure I use this"}
              </Button>
            </>
          )}

          <div className="ml-auto flex items-center gap-1">
            {!isCancelled && (
              <button
                aria-label={sub.status === "paused" ? "Resume" : "Pause"}
                title={sub.status === "paused" ? "Resume" : "Pause"}
                onClick={() => pauseSubscription(sub.id, sub.status !== "paused")}
                className="rounded-lg p-1.5 text-ink-500 hover:bg-canvas-sunken hover:text-ink-800"
              >
                {sub.status === "paused" ? <IconPlay width={16} height={16} /> : <IconPause width={16} height={16} />}
              </button>
            )}
            <button
              aria-label="Edit"
              title="Edit"
              onClick={() => onEdit(sub)}
              className="rounded-lg p-1.5 text-ink-500 hover:bg-canvas-sunken hover:text-ink-800"
            >
              <IconEdit width={16} height={16} />
            </button>
            {confirmDelete ? (
              <span className="flex items-center gap-1">
                <button
                  onClick={() => removeSubscription(sub.id)}
                  className="rounded-lg px-2 py-1 text-xs font-medium text-urgent-600 hover:bg-urgent-50"
                >
                  Delete?
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="rounded-lg px-2 py-1 text-xs text-ink-500 hover:bg-canvas-sunken"
                >
                  No
                </button>
              </span>
            ) : (
              <button
                aria-label="Delete"
                title="Delete"
                onClick={() => setConfirmDelete(true)}
                className="rounded-lg p-1.5 text-ink-500 hover:bg-urgent-50 hover:text-urgent-600"
              >
                <IconTrash width={16} height={16} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
