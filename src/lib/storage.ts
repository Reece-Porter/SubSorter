import type { Settings, Store, Subscription } from "./types";

export const STORAGE_KEY = "subscription-ghost:v1";

export const DEFAULT_SETTINGS: Settings = {
  currency: "GBP",
  cancelReminderLeadDays: 3,
};

export function emptyStore(): Store {
  return { version: 1, settings: { ...DEFAULT_SETTINGS }, subscriptions: [] };
}

/** Load and validate the store from localStorage, tolerating partial/legacy shapes. */
export function loadStore(): Store {
  if (typeof window === "undefined") return emptyStore();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyStore();
    const parsed = JSON.parse(raw) as Partial<Store>;
    const store = emptyStore();
    store.settings = { ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}) };
    if (Array.isArray(parsed.subscriptions)) {
      store.subscriptions = parsed.subscriptions.filter(isValidSubscription).map(normalizeSubscription);
    }
    return store;
  } catch {
    return emptyStore();
  }
}

export function saveStore(store: Store): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Quota or privacy-mode errors are non-fatal; the UI stays usable in-session.
  }
}

function isValidSubscription(s: unknown): s is Subscription {
  if (!s || typeof s !== "object") return false;
  const o = s as Record<string, unknown>;
  return typeof o.id === "string" && typeof o.name === "string" && typeof o.cost === "number";
}

/** Fill in defaults for fields that may be missing from older data. */
function normalizeSubscription(s: Subscription): Subscription {
  return {
    ...s,
    flaggedUnused: Boolean(s.flaggedUnused),
    status: s.status ?? "active",
    category: s.category ?? "other",
    frequency: s.frequency ?? "monthly",
    createdAt: s.createdAt ?? new Date().toISOString(),
    updatedAt: s.updatedAt ?? new Date().toISOString(),
  };
}

export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `sub_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
