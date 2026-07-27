"use client";

import React, { useState } from "react";
import { Button, Field, Input, Modal, Select, Textarea } from "./ui";
import { CATEGORIES, FREQUENCIES, type Subscription } from "@/lib/types";
import { toISODate, today } from "@/lib/calc";
import { useStore, type NewSubscriptionInput } from "@/lib/store";
import { currencySymbol } from "@/lib/format";

interface Props {
  open: boolean;
  onClose: () => void;
  /** When provided, the form edits this subscription instead of creating a new one. */
  editing?: Subscription | null;
}

interface FormState {
  name: string;
  cost: string;
  frequency: Subscription["frequency"];
  customFrequencyDays: string;
  nextBillingDate: string;
  category: Subscription["category"];
  notes: string;
}

function initialState(editing?: Subscription | null): FormState {
  if (editing) {
    return {
      name: editing.name,
      cost: String(editing.cost),
      frequency: editing.frequency,
      customFrequencyDays: editing.customFrequencyDays ? String(editing.customFrequencyDays) : "30",
      nextBillingDate: editing.nextBillingDate,
      category: editing.category,
      notes: editing.notes ?? "",
    };
  }
  return {
    name: "",
    cost: "",
    frequency: "monthly",
    customFrequencyDays: "30",
    nextBillingDate: toISODate(today()),
    category: "streaming",
    notes: "",
  };
}

export function SubscriptionForm({ open, onClose, editing }: Props) {
  const { addSubscription, updateSubscription, settings } = useStore();
  const [form, setForm] = useState<FormState>(() => initialState(editing));
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset the form whenever it opens (for a new sub or a different edit target).
  React.useEffect(() => {
    if (open) {
      setForm(initialState(editing));
      setErrors({});
    }
  }, [open, editing]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = "Give it a name.";
    const cost = Number(form.cost);
    if (!form.cost.trim() || Number.isNaN(cost) || cost < 0) next.cost = "Enter a valid amount.";
    if (!form.nextBillingDate) next.nextBillingDate = "Pick the next billing date.";
    if (form.frequency === "custom") {
      const d = Number(form.customFrequencyDays);
      if (!Number.isFinite(d) || d < 1) next.customFrequencyDays = "Enter the cycle length in days.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const payload: NewSubscriptionInput = {
      name: form.name,
      cost: Number(form.cost),
      frequency: form.frequency,
      customFrequencyDays: form.frequency === "custom" ? Number(form.customFrequencyDays) : undefined,
      nextBillingDate: form.nextBillingDate,
      category: form.category,
      notes: form.notes,
    };
    if (editing) {
      updateSubscription(editing.id, payload);
    } else {
      addSubscription(payload);
    }
    onClose();
  };

  const sym = currencySymbol(settings.currency);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Edit subscription" : "Add subscription"}
      footer={
        <div className="flex gap-2 justify-end">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" form="sub-form">
            {editing ? "Save changes" : "Add subscription"}
          </Button>
        </div>
      }
    >
      <form id="sub-form" onSubmit={handleSubmit} className="space-y-4">
        <Field label="Name" htmlFor="name" error={errors.name}>
          <Input
            id="name"
            autoFocus
            placeholder="Netflix, Spotify, gym…"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Cost" htmlFor="cost" error={errors.cost}>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-ink-400">
                {sym}
              </span>
              <Input
                id="cost"
                inputMode="decimal"
                className="pl-7 tnum"
                placeholder="9.99"
                value={form.cost}
                onChange={(e) => set("cost", e.target.value)}
              />
            </div>
          </Field>
          <Field label="Billing frequency" htmlFor="frequency">
            <Select
              id="frequency"
              value={form.frequency}
              onChange={(e) => set("frequency", e.target.value as Subscription["frequency"])}
            >
              {FREQUENCIES.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        {form.frequency === "custom" && (
          <Field
            label="Cycle length"
            htmlFor="customDays"
            hint="How many days between charges?"
            error={errors.customFrequencyDays}
          >
            <div className="relative">
              <Input
                id="customDays"
                inputMode="numeric"
                className="pr-12 tnum"
                value={form.customFrequencyDays}
                onChange={(e) => set("customFrequencyDays", e.target.value)}
              />
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-ink-400">
                days
              </span>
            </div>
          </Field>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label="Next billing date" htmlFor="date" error={errors.nextBillingDate}>
            <Input
              id="date"
              type="date"
              className="tnum"
              value={form.nextBillingDate}
              onChange={(e) => set("nextBillingDate", e.target.value)}
            />
          </Field>
          <Field label="Category" htmlFor="category">
            <Select
              id="category"
              value={form.category}
              onChange={(e) => set("category", e.target.value as Subscription["category"])}
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="Notes" htmlFor="notes" hint="Optional — login email, plan tier, why you signed up…">
          <Textarea
            id="notes"
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="Anything worth remembering"
          />
        </Field>
      </form>
    </Modal>
  );
}
