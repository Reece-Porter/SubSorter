"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Card, Field, Select, cx } from "@/components/ui";
import { IconBell, IconCheck, IconMonitor, IconMoon, IconSun } from "@/components/icons";
import { useStore } from "@/lib/store";
import { useTheme, type ThemePref } from "@/lib/theme";
import { CURRENCIES } from "@/lib/types";
import { STORAGE_KEY } from "@/lib/storage";
import { asset } from "@/lib/basePath";

function SectionHead({ title, icon }: { title: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      {icon && <span className="grid h-7 w-7 place-items-center rounded-lg bg-accent-50 text-accent-ink">{icon}</span>}
      <h2 className="text-sm font-semibold text-ink-900">{title}</h2>
    </div>
  );
}

function ThemeControl() {
  const { theme, setTheme } = useTheme();
  const opts: { value: ThemePref; label: string; icon: React.ReactNode }[] = [
    { value: "system", label: "System", icon: <IconMonitor width={15} height={15} /> },
    { value: "light", label: "Light", icon: <IconSun width={15} height={15} /> },
    { value: "dark", label: "Dark", icon: <IconMoon width={15} height={15} /> },
  ];
  return (
    <div className="inline-flex rounded-xl border border-hairline bg-paper/40 p-1">
      {opts.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => setTheme(o.value)}
          aria-pressed={theme === o.value}
          className={cx(
            "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
            theme === o.value ? "bg-card text-ink-900 shadow-card" : "text-ink-500 hover:text-ink-800"
          )}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  );
}

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

  const enableNotifications = async () => {
    if (!("Notification" in window)) return;
    let perm = Notification.permission;
    if (perm === "default") perm = await Notification.requestPermission();
    setNotifPerm(perm);
    if (perm === "granted") {
      updateSettings({ notificationsEnabled: true });
      new Notification("Reminders on", {
        body: "We'll nudge you here while Subscription Ghost is open.",
        icon: asset("/icon.svg"),
      });
    }
  };

  const disableNotifications = () => updateSettings({ notificationsEnabled: false });

  const sendTestNotification = () => {
    if (Notification.permission !== "granted") return;
    new Notification("Test reminder", {
      body: "This is how a renewal reminder will look.",
      icon: asset("/icon.svg"),
    });
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

  if (!ready) return <div className="h-40 animate-pulse rounded-2xl bg-sunken" />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="serif text-[26px] tracking-tight text-ink-900">Settings</h1>
        <p className="text-sm text-ink-500">Preferences, appearance, reminders, and your data.</p>
      </div>

      {/* Preferences */}
      <Card className="p-5">
        <SectionHead title="Preferences" />
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
          <Field label="&ldquo;Due soon&rdquo; window" hint="Renewals within this many days are highlighted.">
            <Select
              value={String(settings.dueSoonWindowDays)}
              onChange={(e) => updateSettings({ dueSoonWindowDays: Number(e.target.value) })}
            >
              {[3, 5, 7, 10, 14].map((d) => (
                <option key={d} value={d}>
                  {d} days
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Card>

      {/* Appearance */}
      <Card className="p-5">
        <SectionHead title="Appearance" />
        <p className="mt-2 text-sm text-ink-600">Match your device, or lock the app to light or dark.</p>
        <div className="mt-4">
          <ThemeControl />
        </div>
      </Card>

      {/* Reminders */}
      <Card className="p-5">
        <SectionHead title="Reminders & notifications" icon={<IconBell width={16} height={16} />} />
        <div className="mt-3 rounded-xl bg-sunken px-4 py-3 text-sm text-ink-600">
          <p>
            <strong>How reminders work here.</strong> With no account or server, Subscription Ghost can&apos;t push
            alerts when the app is fully closed. So:
          </p>
          <ul className="mt-2 space-y-1 text-ink-600">
            <li>
              • The <strong>&ldquo;Due soon&rdquo;</strong> list on your dashboard is always there when you open the app —
              your <strong>reliable</strong> reminder.
            </li>
            <li>
              • Optional <strong>browser notifications</strong> fire for renewals and cancel-reminders while the app (or
              its installed window) is open in the background.
            </li>
          </ul>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          {notifPerm === "unsupported" ? (
            <p className="text-sm text-ink-500">This browser doesn&apos;t support notifications.</p>
          ) : notifPerm === "denied" ? (
            <p className="text-sm text-ink-500">
              Notifications are blocked in your browser settings. The Due soon list still works.
            </p>
          ) : settings.notificationsEnabled && notifPerm === "granted" ? (
            <>
              <span className="inline-flex items-center gap-2 text-sm font-medium text-positive-600">
                <IconCheck width={16} height={16} /> Reminders on (while the app is open)
              </span>
              <Button variant="ghost" size="sm" onClick={sendTestNotification}>
                Send test
              </Button>
              <Button variant="ghost" size="sm" onClick={disableNotifications}>
                Turn off
              </Button>
            </>
          ) : (
            <Button variant="secondary" onClick={enableNotifications}>
              <IconBell width={16} height={16} /> Enable browser reminders
            </Button>
          )}
        </div>
      </Card>

      {/* Data */}
      <Card className="p-5">
        <SectionHead title="Your data" />
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

        <div className="mt-5 border-t border-hairline pt-4">
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
            <Button variant="ghost" size="sm" className="text-danger-600" onClick={() => setConfirmClear(true)}>
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
