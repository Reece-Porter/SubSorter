import type { BillingFrequency, Category } from "@/lib/types";
import { newId } from "@/lib/storage";
import { addDays, parseISODate, toISODate, today } from "@/lib/calc";
import { merchantKey } from "./parse";
import type { DetectedSubscription, ParsedTransaction } from "./types";

/** Keyword → category, used to guess a sensible category for detected charges. */
const CATEGORY_HINTS: [RegExp, Category][] = [
  [/netflix|spotify|disney|hulu|hbo|prime video|youtube|apple tv|paramount|now tv|dazn|audible|deezer|tidal/i, "streaming"],
  [/adobe|microsoft|google|dropbox|notion|github|figma|zoom|slack|icloud|1password|canva|openai|aws|namecheap|godaddy/i, "software"],
  [/gym|fitness|peloton|strava|puregym|classpass|wellness|yoga/i, "fitness"],
  [/hellofresh|gousto|deliveroo|uber eats|just eat|graze|coffee|blue apron/i, "food"],
];

/** Known subscription merchants, so a single charge can still be surfaced (low confidence). */
const KNOWN_SUBS = /netflix|spotify|disney|adobe|microsoft 365|dropbox|notion|github|amazon prime|audible|youtube premium|icloud|patreon|substack|linkedin|nordvpn|expressvpn/i;

export function guessCategory(name: string): Category {
  for (const [re, cat] of CATEGORY_HINTS) if (re.test(name)) return cat;
  return "other";
}

function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** Map a median interval (in days) to a billing frequency. */
function frequencyFromInterval(days: number): { frequency: BillingFrequency; customDays?: number; regular: boolean } {
  const near = (target: number, tol: number) => Math.abs(days - target) <= tol;
  if (near(7, 2)) return { frequency: "weekly", regular: true };
  if (near(14, 3)) return { frequency: "custom", customDays: 14, regular: true };
  if (near(30.4, 5)) return { frequency: "monthly", regular: true };
  if (near(91, 12)) return { frequency: "custom", customDays: 91, regular: true };
  if (near(365, 20)) return { frequency: "yearly", regular: true };
  return { frequency: "custom", customDays: Math.round(days), regular: false };
}

function intervalDays(a: string, b: string): number {
  return Math.abs((parseISODate(b).getTime() - parseISODate(a).getTime()) / 86_400_000);
}

/**
 * Detect likely recurring subscriptions from a list of parsed (outgoing) transactions.
 * Groups by normalised merchant, clusters by similar amount, then infers cadence.
 */
