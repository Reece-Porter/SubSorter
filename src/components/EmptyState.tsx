"use client";

import Link from "next/link";
import { Button } from "./ui";
import { IconGhost, IconPlus } from "./icons";
import { useStore } from "@/lib/store";

export function EmptyState({ onAdd }: { onAdd: () => void }) {
  const { loadSampleData } = useStore();
  return (
    <div className="rounded-2xl border border-dashed border-line bg-canvas-card px-6 py-14 text-center">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-500">
        <IconGhost width={28} height={28} />
      </span>
      <h2 className="mt-4 text-lg font-semibold text-ink-900">No subscriptions tracked yet</h2>
      <p className="mx-auto mt-1.5 max-w-sm text-sm text-ink-500">
        Add the recurring payments you know about to see your monthly and yearly spend, and start spotting the ones
        you&apos;ve forgotten.
      </p>
      <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-2">
        <Button variant="primary" onClick={onAdd}>
          <IconPlus width={18} height={18} /> Add your first subscription
        </Button>
        <Link href="/import">
          <Button variant="secondary">Import from a statement</Button>
        </Link>
        <Button variant="ghost" onClick={loadSampleData}>
          Explore with sample data
        </Button>
      </div>
    </div>
  );
}
