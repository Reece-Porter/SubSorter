import { computeReminders } from "@/lib/reminders";
import { addDays, toISODate, today } from "@/lib/calc";
import type { Settings, Subscription } from "@/lib/types";

let pass = 0, fail = 0;
const ok = (n: string, c: boolean, x?: unknown) => (c ? (pass++, console.log(`  ✓ ${n}`)) : (fail++, console.log(`  ✗ ${n}`, x ?? "")));

const settings: Settings = { currency: "GBP", cancelReminderLeadDays: 3, dueSoonWindowDays: 7, notificationsEnabled: true };
const t = toISODate(today());
const base = (over: Partial<Subscription>): Subscription => ({
  id: Math.random().toString(36).slice(2), name: "X", cost: 9.99, frequency: "monthly",
  nextBillingDate: t, category: "other", status: "active", flaggedUnused: false,
  createdAt: "", updatedAt: "", ...over,
});

console.log("\n# computeReminders");
{
  const subs = [
    base({ name: "Renews in 2", nextBillingDate: addDays(t, 2) }),
    base({ name: "Renews in 10", nextBillingDate: addDays(t, 10) }), // outside window
    base({ name: "Paused", status: "paused", nextBillingDate: addDays(t, 1) }),
  ];
  const r = computeReminders(subs, settings);
  ok("only in-window active subs remind", r.length === 1 && r[0].title.includes("Renews in 2"), r.map(x=>x.title));
  ok("reminder kind is renewal", r[0]?.kind === "renewal");
}
{
  // Cancel reminder date reached → cancel reminder, not renewal.
  const sub = base({ name: "AdobeX", nextBillingDate: addDays(t, 2), cancelReminder: { reminderDate: addDays(t, -1), createdAt: "" } });
  const r = computeReminders([sub], settings);
  ok("cancel reminder fires when date reached", r.length === 1 && r[0].kind === "cancel", r);
}
{
  // Cancel reminder in the future → falls back to renewal (still in window).
  const sub = base({ name: "Fut", nextBillingDate: addDays(t, 5), cancelReminder: { reminderDate: addDays(t, 2), createdAt: "" } });
  const r = computeReminders([sub], settings);
  ok("future cancel-reminder still gives renewal", r.length === 1 && r[0].kind === "renewal", r);
}
{
  // Sorted soonest-first.
  const subs = [base({ name: "B", nextBillingDate: addDays(t, 6) }), base({ name: "A", nextBillingDate: addDays(t, 1) })];
  const r = computeReminders(subs, settings);
  ok("sorted by urgency", r[0].title.includes("A") && r[1].title.includes("B"));
}

console.log(`\nRESULT: ${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
