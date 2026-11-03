import { handle, HttpError, parseMonth, readJson } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { isValidYmd } from "@/lib/format";
import { PAYMENT_METHODS, type Payment, type PaymentMethod } from "@/lib/types";

/** Mark a student's fee for a month as paid (or update the payment). */
export const PUT = handle(async (req: Request) => {
  await requireUser();
  const body = await readJson<{
    studentId: number;
    year: number;
    month: number;
    amount: number;
    method: string;
    paidOn: string;
    note?: string;
  }>(req);
  const { year, month } = parseMonth(new URLSearchParams({ year: String(body.year), month: String(body.month) }));
  if (!Number.isInteger(body.studentId)) throw new HttpError(400, "Choose a student");
  if (!PAYMENT_METHODS.includes(body.method as PaymentMethod)) throw new HttpError(400, "Choose how the fee was paid: Online or Cash");
  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 10_000_000) throw new HttpError(400, "Enter the amount paid");
  if (!isValidYmd(body.paidOn)) throw new HttpError(400, "Enter the date it was paid");
  const note = body.note?.trim().slice(0, 300) || null;

  const sql = await getDb();
  const [exists] = await sql`select 1 from students where id = ${body.studentId}`;
  if (!exists) throw new HttpError(404, "Student not found");
  const [row] = await sql<Payment[]>`
    insert into fee_payments (student_id, year, month, amount, method, paid_on, note)
    values (${body.studentId}, ${year}, ${month}, ${Math.round(amount)}, ${body.method}, ${body.paidOn}, ${note})
    on conflict (student_id, year, month) do update set
      amount = excluded.amount, method = excluded.method, paid_on = excluded.paid_on, note = excluded.note
    returning *`;
  return Response.json(row);
});

/** Undo: mark the month as unpaid again. ?studentId=&year=&month= */
export const DELETE = handle(async (req: Request) => {
  await requireUser();
  const params = new URL(req.url).searchParams;
  const { year, month } = parseMonth(params);
  const studentId = Number(params.get("studentId"));
  const sql = await getDb();
  await sql`delete from fee_payments where student_id = ${studentId} and year = ${year} and month = ${month}`;
  return Response.json({ ok: true });
});
