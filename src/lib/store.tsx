"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Settings, Store, Subscription } from "./types";
import { emptyStore, loadStore, newId, saveStore } from "./storage";
import { addDays, monthlyEquivalent, rollForward } from "./calc";
import { sampleSubscriptions } from "./sample";

export interface NewSubscriptionInput {
  name: string;
  cost: number;
  frequency: Subscription["frequency"];
  customFrequencyDays?: number;
  nextBillingDate: string;
  category: Subscription["category"];
  notes?: string;
}

interface StoreContextValue {
  ready: boolean;
  store: Store;
  settings: Settings;
  subscriptions: Subscription[];
  addSubscription: (input: NewSubscriptionInput) => Subscription;
  addManySubscriptions: (inputs: NewSubscriptionInput[]) => void;
  updateSubscription: (id: string, patch: Partial<Subscription>) => void;
  removeSubscription: (id: string) => void;
  markForCancellation: (id: string) => void;
  undoCancellation: (id: string) => void;
  toggleFlagged: (id: string, value?: boolean) => void;
  pauseSubscription: (id: string, paused: boolean) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  loadSampleData: () => void;
  clearAll: () => void;
}

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [store, setStore] = useState<Store>(emptyStore);
  const [ready, setReady] = useState(false);
  const firstLoad = useRef(true);

  // Hydrate from localStorage on mount, then roll any past billing dates forward.
  useEffect(() => {
    const loaded = loadStore();
    let changed = false;
    const rolled = loaded.subscriptions.map((s) => {
      if (s.status !== "active") return s;
      const next = rollForward(s);
      if (next !== s.nextBillingDate) {
        changed = true;
        return { ...s, nextBillingDate: next };
      }
      return s;
    });
    if (changed) loaded.subscriptions = rolled;
    setStore(loaded);
    setReady(true);
  }, []);

  // Persist on every change (after the initial hydrate).
  useEffect(() => {
    if (firstLoad.current) {
      firstLoad.current = false;
      return;
    }
    if (ready) saveStore(store);
  }, [store, ready]);

  const mutate = useCallback((fn: (s: Store) => Store) => {
    setStore((prev) => fn(prev));
  }, []);

  const touch = () => new Date().toISOString();

  const buildSubscription = useCallback((input: NewSubscriptionInput): Subscription => {
    const ts = touch();
    return {
      id: newId(),
      name: input.name.trim(),
      cost: input.cost,
      frequency: input.frequency,
      customFrequencyDays: input.frequency === "custom" ? input.customFrequencyDays : undefined,
      nextBillingDate: input.nextBillingDate,
      category: input.category,
      status: "active",
      notes: input.notes?.trim() || undefined,
      flaggedUnused: false,
      createdAt: ts,
      updatedAt: ts,
    };
  }, []);

  const addSubscription = useCallback(
    (input: NewSubscriptionInput) => {
      const sub = buildSubscription(input);
      mutate((s) => ({ ...s, subscriptions: [...s.subscriptions, sub] }));
      return sub;
    },
    [buildSubscription, mutate]
  );

  const addManySubscriptions = useCallback(
    (inputs: NewSubscriptionInput[]) => {
      const subs = inputs.map(buildSubscription);
      mutate((s) => ({ ...s, subscriptions: [...s.subscriptions, ...subs] }));
    },
    [buildSubscription, mutate]
  );

  const updateSubscription = useCallback(
    (id: string, patch: Partial<Subscription>) => {
      mutate((s) => ({
        ...s,
        subscriptions: s.subscriptions.map((sub) =>
          sub.id === id ? { ...sub, ...patch, updatedAt: touch() } : sub
        ),
      }));
    },
    [mutate]
  );

  const removeSubscription = useCallback(
    (id: string) => {
      mutate((s) => ({ ...s, subscriptions: s.subscriptions.filter((sub) => sub.id !== id) }));
    },
    [mutate]
  );

  const markForCancellation = useCallback(
    (id: string) => {
      mutate((s) => {
        const lead = s.settings.cancelReminderLeadDays;
        return {
          ...s,
          subscriptions: s.subscriptions.map((sub) => {
            if (sub.id !== id) return sub;
            return {
              ...sub,
              cancelReminder: {
                reminderDate: addDays(sub.nextBillingDate, -lead),
                createdAt: touch(),
              },
              updatedAt: touch(),
            };
          }),
        };
      });
    },
    [mutate]
  );

  const undoCancellation = useCallback(
    (id: string) => {
      mutate((s) => ({
        ...s,
        subscriptions: s.subscriptions.map((sub) =>
          sub.id === id
            ? {
                ...sub,
                status: "active",
                cancelReminder: undefined,
                cancelledAt: undefined,
                monthlyEquivalentAtCancel: undefined,
                updatedAt: touch(),
              }
            : sub
        ),
      }));
    },
    [mutate]
  );

  const toggleFlagged = useCallback(
    (id: string, value?: boolean) => {
      mutate((s) => ({
        ...s,
        subscriptions: s.subscriptions.map((sub) =>
          sub.id === id
            ? { ...sub, flaggedUnused: value ?? !sub.flaggedUnused, updatedAt: touch() }
            : sub
        ),
      }));
    },
    [mutate]
  );

  const pauseSubscription = useCallback(
    (id: string, paused: boolean) => {
      mutate((s) => ({
        ...s,
        subscriptions: s.subscriptions.map((sub) =>
          sub.id === id ? { ...sub, status: paused ? "paused" : "active", updatedAt: touch() } : sub
        ),
      }));
    },
    [mutate]
  );

  const updateSettings = useCallback(
    (patch: Partial<Settings>) => {
      mutate((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
    },
    [mutate]
  );

  const loadSampleData = useCallback(() => {
    mutate((s) => ({ ...s, subscriptions: [...s.subscriptions, ...sampleSubscriptions()] }));
  }, [mutate]);

  const clearAll = useCallback(() => {
    mutate((s) => ({ ...s, subscriptions: [] }));
  }, [mutate]);

  const value = useMemo<StoreContextValue>(
    () => ({
      ready,
      store,
      settings: store.settings,
      subscriptions: store.subscriptions,
      addSubscription,
      addManySubscriptions,
      updateSubscription,
      removeSubscription,
      markForCancellation,
      undoCancellation,
      toggleFlagged,
      pauseSubscription,
      updateSettings,
      loadSampleData,
      clearAll,
    }),
    [
      ready,
      store,
      addSubscription,
      addManySubscriptions,
      updateSubscription,
      removeSubscription,
      markForCancellation,
      undoCancellation,
      toggleFlagged,
      pauseSubscription,
      updateSettings,
      loadSampleData,
      clearAll,
    ]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within a StoreProvider");
  return ctx;
}

/** Confirm a marked-for-cancellation subscription is actually cancelled. */
export function cancelNow(sub: Subscription): Partial<Subscription> {
  return {
    status: "cancelled",
    cancelledAt: new Date().toISOString(),
    monthlyEquivalentAtCancel: monthlyEquivalent(sub),
  };
}
