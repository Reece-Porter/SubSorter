"use client";

import { cx } from "./ui";

export function StatTile({
  label,
  value,
  sub,
  tone = "default",
  size = "md",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "default" | "brand" | "positive";
  size?: "md" | "lg";
}) {
  const valueTone =
    tone === "positive" ? "text-positive-600" : tone === "brand" ? "text-brand-700" : "text-ink-900";
  return (
    <div className="rounded-2xl border border-line bg-canvas-card p-4 sm:p-5 shadow-card">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-500">{label}</p>
      <p className={cx("tnum mt-1.5 font-semibold", size === "lg" ? "text-3xl sm:text-4xl" : "text-2xl", valueTone)}>
        {value}
      </p>
      {sub && <p className="mt-1 text-xs text-ink-500">{sub}</p>}
    </div>
  );
}
