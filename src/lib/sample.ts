import type { Subscription } from "./types";
import { addDays, toISODate, today } from "./calc";
import { newId } from "./storage";

/** A small, realistic sample dataset so the app is explorable before real data exists. */
export function sampleSubscriptions(): Subscription[] {
  const t = toISODate(today());
  const now = new Date().toISOString();
  const mk = (
    name: string,
    cost: number,
    frequency: Subscription["frequency"],
    daysToRenew: number,
    category: Subscription["category"],
    extra: Partial<Subscription> = {}
  ): Subscription => ({
    id: newId(),
    name,
    cost,
    frequency,
    nextBillingDate: addDays(t, daysToRenew),
    category,
    status: "active",
    flaggedUnused: false,
    createdAt: now,
    updatedAt: now,
    ...extra,
  });

  return [
    mk("Netflix", 12.99, "monthly", 2, "streaming"),
    mk("Spotify", 11.99, "monthly", 6, "streaming"),
    mk("Adobe Creative Cloud", 51.98, "monthly", 11, "software", { flaggedUnused: true }),
    mk("PureGym", 24.99, "monthly", 19, "fitness"),
    mk("Amazon Prime", 95, "yearly", 40, "streaming"),
    mk("Dropbox", 9.99, "monthly", 1, "software", { flaggedUnused: true }),
    mk("HelloFresh", 39.99, "weekly", 4, "food"),
  ];
}
