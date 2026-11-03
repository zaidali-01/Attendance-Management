"use client";

import { ArrowLeft, Banknote, CalendarCheck, ChevronLeft, ChevronRight, FileText, Pencil, ReceiptText, Smartphone, Trash2, Undo2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { MonthCalendar, STATUS_STYLE, StatusButtons, StatusLegend } from "@/components/attendance-ui";
import { PayModal, type PayTarget } from "@/components/pay-modal";
import { StudentForm } from "@/components/student-form";
import { useToast } from "@/components/toast";
import { Alert, ClassBadge, ConfirmDialog, Loading, Modal, Segmented, Spinner, Toggle } from "@/components/ui";
import { sumRows, weeklyRows } from "@/lib/attendance";
import { api, errorMessage } from "@/lib/client";
import { currentMonth, dueDate, formatDate, formatDay, joinedBy, monthEndOf, monthKey, monthStartOf, MONTHS, money, todayYmd } from "@/lib/format";
import { DEFAULT_SETTINGS, METHOD_LABEL, STATUS_LABEL, type DayMark, type DayStatus, type Payment, type Settings, type StudentDetail, type WeeklyRecord } from "@/lib/types";

type Tab = "fees" | "attendance";

export default function StudentPage() {
  return (
    <Suspense fallback={<Loading />}>
      <StudentView />
    </Suspense>
  );
}

function StudentView() {
  const { id } = useParams<{ id: string }>();
  const params = useSearchParams();
  const router = useRouter();
  const toast = useToast();
  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>(params.get("tab") === "attendance" ? "attendance" : "fees");
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [now] = useState(currentMonth);

  const load = useCallback(() => {
    api<StudentDetail>(`/api/students/${id}`).then(setStudent, (e) => setError(errorMessage(e)));
  }, [id]);
  useEffect(load, [load]);
  useEffect(() => {
    api<Settings>("/api/settings").then(setSettings, () => {});
  }, []);

  if (error) return <Alert kind="error">{error}</Alert>;
  if (!student) return <Loading />;

  const thisMonthPaid = student.payments.find((p) => p.year === now.year && p.month === now.month);

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

  return (
    <div className="space-y-5">
      <Link href="/students" className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700 hover:underline">
        <ArrowLeft className="h-4 w-4" /> All students
      </Link>

      <section className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-emerald-50 to-white px-5 py-5 sm:px-6">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-700 text-xl font-bold text-white">
              {student.name.trim().charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-bold tracking-tight text-emerald-950">{student.name}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-emerald-900/65">
                <ClassBadge className={student.class_name} />
                <span>Roll # {student.roll_no ?? "—"}</span>
                <span>Fee {student.monthly_fee ? money(student.monthly_fee) : "not set"} / month</span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="btn-secondary" onClick={() => setEditing(true)}>
              <Pencil className="h-4 w-4" /> Edit
            </button>
            <button className="btn-ghost text-red-600 hover:bg-red-50" onClick={() => setDeleting(true)} aria-label="Delete student" title="Delete student">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="grid divide-y divide-emerald-900/10 border-t border-emerald-900/10 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <div className="flex items-center px-5 py-3">
            <Toggle checked={student.admission_form} onChange={setForm} label={student.admission_form ? "Admission form submitted" : "Admission form pending"} />
          </div>
          <div className="px-5 py-3 text-sm">
            <div className="text-xs font-semibold tracking-wide text-emerald-900/50 uppercase">{MONTHS[now.month - 1]} fee</div>
            {thisMonthPaid ? (
              <div className="font-semibold text-emerald-700">
                Paid {money(thisMonthPaid.amount)} · {METHOD_LABEL[thisMonthPaid.method]}
              </div>
            ) : (
              <div className="font-semibold text-amber-700">Not paid yet</div>
            )}
          </div>
          <div className="flex items-center gap-2 px-5 py-3">
            <Link href={`/challans?student=${student.id}&month=${monthKey(now.year, now.month)}`} className="btn-primary flex-1 px-3 py-2 text-xs">
              <ReceiptText className="h-4 w-4" /> Fee challan
            </Link>
            <Link href={`/reports?student=${student.id}`} className="btn-secondary flex-1 px-3 py-2 text-xs">
              <FileText className="h-4 w-4" /> Report
            </Link>
          </div>
        </div>
      </section>

      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: "fees", label: "Monthly fees" },
          { value: "attendance", label: "Attendance" },
        ]}
      />

      {tab === "fees" ? <FeesTab student={student} settings={settings} reload={load} /> : <AttendanceTab student={student} reload={load} />}

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
      <ConfirmDialog
        open={deleting}
        title="Delete student?"
        message={
          <>
            <strong>{student.name}</strong> and all of their fee payments and attendance will be deleted. This cannot be undone.
          </>
        }
        busy={busy}
        onConfirm={doDelete}
        onClose={() => setDeleting(false)}
      />
    </div>
  );
}

