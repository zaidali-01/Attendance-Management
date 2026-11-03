// Dates are plain "YYYY-MM-DD" strings everywhere, so there are no timezone surprises.

export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const pad = (n: number) => String(n).padStart(2, "0");

export function ymd(y: number, m: number, d: number): string {
  return `${y}-${pad(m)}-${pad(d)}`;
}

export function isValidYmd(s: unknown): s is string {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export function todayYmd(): string {
  const now = new Date();
  return ymd(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** The due date for a month: the due day, or the month's last day if the month is shorter. */
export function dueDate(year: number, month: number, dueDay: number): string {
  return ymd(year, month, Math.min(dueDay, daysInMonth(year, month)));
}

/** "2026-11-05" -> "05 Nov 2026" */
export function formatDate(s: string): string {
  const [y, m, d] = s.split("-").map(Number);
  return `${pad(d)} ${MONTHS[m - 1].slice(0, 3)} ${y}`;
}

/** "2026-11" style key for a month. */
export const monthKey = (year: number, month: number) => `${year}-${pad(month)}`;

export function parseMonthKey(key: string | null | undefined): { year: number; month: number } | null {
  const m = /^(\d{4})-(\d{2})$/.exec(key ?? "");
  if (!m) return null;
  const month = Number(m[2]);
  return month >= 1 && month <= 12 ? { year: Number(m[1]), month } : null;
}

export function currentMonth(): { year: number; month: number } {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

/** True when the student had been added by this month (earlier months are never "overdue"). */
export function joinedBy(createdAt: string, year: number, month: number): boolean {
  const d = new Date(createdAt);
  return d.getFullYear() * 12 + d.getMonth() + 1 <= year * 12 + month;
}

/** 1 -> "1st", 6 -> "6th", 22 -> "22nd" */
export function ordinal(n: number): string {
  const s = n % 100 >= 11 && n % 100 <= 13 ? "th" : ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ?? "th";
  return `${n}${s}`;
}

/** 13000 -> "Rs 13,000" */
export function money(n: number): string {
  return `Rs ${Math.round(n).toLocaleString("en-US")}`;
}

export function percentage(total: number, present: number): number {
  if (!total) return 0;
  return Math.round((present / total) * 1000) / 10;
}
