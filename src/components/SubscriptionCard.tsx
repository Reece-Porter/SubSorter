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

/** First letter of the merchant, as a coloured monogram tile. */
function Monogram({ sub, dim }: { sub: Subscription; dim?: boolean }) {
  const letter = sub.name.trim().charAt(0).toUpperCase() || "?";
  return (
    <span
      className={cx("grid h-11 w-11 shrink-0 place-items-center rounded-xl text-[17px] font-semibold text-white", dim && "opacity-50")}
      style={{ backgroundColor: categoryColor(sub.category) }}
      aria-hidden
    >
      {letter}
    </span>
  );
}

function RenewalBadge({ sub }: { sub: Subscription }) {
  if (sub.status === "cancelled")
    return (
      <Badge tone="positive">
        <IconCheck width={12} height={12} /> Cancelled
      </Badge>
    );
  if (sub.status === "paused") return <Badge tone="muted">Paused</Badge>;

  const d = daysUntil(sub.nextBillingDate);
  const u = urgencyFor(sub.nextBillingDate);
  const tone = u === "critical" || u === "overdue" ? "accent" : u === "soon" ? "accentSoft" : "neutral";
  return (
    <Badge tone={tone}>{d < 0 ? renewalPhrase(sub.nextBillingDate) : d === 0 ? "Renews today" : `Renews in ${d}d`}</Badge>
  );
}

export function SubscriptionCard({ sub, onEdit }: { sub: Subscription; onEdit: (s: Subscription) => void }) {
  const { settings, markForCancellation, undoCancellation, toggleFlagged, pauseSubscription, updateSubscription, removeSubscription } =
    useStore();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const monthly = monthlyEquivalent(sub);
  const markedForCancel = Boolean(sub.cancelReminder) && sub.status === "active";
  const isCancelled = sub.status === "cancelled";
  const u = urgencyFor(sub.nextBillingDate);
  const critical = sub.status === "active" && (u === "critical" || u === "overdue");

  return (
    <div
      className={cx(
        "group relative overflow-hidden rounded-2xl border bg-card shadow-card transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-cardHover",
        critical ? "border-accent-100" : sub.flaggedUnused && sub.status === "active" ? "border-hairline" : "border-hairline"
      )}
    >
      {/* A quiet accent edge — only for genuine urgency. */}
      {critical && <span className="absolute inset-y-0 left-0 w-[3px] bg-accent-500" aria-hidden />}

      <div className="p-4 sm:p-5">
        <div className="flex items-start gap-3.5">
          <Monogram sub={sub} dim={isCancelled} />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className={cx("truncate text-[16px] font-semibold tracking-tight text-ink-900", isCancelled && "text-ink-500 line-through")}>
                  {sub.name}
                </h3>
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-500">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: categoryColor(sub.category) }} aria-hidden />
                  {categoryLabel(sub.category)} · {formatMoney(monthly, settings.currency)}/mo
                </p>
              </div>
              <div className="shrink-0 text-right">
                <div className="serif tnum text-[22px] leading-none text-ink-900" style={{ fontVariationSettings: '"opsz" 40, "wght" 560' }}>
                  {formatMoney(sub.cost, settings.currency)}
                  <span className="ml-0.5 font-sans text-xs font-normal text-ink-300">{FREQ_LABEL[sub.frequency]}</span>
                </div>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <RenewalBadge sub={sub} />
              {!isCancelled && <span className="text-xs text-ink-500">{formatDate(sub.nextBillingDate)}</span>}
              {sub.flaggedUnused && sub.status === "active" && (
                <Badge tone="accentSoft">
                  <IconQuestion width={12} height={12} /> Not sure I use this
                </Badge>
              )}
            </div>
          </div>
        </div>

        {markedForCancel && sub.cancelReminder && (
          <div className="mt-3 flex items-start gap-2 rounded-xl bg-accent-50 px-3 py-2 text-xs text-accent-ink">
            <IconBell width={14} height={14} className="mt-0.5 shrink-0" />
            <span>
              Reminder set for <strong>{formatDate(sub.cancelReminder.reminderDate)}</strong> — cancel shortly before it
              renews, then confirm below.
            </span>
          </div>
        )}

        {sub.notes && <p className="mt-3 text-sm text-ink-600">{sub.notes}</p>}

        {/* Actions */}
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-hairline pt-3">
          {isCancelled ? (
            <Button size="sm" variant="ghost" onClick={() => undoCancellation(sub.id)}>
              <IconUndo width={15} height={15} /> Reactivate
            </Button>
          ) : markedForCancel ? (
            <>
              <Button size="sm" variant="accent" onClick={() => updateSubscription(sub.id, cancelNow(sub))} title="I've cancelled this with the provider">
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
                className={cx(sub.flaggedUnused && "text-accent-ink")}
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
                className="rounded-lg p-1.5 text-ink-500 hover:bg-sunken hover:text-ink-900"
              >
                {sub.status === "paused" ? <IconPlay width={16} height={16} /> : <IconPause width={16} height={16} />}
              </button>
            )}
            <button
              aria-label="Edit"
              title="Edit"
              onClick={() => onEdit(sub)}
              className="rounded-lg p-1.5 text-ink-500 hover:bg-sunken hover:text-ink-900"
            >
              <IconEdit width={16} height={16} />
            </button>
            {confirmDelete ? (
              <span className="flex items-center gap-1">
                <button onClick={() => removeSubscription(sub.id)} className="rounded-lg px-2 py-1 text-xs font-medium text-danger-600 hover:bg-danger-50">
                  Delete?
                </button>
                <button onClick={() => setConfirmDelete(false)} className="rounded-lg px-2 py-1 text-xs text-ink-500 hover:bg-sunken">
                  No
                </button>
              </span>
            ) : (
              <button
                aria-label="Delete"
                title="Delete"
                onClick={() => setConfirmDelete(true)}
                className="rounded-lg p-1.5 text-ink-500 hover:bg-danger-50 hover:text-danger-600"
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
