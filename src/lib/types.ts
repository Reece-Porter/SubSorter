// Core data model for Subscription Ghost.
// Everything is stored on-device in localStorage — no accounts, no backend.

export type BillingFrequency = "weekly" | "monthly" | "yearly" | "custom";

export type Category =
  | "streaming"
  | "software"
  | "fitness"
  | "food"
  | "other";

export type SubscriptionStatus = "active" | "cancelled" | "paused";

export interface CancelReminder {
  /** ISO date (YYYY-MM-DD) a few days before the next billing date. */
  reminderDate: string;
  createdAt: string;
}

export interface Subscription {
  id: string;
  name: string;
  /** Cost in major currency units, e.g. 9.99 */
  cost: number;
  frequency: BillingFrequency;
  /** Only meaningful when frequency === "custom". Length of one billing cycle in days. */
  customFrequencyDays?: number;
  /** ISO date (YYYY-MM-DD) of the next charge. */
  nextBillingDate: string;
  category: Category;
  status: SubscriptionStatus;
  notes?: string;
  /** "Not sure I use this" — surfaces the sub in the review list. */
  flaggedUnused: boolean;
  /** Set when the user marks a sub for cancellation (reminder a few days before renewal). */
  cancelReminder?: CancelReminder;
  createdAt: string;
  updatedAt: string;
  cancelledAt?: string;
  /** Monthly-equivalent cost snapshotted at cancel time, used for the savings counter. */
  monthlyEquivalentAtCancel?: number;
}

export interface Settings {
  currency: string; // ISO 4217 code, e.g. "GBP"
  /** Days before renewal to set the cancel reminder. */
  cancelReminderLeadDays: number;
  /** Renewals within this many days show in "Due soon" and trigger reminders. */
  dueSoonWindowDays: number;
  /** Whether local browser notifications are switched on (also needs OS permission). */
  notificationsEnabled: boolean;
}

export interface Store {
  version: 1;
  settings: Settings;
  subscriptions: Subscription[];
}

export const CATEGORIES: { value: Category; label: string }[] = [
  { value: "streaming", label: "Streaming" },
  { value: "software", label: "Software" },
  { value: "fitness", label: "Fitness" },
  { value: "food", label: "Food" },
  { value: "other", label: "Other" },
];

export const FREQUENCIES: { value: BillingFrequency; label: string }[] = [
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
  { value: "custom", label: "Custom" },
];

export const CURRENCIES: { value: string; label: string; symbol: string }[] = [
  { value: "GBP", label: "British Pound (£)", symbol: "£" },
  { value: "USD", label: "US Dollar ($)", symbol: "$" },
  { value: "EUR", label: "Euro (€)", symbol: "€" },
  { value: "CAD", label: "Canadian Dollar ($)", symbol: "$" },
  { value: "AUD", label: "Australian Dollar ($)", symbol: "$" },
];
