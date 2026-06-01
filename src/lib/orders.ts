import { isoWeekMonday } from "./week";

const HOUR = 3600 * 1000;
const WEEK = 7 * 24 * HOUR;

export const WEEK_STATUS = {
  PROPOSED: "PROPOSED",
  CHANGES_REQUESTED: "CHANGES_REQUESTED",
  CONFIRMED: "CONFIRMED",
} as const;

export function weekStartMs(isoYear: number, isoWeek: number): number {
  return isoWeekMonday(isoYear, isoWeek).getTime();
}

/** Type 1 café deadline: `leadHours` before the week starts. */
export function weekDeadlineMs(isoYear: number, isoWeek: number, leadHours: number): number {
  return weekStartMs(isoYear, isoWeek) - leadHours * HOUR;
}

export type WeekPhase = "FUTURE" | "CURRENT" | "PAST";
export function weekPhase(isoYear: number, isoWeek: number, nowMs: number): WeekPhase {
  const start = weekStartMs(isoYear, isoWeek);
  if (nowMs < start) return "FUTURE";
  if (nowMs < start + WEEK) return "CURRENT";
  return "PAST";
}

/** Type 1 negotiation window: future week, before the café deadline. */
export function type1Open(isoYear: number, isoWeek: number, leadHours: number, nowMs: number): boolean {
  return nowMs < weekDeadlineMs(isoYear, isoWeek, leadHours);
}

/** Type 2 per-product cutoff for a delivery day (ms). */
export function cellCutoffMs(deliveryMs: number, changeLeadHours: number): number {
  return deliveryMs - changeLeadHours * HOUR;
}
