import { handle, HttpError, parseId, readJson } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { parseAttendance } from "@/lib/students";
import type { WeeklyRecord } from "@/lib/types";

/** Add a weekly attendance record for the student. */
export const POST = handle(async (req: Request, ctx: RouteContext<"/api/students/[id]/attendance">) => {
  await requireUser();
  const studentId = parseId((await ctx.params).id);
  const a = parseAttendance(await readJson(req));
  const sql = await getDb();
  const [exists] = await sql`select 1 from students where id = ${studentId}`;
  if (!exists) throw new HttpError(404, "Student not found");
  const [row] = await sql<WeeklyRecord[]>`
    insert into weekly_attendance ${sql({ ...a, student_id: studentId })}
    returning *`;
  return Response.json(row, { status: 201 });
});
