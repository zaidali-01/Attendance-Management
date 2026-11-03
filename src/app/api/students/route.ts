import { handle, parseMonth, readJson } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { parseStudent, STUDENT_COLUMNS, type StudentInput } from "@/lib/students";
import type { Payment, Student, StudentWithPayment } from "@/lib/types";

/** All students. With ?year=&month= each one includes that month's payment (null = unpaid). */
export const GET = handle(async (req: Request) => {
  await requireUser();
  const params = new URL(req.url).searchParams;
  const sql = await getDb();
  const students = await sql<Student[]>`
    select ${sql.unsafe(STUDENT_COLUMNS)} from students
    order by case when class_name ~ '^\\d+$' then class_name::int else 99 end, nullif(regexp_replace(roll_no, '\\D', '', 'g'), '')::bigint nulls last, name`;

  let payments = new Map<number, Payment>();
  if (params.has("month")) {
    const { year, month } = parseMonth(params);
    const rows = await sql<Payment[]>`select * from fee_payments where year = ${year} and month = ${month}`;
    payments = new Map(rows.map((p) => [p.student_id, p]));
  }
  return Response.json(students.map((s): StudentWithPayment => ({ ...s, payment: payments.get(s.id) ?? null })));
});

export const POST = handle(async (req: Request) => {
  await requireUser();
  const s = parseStudent(await readJson(req)) as StudentInput;
  const sql = await getDb();
  const [row] = await sql<Student[]>`
    insert into students (name, class_name, roll_no, monthly_fee, admission_form)
    values (${s.name}, ${s.class_name}, ${s.roll_no}, ${s.monthly_fee}, ${s.admission_form})
    returning ${sql.unsafe(STUDENT_COLUMNS)}`;
  return Response.json(row, { status: 201 });
});
