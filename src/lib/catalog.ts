export const CATEGORIES = [
  "Kitchen bread",
  "Smoked / meat / prep",
  "Pastry / retail bakery",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const UNITS = ["item", "kg"] as const;
export type Unit = (typeof UNITS)[number];

export function unitLabel(unit: string): string {
  if (unit === "item") return "per item";
  if (unit === "kg") return "per kg";
  return unit;
}

export function isCategory(v: unknown): v is Category {
  return typeof v === "string" && (CATEGORIES as readonly string[]).includes(v);
}

export function isUnit(v: unknown): v is Unit {
  return typeof v === "string" && (UNITS as readonly string[]).includes(v);
}

/** Stable display order for category grouping. */
export function categoryRank(category: string): number {
  const i = (CATEGORIES as readonly string[]).indexOf(category);
  return i === -1 ? CATEGORIES.length : i;
}
