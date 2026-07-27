import type { Settings, Subscription } from "./types";
import { daysUntil, toISODate, today } from "./calc";
import { formatMoney } from "./format";

export type ReminderKind = "renewal" | "cancel";

export interface Reminder {
  id: string; // dedupe key: `${subId}:${kind}`
  subId: string;
  kind: ReminderKind;
  title: string;
  body: string;
  /** Lower = more urgent (days until the relevant date). */
  order: number;
}

/**
 * Compute the reminders currently "live" for a set of subscriptions:
 *  - renewal: an active sub renewing within the due-soon window
 *  - cancel:  a sub marked for cancellation whose reminder date has arrived
 */
export function computeReminders(subs: Subscription[], settings: Settings): Reminder[] {
  const out: Reminder[] = [];
  for (const s of subs) {
    if (s.status !== "active") continue;

    // Cancel reminder — the user asked to be nudged shortly before renewal.
    if (s.cancelReminder && daysUntil(s.cancelReminder.reminderDate) <= 0) {
      const d = daysUntil(s.nextBillingDate);
      out.push({
        id: `${s.id}:cancel`,
        subId: s.id,
        kind: "cancel",
        title: `Cancel ${s.name}?`,
        body:
          d >= 0
            ? `It renews ${d === 0 ? "today" : `in ${d} day${d === 1 ? "" : "s"}`} for ${formatMoney(s.cost, settings.currency)}. Cancel now if you're done with it.`
            : `Its renewal date has passed — check whether you were charged.`,
        order: d,
      });
      continue; // don't double-remind the same sub for renewal
    }

    // Renewal reminder — anything renewing within the window.
    const d = daysUntil(s.nextBillingDate);
    if (d >= 0 && d <= settings.dueSoonWindowDays) {
      out.push({
        id: `${s.id}:renewal`,
        subId: s.id,
        kind: "renewal",
        title: `${s.name} renews ${d === 0 ? "today" : d === 1 ? "tomorrow" : `in ${d} days`}`,
        body: `${formatMoney(s.cost, settings.currency)} on ${s.nextBillingDate}.`,
        order: d,
      });
    }
  }
  return out.sort((a, b) => a.order - b.order);
}

/* --- Per-day de-duplication so we never spam the same reminder twice a day --- */

const NOTIFIED_KEY = "subscription-ghost:notified";

type NotifiedMap = Record<string, string>; // reminderId -> ISO date last notified

function loadNotified(): NotifiedMap {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(NOTIFIED_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveNotified(map: NotifiedMap): void {
  if (typeof window === "undefined") return;
  const todayIso = toISODate(today());
  // Prune anything not from today to keep the map small.
  const pruned: NotifiedMap = {};
  for (const [k, v] of Object.entries(map)) if (v === todayIso) pruned[k] = v;
  try {
    window.localStorage.setItem(NOTIFIED_KEY, JSON.stringify(pruned));
  } catch {
    /* ignore quota errors */
  }
}

/** Reminders not yet notified today. */
export function unnotifiedToday(reminders: Reminder[]): Reminder[] {
  const map = loadNotified();
  const todayIso = toISODate(today());
  return reminders.filter((r) => map[r.id] !== todayIso);
}

export function markNotified(reminders: Reminder[]): void {
  const map = loadNotified();
  const todayIso = toISODate(today());
  for (const r of reminders) map[r.id] = todayIso;
  saveNotified(map);
}
