"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Card, Field, Select } from "@/components/ui";
import { IconBell, IconCheck } from "@/components/icons";
import { useStore } from "@/lib/store";
import { CURRENCIES } from "@/lib/types";
import { STORAGE_KEY } from "@/lib/storage";

export default function SettingsPage() {
  const { ready, settings, subscriptions, updateSettings, loadSampleData, clearAll } = useStore();
  const [notifPerm, setNotifPerm] = useState<NotificationPermission | "unsupported">("default");
  const [confirmClear, setConfirmClear] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) setNotifPerm("unsupported");
    else setNotifPerm(Notification.permission);
  }, []);

  const requestNotifications = async () => {
    if (!("Notification" in window)) return;
    const perm = await Notification.requestPermission();
    setNotifPerm(perm);
    if (perm === "granted") {
      new Notification("Notifications on", {
        body: "We'll remind you here while Subscription Ghost is open.",
      });
    }
  };

  const exportData = () => {
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
    const blob = new Blob([raw ?? "{}"], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `subscription-ghost-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importData = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        JSON.parse(String(reader.result)); // validate
        window.localStorage.setItem(STORAGE_KEY, String(reader.result));
        window.location.reload();
      } catch {
        alert("That file doesn't look like a valid Subscription Ghost backup.");
      }
    };
    reader.readAsText(file);
  };

  if (!ready) return <div className="h-40 animate-pulse rounded-2xl bg-canvas-sunken" />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink-900">Settings</h1>
        <p className="text-sm text-ink-500">Preferences, reminders, and your data.</p>
      </div>

      {/* Preferences */}
      <Card className="p-5">
        <h2 className="text-sm font-semibold text-ink-900">Preferences</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Currency">
            <Select value={settings.currency} onChange={(e) => updateSettings({ currency: e.target.value })}>
              {CURRENCIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Cancel reminder lead time" hint="Days before renewal to remind you to cancel.">
            <Select
              value={String(settings.cancelReminderLeadDays)}
              onChange={(e) => updateSettings({ cancelReminderLeadDays: Number(e.target.value) })}
            >
              {[1, 2, 3, 4, 5, 7].map((d) => (
                <option key={d} value={d}>
                  {d} {d === 1 ? "day" : "days"} before
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Card>

      {/* Reminders */}
      <Card className="p-5">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand-50 text-brand-600">
            <IconBell width={16} height={16} />
          </span>
          <h2 className="text-sm font-semibold text-ink-900">Reminders &amp; notifications</h2>
        </div>
        <p className="mt-3 text-sm text-ink-600">
          Because everything stays on your device with no account or server,{" "}
          <strong>reminders can&apos;t be pushed when the app is fully closed.</strong> The{" "}
          <strong>&ldquo;Due soon&rdquo;</strong> list on your dashboard is the reliable fallback — it&apos;s always
          there when you open the app.
        </p>
        <div className="mt-4">
          {notifPerm === "unsupported" ? (
            <p className="text-sm text-ink-500">This browser doesn&apos;t support notifications.</p>
          ) : notifPerm === "granted" ? (
            <p className="inline-flex items-center gap-2 text-sm font-medium text-positive-600">
              <IconCheck width={16} height={16} /> Browser notifications enabled (while the app is open)
            </p>
          ) : notifPerm === "denied" ? (
            <p className="text-sm text-ink-500">
              Notifications are blocked in your browser settings. The Due soon list still works.
            </p>
          ) : (
            <Button variant="secondary" onClick={requestNotifications}>
              <IconBell width={16} height={16} /> Enable browser notifications
            </Button>
          )}
          <p className="mt-2 text-xs text-ink-400">
            Full local reminder scheduling arrives with the Reminders feature. For now this grants permission so we can
            alert you while the tab is open.
          </p>
        </div>
      </Card>

      {/* Data */}
      <Card className="p-5">
        <h2 className="text-sm font-semibold text-ink-900">Your data</h2>
        <p className="mt-2 text-sm text-ink-600">
          {subscriptions.length} {subscriptions.length === 1 ? "subscription" : "subscriptions"} stored on this device.
          Export a backup to move to another browser or device.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="secondary" onClick={exportData}>
            Export backup (JSON)
          </Button>
          <Button variant="secondary" onClick={() => fileRef.current?.click()}>
            Import backup
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && importData(e.target.files[0])}
          />
          {subscriptions.length === 0 && (
            <Button variant="ghost" onClick={loadSampleData}>
              Load sample data
            </Button>
          )}
        </div>

        <div className="mt-5 border-t border-line pt-4">
          {confirmClear ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-ink-700">Delete all subscriptions? This can&apos;t be undone.</span>
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  clearAll();
                  setConfirmClear(false);
                }}
              >
                Delete everything
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirmClear(false)}>
                Cancel
              </Button>
            </div>
          ) : (
            <Button variant="ghost" size="sm" className="text-urgent-600" onClick={() => setConfirmClear(true)}>
              Clear all data
            </Button>
          )}
        </div>
      </Card>

      <p className="px-1 text-center text-xs text-ink-400">
        🔒 Subscription Ghost stores everything in your browser&apos;s local storage. Nothing is ever uploaded to a
        server.
      </p>
    </div>
  );
}
