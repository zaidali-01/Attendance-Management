import { handle, HttpError, isId, parseId, readJson } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { isValidYmd } from "@/lib/format";
import { CLASSES, DAY_STATUSES, type ClassName, type DayMark, type DayStatus } from "@/lib/types";

/** Longest range one request may ask for (a year and a bit, enough for "This year"). */
const MAX_RANGE_DAYS = 400;

/** Marks between ?start= and ?end=, for one ?studentId= or one ?class= (or everyone). */
export const GET = handle(async (req: Request) => {
  await requireUser();
  const params = new URL(req.url).searchParams;
  const start = params.get("start");
  const end = params.get("end");
  if (!isValidYmd(start) || !isValidYmd(end) || start > end) throw new HttpError(400, "Choose a valid date range");
  if (Date.parse(end) - Date.parse(start) > MAX_RANGE_DAYS * 86_400_000) throw new HttpError(400, `Choose a range of at most ${MAX_RANGE_DAYS} days`);
  const studentId = params.get("studentId") ? parseId(params.get("studentId")) : null;
  const cls = params.get("class");
  if (cls && !CLASSES.includes(cls as ClassName)) throw new HttpError(400, "Unknown class");

  const sql = await getDb();
  const rows = await sql<DayMark[]>`
    select a.student_id, a.day, a.status
    from daily_attendance a join students s on s.id = a.student_id
    where a.day between ${start} and ${end}
      ${studentId ? sql`and a.student_id = ${studentId}` : sql``}
      ${cls ? sql`and s.class_name = ${cls}` : sql``}
    order by a.day`;
  return Response.json(rows);
});

/**
 * Save marks: { marks: [{ studentId, day, status }] }. A null status clears the day.
 * Used for one student or a whole class at once ("All present", "Holiday").
 */
export const PUT = handle(async (req: Request) => {
  await requireUser();
  const { marks } = await readJson<{ marks?: { studentId: number; day: string; status: DayStatus | null }[] }>(req);
  if (!Array.isArray(marks) || marks.length === 0) throw new HttpError(400, "Nothing to save");
  if (marks.length > 1000) throw new HttpError(400, "Too many marks at once");
  for (const m of marks) {
    if (!m || typeof m !== "object" || !isId(m.studentId) || !isValidYmd(m.day)) throw new HttpError(400, "Invalid student or date");
    if (m.status !== null && !DAY_STATUSES.includes(m.status)) throw new HttpError(400, "Status must be present, late, absent or holiday");
  }

  const sql = await getDb();
  // If the same student and day appear twice, the last one wins.
  const latest = [...new Map(marks.map((m) => [`${m.studentId}|${m.day}`, m])).values()];
  await sql.begin(async (tx) => {
    const clear = latest.filter((m) => m.status === null);
    const set = latest.filter((m) => m.status !== null);
    for (const m of clear) await tx`delete from daily_attendance where student_id = ${m.studentId} and day = ${m.day}`;
    if (set.length) {
      const rows = set.map((m) => ({ student_id: m.studentId, day: m.day, status: m.status }));
      await tx`
        insert into daily_attendance ${tx(rows, "student_id", "day", "status")}
        on conflict (student_id, day) do update set status = excluded.status`;
    }
  });
  return Response.json({ ok: true, saved: marks.length });
});