export function detectRecurring(transactions: ParsedTransaction[]): DetectedSubscription[] {
  const groups = new Map<string, ParsedTransaction[]>();
  for (const tx of transactions) {
    const key = merchantKey(tx.description);
    if (!key) continue;
    const arr = groups.get(key) ?? [];
    arr.push(tx);
    groups.set(key, arr);
  }

  const detected: DetectedSubscription[] = [];

  for (const [, txs] of groups) {
    // Cluster within a merchant by similar amount (tolerate minor fluctuation).
    for (const cluster of clusterByAmount(txs)) {
      const dated = cluster.filter((t) => t.date).sort((a, b) => (a.date! < b.date! ? -1 : 1));
      const amounts = cluster.map((t) => t.amount);
      const cost = round2(median(amounts));
      const name = pickName(cluster);
      const reasons: string[] = [];
      let confidence = 0.5;
      let needsReview = false;
      let frequency: BillingFrequency = "monthly";
      let customDays: number | undefined;
      let nextBillingDate: string;

      const known = KNOWN_SUBS.test(name);

      if (dated.length >= 2) {
        const intervals: number[] = [];
        for (let i = 1; i < dated.length; i++) intervals.push(intervalDays(dated[i - 1].date!, dated[i].date!));
        const medInterval = median(intervals);
        const freq = frequencyFromInterval(medInterval);
        frequency = freq.frequency;
        customDays = freq.customDays;

        // Regularity: how consistent are the gaps?
        const spread = intervals.length ? Math.max(...intervals) - Math.min(...intervals) : 0;
        const regular = freq.regular && spread <= Math.max(4, medInterval * 0.25);

        confidence = 0.55 + Math.min(0.3, (dated.length - 2) * 0.1) + (regular ? 0.15 : 0);
        if (!regular) {
          reasons.push("Charge dates aren't evenly spaced");
          needsReview = true;
        }
        // Amount fluctuation.
        const amtSpread = Math.max(...amounts) - Math.min(...amounts);
        if (amtSpread > Math.max(1, cost * 0.15)) {
          reasons.push(`Amount varies (${amounts.length} charges from ${Math.min(...amounts)} to ${Math.max(...amounts)})`);
          needsReview = true;
          confidence -= 0.1;
        }
        const last = dated[dated.length - 1].date!;
        nextBillingDate = predictNext(last, frequency, customDays);
      } else {
        // Single charge — only surface if it's a recognisable subscription, always for review.
        if (!known) continue;
        confidence = 0.35;
        needsReview = true;
        reasons.push("Only one charge found — confirm the amount and renewal date");
        const only = cluster[0];
        nextBillingDate = only.date ? predictNext(only.date, "monthly") : toISODate(today());
      }

      // Propagate transaction-level warnings.
      const flagged = cluster.filter((t) => t.flags.length > 0);
      if (flagged.some((t) => t.flags.includes("garbled-merchant"))) {
        reasons.push("Merchant name may be misread (OCR)");
        needsReview = true;
        confidence -= 0.15;
      }
      if (flagged.some((t) => t.flags.includes("implausible-amount"))) {
        reasons.push("An amount looks implausible");
        needsReview = true;
        confidence -= 0.15;
      }
      if (cluster.some((t) => !t.date)) {
        reasons.push("Some charges had no readable date");
        needsReview = true;
      }

      confidence = Math.max(0.1, Math.min(0.98, confidence));
      if (confidence < 0.5) needsReview = true;

      detected.push({
        id: newId(),
        name,
        cost,
        frequency,
        customFrequencyDays: customDays,
        category: guessCategory(name),
        nextBillingDate,
        occurrences: cluster,
        confidence,
        reasons,
        needsReview,
      });
    }
  }

  // Highest confidence first, then priciest.
  return detected.sort((a, b) => b.confidence - a.confidence || b.cost - a.cost);
}

/** Split a merchant's transactions into clusters of similar amount. */
function clusterByAmount(txs: ParsedTransaction[]): ParsedTransaction[][] {
  const sorted = [...txs].sort((a, b) => a.amount - b.amount);
  const clusters: ParsedTransaction[][] = [];
  for (const tx of sorted) {
    const target = clusters[clusters.length - 1];
    if (target) {
      const ref = target[0].amount;
      if (Math.abs(tx.amount - ref) <= Math.max(2, ref * 0.2)) {
        target.push(tx);
        continue;
      }
    }
    clusters.push([tx]);
  }
  return clusters;
}

function pickName(cluster: ParsedTransaction[]): string {
  // Prefer the most common cleaned description in the cluster.
  const counts = new Map<string, number>();
  for (const t of cluster) counts.set(t.description, (counts.get(t.description) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

function predictNext(lastDate: string, frequency: BillingFrequency, customDays?: number): string {
  let next = lastDate;
  const step = () => {
    const d = parseISODate(next);
    switch (frequency) {
      case "weekly":
        return addDays(next, 7);
      case "yearly":
        d.setFullYear(d.getFullYear() + 1);
        return toISODate(d);
      case "custom":
        return addDays(next, customDays && customDays > 0 ? customDays : 30);
      case "monthly":
      default:
        d.setMonth(d.getMonth() + 1);
        return toISODate(d);
    }
  };
  // Advance until strictly in the future.
  let guard = 0;
  const todayIso = toISODate(today());
  next = step();
  while (next <= todayIso && guard < 60) {
    next = step();
    guard++;
  }
  return next;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
