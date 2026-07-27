"use client";

import Link from "next/link";
import { Button } from "./ui";
import { IconGhost, IconPlus } from "./icons";
import { useStore } from "@/lib/store";

export function EmptyState({ onAdd }: { onAdd: () => void }) {
  const { loadSampleData } = useStore();
  return (
    <div className="rounded-[22px] border border-dashed border-hairline bg-gradient-to-b from-card to-transparent px-6 py-14 text-center">
      <span className="mx-auto grid h-[72px] w-[72px] place-items-center rounded-[20px] border border-accent-100 bg-accent-50 text-accent-500">
        <IconGhost width={34} height={34} />
      </span>
      <h2 className="serif mt-5 text-[27px] tracking-tight text-ink-900" style={{ fontVariationSettings: '"opsz" 72, "wght" 540' }}>
        No subscriptions haunting you yet.
      </h2>
      <p className="mx-auto mt-2 max-w-[44ch] text-sm text-ink-600">
        Add the recurring payments you know about, or import a bank statement — everything stays on this device. Then
        we&apos;ll surface what renews soon and what you&apos;ve forgotten.
      </p>
      <div className="mt-6 flex flex-col items-center justify-center gap-2 sm:flex-row">
        <Button variant="primary" onClick={onAdd}>
          <IconPlus width={18} height={18} /> Add your first subscription
        </Button>
        <Link href="/import">
          <Button variant="secondary">Import a statement</Button>
        </Link>
        <Button variant="ghost" onClick={loadSampleData}>
          Explore with sample data
        </Button>
      </div>
    </div>
  );
}
