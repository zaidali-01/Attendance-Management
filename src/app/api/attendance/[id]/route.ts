import { handle, HttpError, parseId, readJson } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { parseAttendance } from "@/lib/students";
import type { WeeklyRecord } from "@/lib/types";

export const PUT = handle(async (req: Request, ctx: RouteContext<"/api/attendance/[id]">) => {
  await requireUser();
  const id = parseId((await ctx.params).id);
  const a = parseAttendance(await readJson(req));
  const sql = await getDb();
  const [row] = await sql<WeeklyRecord[]>`update weekly_attendance set ${sql(a)} where id = ${id} returning *`;
  if (!row) throw new HttpError(404, "Record not found");
  return Response.json(row);
});

export const DELETE = handle(async (_req: Request, ctx: RouteContext<"/api/attendance/[id]">) => {
  await requireUser();
  const id = parseId((await ctx.params).id);
  const sql = await getDb();
  const rows = await sql`delete from weekly_attendance where id = ${id} returning id`;
  if (rows.length === 0) throw new HttpError(404, "Record not found");
  return Response.json({ ok: true });
});
