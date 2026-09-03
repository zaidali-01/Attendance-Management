export function absentDays(totalDays: number, presentDays: number) {
  return Math.max(totalDays - presentDays, 0);
}

export function percentage(totalDays: number, presentDays: number) {
  if (!totalDays) return 0;
  return Math.round((presentDays / totalDays) * 1000) / 10;
}

export function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}
