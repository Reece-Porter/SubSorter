import type { Category } from "./types";

interface CategoryMeta {
  label: string;
  /** Dot / accent colour (hex) — calm by default, no alarming tones. */
  color: string;
}

// Muted, harmonious dots — quiet enough not to compete with the garnet accent.
export const CATEGORY_META: Record<Category, CategoryMeta> = {
  streaming: { label: "Streaming", color: "#7c6ba8" }, // muted violet
  software: { label: "Software", color: "#4e6e8e" }, // muted slate
  fitness: { label: "Fitness", color: "#5e8a6b" }, // muted green
  food: { label: "Food", color: "#b5794a" }, // muted clay
  other: { label: "Other", color: "#8a8375" }, // warm grey
};

export function categoryColor(cat: Category): string {
  return CATEGORY_META[cat]?.color ?? CATEGORY_META.other.color;
}

export function categoryLabel(cat: Category): string {
  return CATEGORY_META[cat]?.label ?? "Other";
}
