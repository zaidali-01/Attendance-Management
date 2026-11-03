"use client";

import { CalendarCheck, CheckCheck, ChevronLeft, ChevronRight, Eraser, FileText, Palmtree, Users } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ClassDaySummary, MonthCalendar, STATUS_STYLE, StatusButtons, StatusLegend } from "@/components/attendance-ui";
import { useToast } from "@/components/toast";
import { Alert, EmptyState, Loading, PageHeader, Segmented, Spinner } from "@/components/ui";
import { tally } from "@/lib/attendance";
import { api, errorMessage } from "@/lib/client";
import { addDays, eachDay, formatDate, formatDay, monthEndOf, monthStartOf, todayYmd, weekday, weekStart } from "@/lib/format";
import { CLASSES, classLabel, STATUS_LABEL, type ClassName, type DayMark, type DayStatus, type Student } from "@/lib/types";

type View = "mark" | "week";
const keyOf = (studentId: number, day: string) => `${studentId}|${day}`;

export default function AttendancePage() {
  return (
    <Suspense fallback={<Loading />}>
      <AttendanceView />
    </Suspense>
  );
}

function AttendanceView() {
  const params = useSearchParams();
  const [today] = useState(todayYmd);
  const [students, setStudents] = useState<Student[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cls, setCls] = useState<ClassName>(() => {
    const c = params.get("class");
    return (CLASSES as readonly string[]).includes(c ?? "") ? (c as ClassName) : "9";
  });
  const [view, setView] = useState<View>(params.get("view") === "week" ? "week" : "mark");
  const [focusDay, setFocusDay] = useState(params.get("day"));

  useEffect(() => {
    api<Student[]>("/api/students").then(setStudents, (e) => setError(errorMessage(e)));
  }, []);

  const roster = useMemo(() => (students ?? []).filter((s) => s.class_name === cls), [students, cls]);
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const s of students ?? []) c[s.class_name] = (c[s.class_name] ?? 0) + 1;
    return c;
  }, [students]);

  return (
    <div>
      <PageHeader
        title="Attendance"
        description="Choose a class, click a day on the calendar and mark each student."
        actions={
          <Link href="/reports" className="btn-secondary">
            <FileText className="h-4 w-4" /> Student report
          </Link>
        }
      />

      <div className="card mb-5 flex flex-wrap items-center justify-between gap-3 p-3 sm:p-4">
        <Segmented
          value={cls}
          onChange={setCls}
          options={CLASSES.map((c) => ({
            value: c,
            label: (
              <>
                {c === "other" ? "Other" : `Class ${c}`} <span className="text-emerald-900/40">{counts[c] ?? 0}</span>
              </>
            ),
          }))}
        />
        <Segmented
          value={view}
          onChange={setView}
          options={[
            { value: "mark", label: "Mark attendance" },
            { value: "week", label: "Weekly view" },
          ]}
        />
      </div>

      {error && <Alert kind="error">{error}</Alert>}
      {!students ? (
        !error && <Loading />
      ) : roster.length === 0 ? (
        <div className="card">
          <EmptyState icon={<Users className="h-10 w-10" />} title={`No students in ${classLabel(cls)}`}>
            <Link href="/students?add=1" className="font-semibold text-emerald-700 underline">
              Add a student
            </Link>{" "}
            to this class first.
          </EmptyState>
        </div>
      ) : view === "mark" ? (
        <MarkView key={`${cls}-${focusDay}`} cls={cls} roster={roster} today={today} initialDay={focusDay} />
      ) : (
        <WeekView
          key={cls}
          cls={cls}
          roster={roster}
          today={today}
          onPickDay={(d) => {
            setFocusDay(d);
            setView("mark");
          }}
        />
      )}
    </div>
  );
}

