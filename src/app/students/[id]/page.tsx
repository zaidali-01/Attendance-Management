"use client";

import { ArrowLeft, Banknote, CalendarCheck, ChevronLeft, ChevronRight, FileText, Pencil, Plus, ReceiptText, Smartphone, Trash2, Undo2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AttendanceForm } from "@/components/attendance-form";
import { PayModal, type PayTarget } from "@/components/pay-modal";
import { StudentForm } from "@/components/student-form";
import { useToast } from "@/components/toast";
import { Alert, ClassBadge, ConfirmDialog, EmptyState, Loading, Modal, Toggle } from "@/components/ui";
import { api, errorMessage } from "@/lib/client";
import { currentMonth, dueDate, formatDate, joinedBy, money, monthKey, MONTHS, percentage, todayYmd } from "@/lib/format";
import { DEFAULT_SETTINGS, METHOD_LABEL, type Payment, type Settings, type StudentDetail, type WeeklyRecord } from "@/lib/types";

export default function StudentPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const [today] = useState(todayYmd);
  const [now] = useState(currentMonth);
  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [error, setError] = useState<string | null>(null);
  const [year, setYear] = useState(now.year);
  const [pay, setPay] = useState<PayTarget | null>(null);
  const [undo, setUndo] = useState<Payment | null>(null);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [week, setWeek] = useState<WeeklyRecord | "new" | null>(null);
  const [deletingWeek, setDeletingWeek] = useState<WeeklyRecord | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api<StudentDetail>(`/api/students/${id}`).then(setStudent, (e) => setError(errorMessage(e)));
  }, [id]);
  useEffect(load, [load]);
  useEffect(() => {
    api<Settings>("/api/settings").then(setSettings, () => {});
  }, []);

  if (error) return <Alert kind="error">{error}</Alert>;
  if (!student) return <Loading />;

  const paidFor = (m: number) => student.payments.find((p) => p.year === year && p.month === m) ?? null;
  const yearPaid = student.payments.filter((p) => p.year === year);
  const totals = student.attendance.reduce((a, r) => ({ total: a.total + r.total_days, present: a.present + r.present_days }), { total: 0, present: 0 });

  async function setForm(v: boolean) {
    setStudent((s) => (s ? { ...s, admission_form: v } : s));
    try {
      await api(`/api/students/${id}`, { method: "PUT", json: { admission_form: v } });
      toast("success", v ? "Admission form marked as submitted" : "Admission form marked as pending");
    } catch (e) {
      setStudent((s) => (s ? { ...s, admission_form: !v } : s));
      toast("error", errorMessage(e));
    }
  }

  async function doUndo() {
    if (!undo) return;
    setBusy(true);
    try {
      await api(`/api/payments?studentId=${undo.student_id}&year=${undo.year}&month=${undo.month}`, { method: "DELETE" });
      toast("success", `${MONTHS[undo.month - 1]} ${undo.year} marked as unpaid`);
      setUndo(null);
      load();
    } catch (e) {
      toast("error", errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function doDelete() {
    setBusy(true);
    try {
      await api(`/api/students/${id}`, { method: "DELETE" });
      toast("success", `${student!.name} deleted`);
      router.push("/students");
    } catch (e) {
      toast("error", errorMessage(e));
      setBusy(false);
    }
  }

  async function doDeleteWeek() {
    if (!deletingWeek) return;
    setBusy(true);
    try {
      await api(`/api/attendance/${deletingWeek.id}`, { method: "DELETE" });
      toast("success", "Weekly record deleted");
      setDeletingWeek(null);
      load();
    } catch (e) {
      toast("error", errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <Link href="/students" className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700 hover:underline">
        <ArrowLeft className="h-4 w-4" /> All students
      </Link>

      <section className="card overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-50 to-white px-5 py-5 sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-700 text-xl font-bold text-white">
                {student.name.trim().charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-2xl font-bold tracking-tight text-emerald-950">{student.name}</h1>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-emerald-900/65">
                  <ClassBadge className={student.class_name} />
                  <span>Roll # {student.roll_no ?? "—"}</span>
                  <span>· Fee {student.monthly_fee ? money(student.monthly_fee) : "not set"} / month</span>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href={`/challans?student=${student.id}&month=${monthKey(now.year, now.month)}`} className="btn-primary">
                <ReceiptText className="h-4 w-4" /> Fee challan
              </Link>
              <button className="btn-secondary" onClick={() => setEditing(true)}>
                <Pencil className="h-4 w-4" /> Edit
              </button>
              <button className="btn-ghost text-red-600 hover:bg-red-50" onClick={() => setDeleting(true)} aria-label="Delete student">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-emerald-900/10 px-5 py-3 sm:px-6">
          <Toggle checked={student.admission_form} onChange={setForm} label={<>Admission form {student.admission_form ? <b>submitted</b> : <b className="text-amber-700">not submitted</b>}</>} />
          <span className="text-xs text-emerald-900/50">Challans always show {money(settings.challanFee)}</span>
        </div>
      </section>

      <section className="card p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-emerald-950">Monthly fees</h2>
            <p className="text-sm text-emerald-900/60">
              {yearPaid.length} of 12 months paid in {year} · {money(yearPaid.reduce((a, p) => a + p.amount, 0))} received
            </p>
          </div>
          <div className="inline-flex items-center gap-1 rounded-xl border border-emerald-900/15 bg-white p-1">
            <button className="rounded-lg p-1.5 text-emerald-800 hover:bg-emerald-50" onClick={() => setYear((y) => y - 1)} aria-label="Previous year">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-2 text-sm font-semibold text-emerald-950 tabular-nums">{year}</span>
            <button className="rounded-lg p-1.5 text-emerald-800 hover:bg-emerald-50" onClick={() => setYear((y) => y + 1)} aria-label="Next year">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {MONTHS.map((name, i) => {
            const m = i + 1;
            const p = paidFor(m);
            const future = year * 12 + m > now.year * 12 + now.month;
            const before = !p && !joinedBy(student.created_at, year, m);
            const overdue = !p && !future && !before && today > dueDate(year, m, settings.dueDay);
            const tone = p
              ? "border-emerald-200 bg-emerald-50/70"
              : overdue
                ? "border-red-200 bg-red-50/50"
                : future || before
                  ? "border-dashed border-emerald-900/15 bg-white"
                  : "border-amber-200 bg-amber-50/50";
            return (
              <div key={name} className={`flex flex-col rounded-xl border p-3 ${tone}`}>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-emerald-950">{name}</span>
                  <span
                    className={`text-[11px] font-bold uppercase ${p ? "text-emerald-700" : overdue ? "text-red-600" : future || before ? "text-emerald-900/35" : "text-amber-700"}`}
                  >
                    {p ? "Paid" : overdue ? "Overdue" : future ? "Upcoming" : before ? "Before joining" : "Unpaid"}
                  </span>
                </div>
                {p ? (
                  <div className="mt-1 text-xs text-emerald-900/70">
                    <div className="flex items-center gap-1 font-semibold text-emerald-950 tabular-nums">
                      {money(p.amount)} · {p.method === "cash" ? <Banknote className="h-3 w-3" /> : <Smartphone className="h-3 w-3" />}
                      {METHOD_LABEL[p.method]}
                    </div>
                    <div>on {formatDate(p.paid_on)}</div>
                    {p.note && <div className="truncate italic">{p.note}</div>}
                  </div>
                ) : (
                  <div className="mt-1 text-xs text-emerald-900/55">Due {formatDate(dueDate(year, m, settings.dueDay))}</div>
                )}
                <div className="mt-auto flex flex-wrap gap-1 pt-2">
                  {p ? (
                    <>
                      <button className="btn-ghost px-2 py-1 text-xs" onClick={() => setPay({ student, year, month: m, payment: p })}>
                        <Pencil className="h-3 w-3" /> Edit
                      </button>
                      <button className="btn-ghost px-2 py-1 text-xs text-red-600 hover:bg-red-50" onClick={() => setUndo(p)}>
                        <Undo2 className="h-3 w-3" /> Undo
                      </button>
                    </>
                  ) : (
                    <>
                      <button className="btn-secondary px-2.5 py-1 text-xs" onClick={() => setPay({ student, year, month: m, payment: null })}>
                        Mark paid
                      </button>
                      <Link href={`/challans?student=${student.id}&month=${monthKey(year, m)}`} className="btn-ghost px-2 py-1 text-xs" title="Challan">
                        <ReceiptText className="h-3 w-3" /> Challan
                      </Link>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-6">
          <div>
            <h2 className="text-lg font-semibold text-emerald-950">Weekly attendance</h2>
            <p className="text-sm text-emerald-900/60">
              {student.attendance.length
                ? `${totals.present} of ${totals.total} days present · ${percentage(totals.total, totals.present)}% overall`
                : "No weekly records yet"}
            </p>
          </div>
          <div className="flex gap-2">
            <Link href={`/reports?student=${student.id}`} className="btn-secondary">
              <FileText className="h-4 w-4" /> Report
            </Link>
            <button className="btn-primary" onClick={() => setWeek("new")}>
              <Plus className="h-4 w-4" /> Add week
            </button>
          </div>
        </div>
        {student.attendance.length === 0 ? (
          <EmptyState icon={<CalendarCheck className="h-10 w-10" />} title="No attendance yet">
            Add a week with its total and present days.
          </EmptyState>
        ) : (
          <div className="overflow-x-auto border-t border-emerald-900/10">
            <table className="w-full text-sm">
              <thead className="bg-emerald-50/70 text-left text-xs font-semibold tracking-wide text-emerald-900/60 uppercase">
                <tr>
                  <th className="px-4 py-3">Week</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-right">Present</th>
                  <th className="px-4 py-3 text-right">Absent</th>
                  <th className="px-4 py-3">Attendance</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-900/5">
                {student.attendance.map((r) => {
                  const pct = percentage(r.total_days, r.present_days);
                  return (
                    <tr key={r.id} className="hover:bg-emerald-50/40">
                      <td className="px-4 py-3 whitespace-nowrap">
                        {formatDate(r.start_date)} – {formatDate(r.end_date)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{r.total_days}</td>
                      <td className="px-4 py-3 text-right text-emerald-700 tabular-nums">{r.present_days}</td>
                      <td className="px-4 py-3 text-right text-red-600 tabular-nums">{r.total_days - r.present_days}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-20 overflow-hidden rounded-full bg-emerald-900/10">
                            <div className={`h-full ${pct >= 75 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs font-semibold tabular-nums">{pct}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-0.5">
                          <button className="btn-ghost py-1.5" onClick={() => setWeek(r)} aria-label="Edit week">
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button className="btn-ghost py-1.5 text-red-600 hover:bg-red-50" onClick={() => setDeletingWeek(r)} aria-label="Delete week">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <PayModal
        target={pay}
        onClose={() => setPay(null)}
        onSaved={() => {
          setPay(null);
          load();
        }}
      />
      <ConfirmDialog
        open={!!undo}
        title="Mark as unpaid?"
        message={undo && <>The {MONTHS[undo.month - 1]} {undo.year} payment of {money(undo.amount)} will be removed.</>}
        confirmLabel="Mark unpaid"
        busy={busy}
        onConfirm={doUndo}
        onClose={() => setUndo(null)}
      />
      <Modal open={editing} title="Edit student" onClose={() => setEditing(false)}>
        {editing && (
          <StudentForm
            student={student}
            challanFee={settings.challanFee}
            onCancel={() => setEditing(false)}
            onSaved={() => {
              toast("success", "Student saved");
              setEditing(false);
              load();
            }}
          />
        )}
      </Modal>
      <Modal open={week !== null} title={week === "new" ? "Add weekly attendance" : "Edit weekly attendance"} onClose={() => setWeek(null)}>
        {week !== null && (
          <AttendanceForm
            studentId={student.id}
            record={week === "new" ? null : week}
            onCancel={() => setWeek(null)}
            onSaved={() => {
              toast("success", week === "new" ? "Week added" : "Week saved");
              setWeek(null);
              load();
            }}
          />
        )}
      </Modal>
      <ConfirmDialog
        open={!!deletingWeek}
        title="Delete this week?"
        message={deletingWeek && <>The record for {formatDate(deletingWeek.start_date)} – {formatDate(deletingWeek.end_date)} will be deleted.</>}
        busy={busy}
        onConfirm={doDeleteWeek}
        onClose={() => setDeletingWeek(null)}
      />
      <ConfirmDialog
        open={deleting}
        title="Delete student?"
        message={
          <>
            <strong>{student.name}</strong> and all of their fee payments and attendance records will be deleted. This cannot be undone.
          </>
        }
        busy={busy}
        onConfirm={doDelete}
        onClose={() => setDeleting(false)}
      />
    </div>
  );
}
