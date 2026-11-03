import { handle, parseMonth } from "@/lib/api";
import { isValidYmd } from "@/lib/format";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import type { DashboardResponse, Payment, Student } from "@/lib/types";

/** Totals for the home page for one month (?year=&month=). */
export const GET = handle(async (req: Request) => {
  await requireUser();
  const params = new URL(req.url).searchParams;
  const { year, month } = parseMonth(params);
  const today = params.get("today");
  const sql = await getDb();
  const [students, payments, recent, todayRows] = await Promise.all([
    sql<Student[]>`select id, name, class_name, roll_no, monthly_fee, admission_form from students order by name`,
    sql<Payment[]>`select * from fee_payments where year = ${year} and month = ${month}`,
    sql<DashboardResponse["recentPayments"]>`
      select p.*, s.name, s.class_name from fee_payments p join students s on s.id = p.student_id
      order by p.created_at desc limit 6`,
    isValidYmd(today)
      ? sql<{ status: string; n: number }[]>`select status, count(*)::int as n from daily_attendance where day = ${today} group by status`
      : Promise.resolve(null),
  ]);
  const todayCount = (s: string) => todayRows?.find((r) => r.status === s)?.n ?? 0;

  const paid = new Set(payments.map((p) => p.student_id));
  const byClass: Record<string, number> = {};
  for (const s of students) byClass[s.class_name] = (byClass[s.class_name] ?? 0) + 1;
  const unpaid = students.filter((s) => !paid.has(s.id));

  const res: DashboardResponse = {
    year,
    month,
    totalStudents: students.length,
    byClass,
    paidCount: paid.size,
    unpaidCount: unpaid.length,
    collected: payments.reduce((a, p) => a + p.amount, 0),
    expected: students.reduce((a, s) => a + s.monthly_fee, 0),
    byMethod: {
      online: payments.filter((p) => p.method === "online").reduce((a, p) => a + p.amount, 0),
      cash: payments.filter((p) => p.method === "cash").reduce((a, p) => a + p.amount, 0),
    },
    formsPending: students.filter((s) => !s.admission_form).length,
    feeNotSet: students.filter((s) => s.monthly_fee === 0).length,
    unpaid: unpaid.slice(0, 8).map(({ id, name, class_name, roll_no, monthly_fee }) => ({ id, name, class_name, roll_no, monthly_fee })),
    recentPayments: recent,
    today:
      todayRows && isValidYmd(today)
        ? {
            day: today,
            present: todayCount("present"),
            late: todayCount("late"),
            absent: todayCount("absent"),
            holiday: todayCount("holiday"),
            marked: todayRows.reduce((a, r) => a + r.n, 0),
          }
        : null,
  };
  return Response.json(res);
});
