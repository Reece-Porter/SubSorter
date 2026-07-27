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
  const valueTone = tone === "positive" ? "text-positive-500" : "text-ink-900";
  return (
    <div className="rounded-2xl border border-hairline bg-card p-5 shadow-card">
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-500">{label}</p>
      <p
        className={cx(
          "serif-hero tnum mt-2.5 leading-none",
          size === "lg" ? "text-[clamp(2.5rem,7vw,3.75rem)]" : "text-3xl",
          valueTone
        )}
      >
        {value}
      </p>
      {sub && <p className="mt-2.5 text-xs text-ink-500">{sub}</p>}
    </div>
  );
}