function FeesTab({ student, settings, reload }: { student: StudentDetail; settings: Settings; reload: () => void }) {
  const toast = useToast();
  const [now] = useState(currentMonth);
  const [today] = useState(todayYmd);
  const [year, setYear] = useState(now.year);
  const [pay, setPay] = useState<PayTarget | null>(null);
  const [undo, setUndo] = useState<Payment | null>(null);
  const [busy, setBusy] = useState(false);
  const yearPaid = student.payments.filter((p) => p.year === year);

  async function doUndo() {
    if (!undo) return;
    setBusy(true);
    try {
      await api(`/api/payments?studentId=${undo.student_id}&year=${undo.year}&month=${undo.month}`, { method: "DELETE" });
      toast("success", `${MONTHS[undo.month - 1]} ${undo.year} marked as unpaid`);
      setUndo(null);
      reload();
    } catch (e) {
      toast("error", errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-emerald-900/65">
          <b className="text-emerald-950">{yearPaid.length} of 12</b> months paid in {year} · {money(yearPaid.reduce((a, p) => a + p.amount, 0))} received. Click a month to mark it paid.
        </p>
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

      <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
        {MONTHS.map((name, i) => {
          const m = i + 1;
          const p = student.payments.find((x) => x.year === year && x.month === m) ?? null;
          const future = year * 12 + m > now.year * 12 + now.month;
          const before = !p && !joinedBy(student.created_at, year, m);
          const overdue = !p && !future && !before && today > dueDate(year, m, settings.dueDay);
          const state = p ? "Paid" : overdue ? "Overdue" : future ? "Upcoming" : before ? "Before joining" : "Unpaid";
          const tone = p
            ? "border-emerald-200 bg-emerald-50/70"
            : overdue
              ? "border-red-200 bg-red-50/40"
              : future || before
                ? "border-dashed border-emerald-900/15 bg-white"
                : "border-amber-200 bg-amber-50/40";
          const stateTone = p ? "text-emerald-700" : overdue ? "text-red-600" : future || before ? "text-emerald-900/35" : "text-amber-700";
          return (
            <div key={name} className={`group relative rounded-xl border transition hover:shadow-sm ${tone}`}>
              <button type="button" className="w-full p-3 text-left" onClick={() => setPay({ student, year, month: m, payment: p })}>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-emerald-950">{name}</span>
                  <span className={`text-[10px] font-bold tracking-wide uppercase ${stateTone}`}>{state}</span>
                </div>
                <div className="mt-1 h-8 text-xs text-emerald-900/60">
                  {p ? (
                    <>
                      <div className="flex items-center gap-1 font-semibold text-emerald-950 tabular-nums">
                        {money(p.amount)} {p.method === "cash" ? <Banknote className="h-3 w-3" /> : <Smartphone className="h-3 w-3" />}
                        {METHOD_LABEL[p.method]}
                      </div>
                      <div>on {formatDate(p.paid_on)}</div>
                    </>
                  ) : (
                    <div>Due {formatDate(dueDate(year, m, settings.dueDay))}</div>
                  )}
                </div>
              </button>
              <div className="absolute right-2 bottom-2 flex gap-0.5">
                {p ? (
                  <button className="rounded-md p-1 text-red-500 hover:bg-red-50" title="Mark unpaid" onClick={() => setUndo(p)}>
                    <Undo2 className="h-3.5 w-3.5" />
                  </button>
                ) : (
                  <Link href={`/challans?student=${student.id}&month=${monthKey(year, m)}`} className="rounded-md p-1 text-emerald-700 hover:bg-emerald-100" title="Fee challan">
                    <ReceiptText className="h-3.5 w-3.5" />
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <PayModal
        target={pay}
        onClose={() => setPay(null)}
        onSaved={() => {
          setPay(null);
          reload();
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
    </section>
  );
}

function AttendanceTab({ student, reload }: { student: StudentDetail; reload: () => void }) {
  const toast = useToast();
  const [today] = useState(todayYmd);
  const [ym, setYm] = useState(currentMonth);
  const [day, setDay] = useState(today);
  const [data, setData] = useState<{ key: string; marks: DayMark[] } | null>(null);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState<WeeklyRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const key = `${ym.year}-${ym.month}`;
  const start = monthStartOf(ym.year, ym.month);
  const end = monthEndOf(ym.year, ym.month);

  useEffect(() => {
    api<DayMark[]>(`/api/daily-attendance?studentId=${student.id}&start=${start}&end=${end}`).then(
      (marks) => setData({ key: `${ym.year}-${ym.month}`, marks }),
      (e) => toast("error", errorMessage(e)),
    );
  }, [student.id, start, end, ym, toast]);

  const marks = data?.key === key ? data.marks : null;
  const byDay = new Map((marks ?? []).map((m) => [m.day, m.status]));
  const weeks = marks ? weeklyRows(marks, start, end) : [];
  const total = sumRows(weeks);

  async function mark(status: DayStatus | null) {
    if (!marks) return;
    const prev = marks;
    const next = marks.filter((m) => m.day !== day);
    if (status) next.push({ student_id: student.id, day, status });
    setData({ key, marks: next });
    setSaving(true);
    try {
      await api("/api/daily-attendance", { method: "PUT", json: { marks: [{ studentId: student.id, day, status }] } });
    } catch (e) {
      setData({ key, marks: prev });
      toast("error", `Not saved: ${errorMessage(e)}`);
    } finally {
      setSaving(false);
    }
  }

  async function removeLegacy() {
    if (!removing) return;
    setBusy(true);
    try {
      await api(`/api/attendance/${removing.id}`, { method: "DELETE" });
      setRemoving(null);
      reload();
    } catch (e) {
      toast("error", errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <section className="card self-start p-4 sm:p-5">
        <MonthCalendar
          year={ym.year}
          month={ym.month}
          selected={day}
          today={today}
          onSelect={setDay}
          onMonthChange={(y, m) => {
            setYm({ year: y, month: m });
            setDay(monthStartOf(y, m));
          }}
          dayClass={(d) => {
            const s = byDay.get(d);
            return s ? `${STATUS_STYLE[s].soft} ring-1 ring-inset` : "bg-white";
          }}
          renderDay={(d) => {
            const s = byDay.get(d);
            return s ? <span className="mt-0.5 text-[10px] font-bold">{STATUS_LABEL[s]}</span> : null;
          }}
        />
        <div className="mt-4 rounded-xl border border-emerald-900/10 bg-emerald-50/40 p-3">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-semibold text-emerald-950">{formatDay(day)}</span>
            {saving && <Spinner className="h-4 w-4 text-emerald-700" />}
          </div>
          <StatusButtons value={byDay.get(day) ?? null} onChange={mark} disabled={!marks} />
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <StatusLegend />
          <Link href={`/attendance?class=${student.class_name}`} className="text-xs font-semibold text-emerald-700 hover:underline">
            Mark the whole class →
          </Link>
        </div>
      </section>

      <section className="card self-start overflow-hidden">
        <div className="border-b border-emerald-900/10 px-5 py-4">
          <h2 className="font-semibold text-emerald-950">
            Weekly attendance · {MONTHS[ym.month - 1]} {ym.year}
          </h2>
          <p className="text-sm text-emerald-900/60">
            {total.working
              ? `${total.attended} of ${total.working} days attended (${total.pct}%) · ${total.late} late · ${total.absent} absent`
              : "No days marked this month"}
          </p>
        </div>
        {!marks ? (
          <Loading />
        ) : weeks.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-emerald-900/55">
            <CalendarCheck className="mx-auto mb-2 h-8 w-8 text-emerald-300" />
            Click a day on the calendar to mark it.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-emerald-50/70 text-xs font-semibold tracking-wide text-emerald-900/60 uppercase">
              <tr>
                <th className="px-4 py-2.5 text-left">Week</th>
                <th className="px-2 py-2.5 text-center">P</th>
                <th className="px-2 py-2.5 text-center">L</th>
                <th className="px-2 py-2.5 text-center">A</th>
                <th className="px-2 py-2.5 text-center">H</th>
                <th className="px-4 py-2.5 text-right">%</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-900/5">
              {weeks.map((w) => (
                <tr key={w.start}>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    {formatDate(w.start).slice(0, 6)} – {formatDate(w.end).slice(0, 6)}
                  </td>
                  <td className="px-2 py-2.5 text-center text-emerald-700 tabular-nums">{w.tally.present}</td>
                  <td className="px-2 py-2.5 text-center text-amber-700 tabular-nums">{w.tally.late}</td>
                  <td className="px-2 py-2.5 text-center text-red-600 tabular-nums">{w.tally.absent}</td>
                  <td className="px-2 py-2.5 text-center text-sky-700 tabular-nums">{w.tally.holiday}</td>
                  <td className="px-4 py-2.5 text-right font-semibold tabular-nums">{w.tally.pct == null ? "—" : `${w.tally.pct}%`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {student.attendance.length > 0 && (
          <div className="border-t border-emerald-900/10 px-5 py-4">
            <h3 className="text-sm font-semibold text-emerald-950">Older weekly records</h3>
            <p className="text-xs text-emerald-900/55">Entered as weekly totals before daily marking. They are included in the report.</p>
            <ul className="mt-2 divide-y divide-emerald-900/5 text-sm">
              {student.attendance.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-2 py-1.5">
                  <span>
                    {formatDate(r.start_date)} – {formatDate(r.end_date)}: <b>{r.present_days}</b> of {r.total_days} days
                  </span>
                  <button className="rounded-md p-1 text-red-500 hover:bg-red-50" onClick={() => setRemoving(r)} aria-label="Delete record">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <ConfirmDialog
        open={!!removing}
        title="Delete this weekly record?"
        message={removing && <>The record for {formatDate(removing.start_date)} – {formatDate(removing.end_date)} will be deleted.</>}
        busy={busy}
        onConfirm={removeLegacy}
        onClose={() => setRemoving(null)}
      />
    </div>
  );
}