/** Calendar on the left, the class list for the chosen day on the right. */
function MarkView({ cls, roster, today, initialDay }: { cls: ClassName; roster: Student[]; today: string; initialDay: string | null }) {
  const toast = useToast();
  const [day, setDay] = useState(initialDay && /^\d{4}-\d{2}-\d{2}$/.test(initialDay) ? initialDay : today);
  const [ym, setYm] = useState(() => ({ year: Number(day.slice(0, 4)), month: Number(day.slice(5, 7)) }));
  const [marks, setMarks] = useState<{ key: string; map: Map<string, DayStatus> } | null>(null);
  const [saving, setSaving] = useState(0);
  const panel = useRef<HTMLElement>(null);
  const monthKeyStr = `${ym.year}-${ym.month}`;

  const load = useCallback(() => {
    const start = monthStartOf(ym.year, ym.month);
    const end = monthEndOf(ym.year, ym.month);
    api<DayMark[]>(`/api/daily-attendance?class=${cls}&start=${start}&end=${end}`).then(
      (rows) => setMarks({ key: `${ym.year}-${ym.month}`, map: new Map(rows.map((r) => [keyOf(r.student_id, r.day), r.status])) }),
      (e) => toast("error", errorMessage(e)),
    );
  }, [cls, ym, toast]);
  useEffect(load, [load]);

  const map = marks?.key === monthKeyStr ? marks.map : null;
  const ids = new Set(roster.map((s) => s.id));
  const dayTally = (d: string) => tally(roster.flatMap((s) => (map?.has(keyOf(s.id, d)) ? [map.get(keyOf(s.id, d))!] : [])));
  const sel = dayTally(day);
  const marked = sel.working + sel.holiday;

  async function save(entries: { studentId: number; status: DayStatus | null }[]) {
    if (!map) return;
    const before = new Map(map);
    const next = new Map(map);
    for (const e of entries) {
      if (e.status) next.set(keyOf(e.studentId, day), e.status);
      else next.delete(keyOf(e.studentId, day));
    }
    setMarks({ key: monthKeyStr, map: next });
    setSaving((n) => n + 1);
    try {
      await api("/api/daily-attendance", { method: "PUT", json: { marks: entries.map((e) => ({ ...e, day })) } });
    } catch (e) {
      setMarks({ key: monthKeyStr, map: before });
      toast("error", `Not saved: ${errorMessage(e)}`);
    } finally {
      setSaving((n) => n - 1);
    }
  }

  const all = (status: DayStatus | null) => save(roster.map((s) => ({ studentId: s.id, status })));

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
      <section className="card self-start p-4 sm:p-5">
        <MonthCalendar
          year={ym.year}
          month={ym.month}
          selected={day}
          today={today}
          onSelect={(d) => {
            setDay(d);
            // On phones the class list is below the calendar: bring it into view.
            if (window.innerWidth < 1024) setTimeout(() => panel.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
          }}
          onMonthChange={(y, m) => {
            setYm({ year: y, month: m });
            const sameMonth = Number(today.slice(0, 4)) === y && Number(today.slice(5, 7)) === m;
            setDay(sameMonth ? today : monthStartOf(y, m));
          }}
          status={(d) => {
            // A whole-class holiday is shown as a holiday day.
            if (!map) return null;
            const t = dayTally(d);
            return t.holiday > 0 && t.working === 0 ? "holiday" : null;
          }}
          renderDay={(d) => {
            if (!map) return null;
            const t = dayTally(d);
            return <ClassDaySummary counts={t} size={ids.size} />;
          }}
        />
        <div className="mt-4 space-y-2 border-t border-emerald-900/10 pt-3">
          <div className="flex flex-wrap items-center gap-3 text-xs text-emerald-900/65">
            <StatusLegend />
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-slate-200" /> Not marked
            </span>
          </div>
          <p className="text-xs text-emerald-900/50">Each day shows how many students are present (P), late (L), absent (A) or on holiday (H).</p>
        </div>
      </section>

      <section ref={panel} className="card scroll-mt-20 self-start overflow-hidden">
        <div className="border-b border-emerald-900/10 bg-emerald-50/50 px-4 py-4 sm:px-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold text-emerald-950">{formatDay(day)}</h2>
              <p className="text-sm text-emerald-900/60">
                {classLabel(cls)} · {marked} of {roster.length} marked
                {weekday(day) === 0 && " · Sunday"}
              </p>
            </div>
            <span className="flex h-6 items-center gap-1.5 text-xs text-emerald-900/50">{saving > 0 ? <><Spinner className="h-3.5 w-3.5" /> Saving…</> : map ? "All changes saved" : ""}</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button className="btn-primary px-3 py-2 text-xs" disabled={!map} onClick={() => all("present")}>
              <CheckCheck className="h-4 w-4" /> All present
            </button>
            <button className="btn-secondary px-3 py-2 text-xs" disabled={!map} onClick={() => all("holiday")}>
              <Palmtree className="h-4 w-4" /> Holiday for class
            </button>
            <button className="btn-ghost px-3 py-2 text-xs" disabled={!map || marked === 0} onClick={() => all(null)}>
              <Eraser className="h-4 w-4" /> Clear day
            </button>
          </div>
          {marked > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
              {(["present", "late", "absent", "holiday"] as const).map((s) =>
                sel[s] ? (
                  <span key={s} className={`rounded-full px-2 py-0.5 font-semibold ring-1 ring-inset ${STATUS_STYLE[s].soft}`}>
                    {sel[s]} {STATUS_LABEL[s]}
                  </span>
                ) : null,
              )}
            </div>
          )}
        </div>
        {!map ? (
          <Loading />
        ) : (
          <ul className="divide-y divide-emerald-900/5">
            {roster.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 px-4 py-2.5 sm:px-5">
                <Link href={`/students/${s.id}?tab=attendance`} className="min-w-0">
                  <div className="truncate text-sm font-medium text-emerald-950 hover:underline">{s.name}</div>
                  <div className="text-xs text-emerald-900/50">{s.roll_no ? `Roll ${s.roll_no}` : "No roll #"}</div>
                </Link>
                <StatusButtons value={map.get(keyOf(s.id, day)) ?? null} onChange={(status) => save([{ studentId: s.id, status }])} />
              </li>
            ))}
          </ul>
        )}
        <div className="border-t border-emerald-900/10 px-4 py-3 sm:px-5">
          <StatusLegend />
        </div>
      </section>
    </div>
  );
}

