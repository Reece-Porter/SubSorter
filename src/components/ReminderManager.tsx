"use client";

import { useEffect, useRef } from "react";
import { useStore } from "@/lib/store";
import { computeReminders, markNotified, unnotifiedToday, type Reminder } from "@/lib/reminders";
import { asset } from "@/lib/basePath";

const CHECK_INTERVAL_MS = 5 * 60 * 1000; // re-check every 5 minutes while open

/** Registers the service worker and fires local reminder notifications while the app is open. */
export function ReminderManager() {
  const { ready, subscriptions, settings } = useStore();
  const swReg = useRef<ServiceWorkerRegistration | null>(null);

  // Register the service worker once.
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register(asset("/sw.js"))
      .then((reg) => {
        swReg.current = reg;
      })
      .catch(() => {
        /* SW is an enhancement; app works without it */
      });
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (typeof window === "undefined" || !("Notification" in window)) return;

    const fire = () => {
      if (!settings.notificationsEnabled || Notification.permission !== "granted") return;
      if (document.visibilityState !== "visible") return; // only while the tab is open/focused

      const reminders = computeReminders(subscriptions, settings);
      const pending = unnotifiedToday(reminders);
      if (pending.length === 0) return;

      // Summarise if there are several, so we don't stack many notifications.
      const toSend: { title: string; body: string; tag: string }[] =
        pending.length > 3
          ? [
              {
                title: `${pending.length} subscriptions need attention`,
                body: pending
                  .slice(0, 4)
                  .map((r) => r.title)
                  .join(" · "),
                tag: "subghost-summary",
              },
            ]
          : pending.map((r: Reminder) => ({ title: r.title, body: r.body, tag: r.id }));

      const reg = swReg.current;
      if (reg && "showNotification" in reg) {
        // Prefer the SW so clicks can refocus the app.
        navigator.serviceWorker.controller?.postMessage({ type: "notify", notifications: toSend });
        // controller can be null on first load; fall back to direct SW call.
        if (!navigator.serviceWorker.controller) {
          toSend.forEach((n) => reg.showNotification(n.title, { body: n.body, tag: n.tag, icon: asset("/icon.svg") }));
        }
      } else {
        toSend.forEach((n) => new Notification(n.title, { body: n.body, tag: n.tag, icon: asset("/icon.svg") }));
      }
      markNotified(pending);
    };

    // Check shortly after load, on tab focus, and on an interval.
    const t = setTimeout(fire, 2500);
    const onVisible = () => document.visibilityState === "visible" && fire();
    document.addEventListener("visibilitychange", onVisible);
    const interval = setInterval(fire, CHECK_INTERVAL_MS);
    return () => {
      clearTimeout(t);
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [ready, subscriptions, settings]);

  return null;
}
