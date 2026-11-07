import { handle, HttpError, parseId, readJson } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { parseStudent, STUDENT_COLUMNS, STUDENT_FIELDS } from "@/lib/students";
import type { Payment, Student, StudentDetail, WeeklyRecord } from "@/lib/types";

/** One student with all fee payments and weekly attendance. */
export const GET = handle(async (_req: Request, ctx: RouteContext<"/api/students/[id]">) => {
  await requireUser();
  const id = parseId((await ctx.params).id);
  const sql = await getDb();
  const [student] = await sql<Student[]>`select ${sql.unsafe(STUDENT_COLUMNS)} from students where id = ${id}`;
  if (!student) throw new HttpError(404, "Student not found");
  const [payments, attendance] = await Promise.all([
    sql<Payment[]>`select * from fee_payments where student_id = ${id} order by year desc, month desc`,
    sql<WeeklyRecord[]>`select * from weekly_attendance where student_id = ${id} order by start_date desc`,
  ]);
  return Response.json({ ...student, payments, attendance } satisfies StudentDetail);
});

/** Update a student. Partial updates are allowed (e.g. only the admission form). */
export const PUT = handle(async (req: Request, ctx: RouteContext<"/api/students/[id]">) => {
  await requireUser();
  const id = parseId((await ctx.params).id);
  const patch = parseStudent(await readJson(req), true);
  if (Object.keys(patch).length === 0) throw new HttpError(400, "Nothing to update");
  const sql = await getDb();
  const [row] = await sql<Student[]>`
    update students set ${sql(patch, ...(Object.keys(patch) as (keyof typeof patch)[]).filter((k) => STUDENT_FIELDS.includes(k)))} where id = ${id}
    returning ${sql.unsafe(STUDENT_COLUMNS)}`;
  if (!row) throw new HttpError(404, "Student not found");
  return Response.json(row);
});

export const DELETE = handle(async (_req: Request, ctx: RouteContext<"/api/students/[id]">) => {
  await requireUser();
  const id = parseId((await ctx.params).id);
  const sql = await getDb();
  const rows = await sql`delete from students where id = ${id} returning id`;
  if (rows.length === 0) throw new HttpError(404, "Student not found");
  return Response.json({ ok: true });
});
