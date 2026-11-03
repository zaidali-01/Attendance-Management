import { addDays, eachDay, weekStart } from "./format";
import type { DayMark, DayStatus, WeeklyRecord } from "./types";

export interface Tally {
  present: number;
  late: number;
  absent: number;
  holiday: number;
  /** Days classes were held (present + late + absent; holidays don't count). */
  working: number;
  /** Present + late. */
  attended: number;
  /** attended ÷ working × 100, or null when nothing is marked. */
  pct: number | null;
}

export function tally(statuses: Iterable<DayStatus>): Tally {
  const t = { present: 0, late: 0, absent: 0, holiday: 0 };
  for (const s of statuses) t[s]++;
  const working = t.present + t.late + t.absent;
  const attended = t.present + t.late;
  return { ...t, working, attended, pct: working ? Math.round((attended / working) * 1000) / 10 : null };
}

/** Monday–Sunday weeks covering start…end, clipped to the range. */
export function weeksIn(start: string, end: string): { start: string; end: string }[] {
  const out: { start: string; end: string }[] = [];
  for (let w = weekStart(start); w <= end; w = addDays(w, 7)) {
    const s = w < start ? start : w;
    const e = addDays(w, 6) > end ? end : addDays(w, 6);
    out.push({ start: s, end: e });
  }
  return out;
}

export interface WeekRow {
  start: string;
  end: string;
  tally: Tally;
  /** True for weeks entered as totals in the first version of the app. */
  legacy?: boolean;
  legacyId?: number;
}

/** Weekly totals for one student from their daily marks, plus any older weekly records in the range. */
export function weeklyRows(marks: DayMark[], start: string, end: string, legacy: WeeklyRecord[] = []): WeekRow[] {
  const byDay = new Map(marks.map((m) => [m.day, m.status]));
  const rows: WeekRow[] = weeksIn(start, end)
    .map((w) => ({ ...w, tally: tally(eachDay(w.start, w.end).flatMap((d) => (byDay.has(d) ? [byDay.get(d)!] : []))) }))
    .filter((w) => w.tally.working + w.tally.holiday > 0);
  for (const r of legacy) {
    if (r.start_date < start || r.end_date > end) continue;
    const absent = r.total_days - r.present_days;
    rows.push({
      start: r.start_date,
      end: r.end_date,
      legacy: true,
      legacyId: r.id,
      tally: { present: r.present_days, late: 0, absent, holiday: 0, working: r.total_days, attended: r.present_days, pct: r.total_days ? Math.round((r.present_days / r.total_days) * 1000) / 10 : null },
    });
  }
  return rows.sort((a, b) => a.start.localeCompare(b.start));
}

/** Adds weekly rows together. */
export function sumRows(rows: WeekRow[]): Tally {
  const t = rows.reduce(
    (a, r) => ({ present: a.present + r.tally.present, late: a.late + r.tally.late, absent: a.absent + r.tally.absent, holiday: a.holiday + r.tally.holiday }),
    { present: 0, late: 0, absent: 0, holiday: 0 },
  );
  const working = t.present + t.late + t.absent;
  const attended = t.present + t.late;
  return { ...t, working, attended, pct: working ? Math.round((attended / working) * 1000) / 10 : null };
}
