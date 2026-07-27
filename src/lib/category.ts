import type { Category } from "./types";

interface CategoryMeta {
  label: string;
  /** Dot / accent colour (hex) — calm by default, no alarming tones. */
  color: string;
}

export const CATEGORY_META: Record<Category, CategoryMeta> = {
  streaming: { label: "Streaming", color: "#7c5cff" },
  software: { label: "Software", color: "#3457d5" },
  fitness: { label: "Fitness", color: "#0f9d6a" },
  food: { label: "Food", color: "#d97706" },
  other: { label: "Other", color: "#64748b" },
};

export function categoryColor(cat: Category): string {
  return CATEGORY_META[cat]?.color ?? CATEGORY_META.other.color;
}

export function categoryLabel(cat: Category): string {
  return CATEGORY_META[cat]?.label ?? "Other";
}
