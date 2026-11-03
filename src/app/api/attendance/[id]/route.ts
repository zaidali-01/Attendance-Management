import { handle, HttpError, parseId } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";

/** Delete an older weekly record (entered as totals in the first version of the app). */
export const DELETE = handle(async (_req: Request, ctx: RouteContext<"/api/attendance/[id]">) => {
  await requireUser();
  const id = parseId((await ctx.params).id);
  const sql = await getDb();
  const rows = await sql`delete from weekly_attendance where id = ${id} returning id`;
  if (rows.length === 0) throw new HttpError(404, "Record not found");
  return Response.json({ ok: true });
});
