// ISO-week helpers. All math is done in UTC to avoid DST drift; delivery days
// are represented as UTC midnights and formatted in UTC.

export function isoWeekParts(date: Date): { isoYear: number; isoWeek: number } {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = d.getUTCDay() || 7; // Mon=1..Sun=7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum); // Thursday of this ISO week
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const isoWeek = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { isoYear: d.getUTCFullYear(), isoWeek };
}

export function isoWeekMonday(isoYear: number, isoWeek: number): Date {
  const jan4 = new Date(Date.UTC(isoYear, 0, 4));
  const jan4Day = jan4.getUTCDay() || 7;
  const monday = new Date(jan4);
  monday.setUTCDate(jan4.getUTCDate() - (jan4Day - 1) + (isoWeek - 1) * 7);
  return monday;
}

export function isoWeekDates(isoYear: number, isoWeek: number): Date[] {
  const monday = isoWeekMonday(isoYear, isoWeek);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setUTCDate(monday.getUTCDate() + i);
    return d;
  });
}

export function addWeeks(
  isoYear: number,
  isoWeek: number,
  delta: number,
): { isoYear: number; isoWeek: number } {
  const monday = isoWeekMonday(isoYear, isoWeek);
  monday.setUTCDate(monday.getUTCDate() + delta * 7);
  return isoWeekParts(monday);
}

export function currentIsoWeek(): { isoYear: number; isoWeek: number } {
  return isoWeekParts(new Date());
}

export function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function parseDateKey(s: string): Date {
  return new Date(s + "T00:00:00.000Z");
}

export function fmtDow(d: Date): string {
  return d.toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" });
}

export function fmtDayMonth(d: Date): string {
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", timeZone: "UTC" });
}

export function weekRangeLabel(isoYear: number, isoWeek: number): string {
  const dates = isoWeekDates(isoYear, isoWeek);
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", timeZone: "UTC" });
  return `Week ${isoWeek} · ${fmt(dates[0])} – ${fmt(dates[6])} ${dates[6].getUTCFullYear()}`;
}