/** One row per student, one column per day of the week, with weekly totals. */
function WeekView({ cls, roster, today, onPickDay }: { cls: ClassName; roster: Student[]; today: string; onPickDay: (day: string) => void }) {
  const toast = useToast();
  const [start, setStart] = useState(() => weekStart(today));
  const end = addDays(start, 6);
  const [data, setData] = useState<{ key: string; map: Map<string, DayStatus> } | null>(null);

  useEffect(() => {
    const e = addDays(start, 6);
    api<DayMark[]>(`/api/daily-attendance?class=${cls}&start=${start}&end=${e}`).then(
      (rows) => setData({ key: start, map: new Map(rows.map((r) => [keyOf(r.student_id, r.day), r.status])) }),
      (err) => toast("error", errorMessage(err)),
    );
  }, [cls, start, toast]);

  const map = data?.key === start ? data.map : null;
  const days = eachDay(start, end);

  return (
    <section className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-900/10 px-4 py-3 sm:px-5">
        <div className="inline-flex items-center gap-1 rounded-xl border border-emerald-900/15 bg-white p-1">
          <button className="rounded-lg p-1.5 text-emerald-800 hover:bg-emerald-50" onClick={() => setStart(addDays(start, -7))} aria-label="Previous week">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="px-2 text-sm font-semibold text-emerald-950">
            {formatDate(start).slice(0, 6)} – {formatDate(end)}
          </span>
          <button className="rounded-lg p-1.5 text-emerald-800 hover:bg-emerald-50" onClick={() => setStart(addDays(start, 7))} aria-label="Next week">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <StatusLegend />
      </div>
      {!map ? (
        <Loading />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-emerald-50/70 text-xs font-semibold tracking-wide text-emerald-900/60 uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Student</th>
                {days.map((d) => (
                  <th key={d} className={`px-1 py-3 text-center ${d === today ? "text-emerald-800" : ""}`}>
                    <button type="button" onClick={() => onPickDay(d)} className="uppercase hover:underline" title="Mark this day">
                      {formatDay(d).slice(0, 3)}
                      <span className="block text-[10px] font-medium normal-case">{Number(d.slice(8))}</span>
                    </button>
                  </th>
                ))}
                <th className="px-2 py-3 text-center">P</th>
                <th className="px-2 py-3 text-center">L</th>
                <th className="px-2 py-3 text-center">A</th>
                <th className="px-4 py-3 text-right">%</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-900/5">
              {roster.map((s) => {
                const statuses = days.flatMap((d) => (map.has(keyOf(s.id, d)) ? [map.get(keyOf(s.id, d))!] : []));
                const t = tally(statuses);
                return (
                  <tr key={s.id} className="hover:bg-emerald-50/40">
                    <td className="px-4 py-2.5">
                      <Link href={`/students/${s.id}?tab=attendance`} className="font-medium whitespace-nowrap text-emerald-950 hover:underline">
                        {s.name}
                      </Link>
                    </td>
                    {days.map((d) => {
                      const st = map.get(keyOf(s.id, d));
                      return (
                        <td key={d} className="px-1 py-2.5 text-center">
                          {st ? (
                            <span className={`inline-flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold ${STATUS_STYLE[st].solid}`} title={STATUS_LABEL[st]}>
                              {STATUS_STYLE[st].letter}
                            </span>
                          ) : (
                            <span className="text-emerald-900/20">·</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-2 py-2.5 text-center text-emerald-700 tabular-nums">{t.present}</td>
                    <td className="px-2 py-2.5 text-center text-amber-700 tabular-nums">{t.late}</td>
                    <td className="px-2 py-2.5 text-center text-red-600 tabular-nums">{t.absent}</td>
                    <td className="px-4 py-2.5 text-right font-semibold tabular-nums">{t.pct == null ? "—" : `${t.pct}%`}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="flex items-center gap-1.5 border-t border-emerald-900/10 px-4 py-3 text-xs text-emerald-900/55 sm:px-5">
        <CalendarCheck className="h-3.5 w-3.5" /> % = (present + late) ÷ days marked, holidays not counted. Click a day heading to mark it.
      </p>
    </section>
  );
}
