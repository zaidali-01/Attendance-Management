"use client";

import { ArrowLeft, CalendarCheck, ImageDown, Printer } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { StudentPicker } from "@/components/student-picker";
import { useToast } from "@/components/toast";
import { Alert, EmptyState, Loading, PageHeader, Spinner } from "@/components/ui";
import { sumRows, weeklyRows } from "@/lib/attendance";
import { api, errorMessage } from "@/lib/client";
import { formatDate, monthEndOf, monthStartOf, todayYmd } from "@/lib/format";
import { classShort, type DayMark, type Student, type StudentDetail } from "@/lib/types";

export default function ReportsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <ReportView />
    </Suspense>
  );
}

function presets(today: string) {
  const y = Number(today.slice(0, 4));
  const m = Number(today.slice(5, 7));
  const prev = m === 1 ? { y: y - 1, m: 12 } : { y, m: m - 1 };
  return [
    { label: "This month", from: monthStartOf(y, m), to: monthEndOf(y, m) },
    { label: "Last month", from: monthStartOf(prev.y, prev.m), to: monthEndOf(prev.y, prev.m) },
    { label: "Last 3 months", from: monthStartOf(m <= 2 ? y - 1 : y, ((m + 9) % 12) + 1), to: monthEndOf(y, m) },
    { label: "This year", from: `${y}-01-01`, to: `${y}-12-31` },
  ];
}

function ReportView() {
  const toast = useToast();
  const params = useSearchParams();
  const [today] = useState(todayYmd);
  const [students, setStudents] = useState<Student[] | null>(null);
  const [studentId, setStudentId] = useState<number | null>(Number(params.get("student")) || null);
  const [range, setRange] = useState(() => presets(today)[0]);
  const [detail, setDetail] = useState<StudentDetail | null>(null);
  const [marks, setMarks] = useState<{ key: string; rows: DayMark[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);
  const key = `${studentId}|${range.from}|${range.to}`;

  useEffect(() => {
    api<Student[]>("/api/students").then(setStudents, (e) => setError(errorMessage(e)));
  }, []);
  useEffect(() => {
    if (!studentId) return;
    api<StudentDetail>(`/api/students/${studentId}`).then(setDetail, (e) => setError(errorMessage(e)));
  }, [studentId]);
  useEffect(() => {
    if (!studentId || !range.from || !range.to || range.from > range.to) return;
    api<DayMark[]>(`/api/daily-attendance?studentId=${studentId}&start=${range.from}&end=${range.to}`).then(
      (rows) => setMarks({ key: `${studentId}|${range.from}|${range.to}`, rows }),
      (e) => setError(errorMessage(e)),
    );
  }, [studentId, range]);

  const current = detail?.id === studentId ? detail : null;
  const rows = current && marks?.key === key ? weeklyRows(marks.rows, range.from, range.to, current.attendance) : null;
  const total = rows ? sumRows(rows) : null;

  async function downloadImage() {
    if (!reportRef.current || !current) return;
    setExporting(true);
    try {
      const { toPng } = await import("html-to-image");
      const url = await toPng(reportRef.current, { pixelRatio: 2, backgroundColor: "#ffffff" });
      const a = document.createElement("a");
      a.href = url;
      a.download = `Attendance_${current.name.replace(/[^\w]+/g, "-")}_${range.from}_${range.to}.png`;
      a.click();
    } catch (e) {
      toast("error", `Could not create the image: ${errorMessage(e)}`);
    } finally {
      setExporting(false);
    }
  }

  const th = "border border-emerald-900/10 px-3 py-2";
  const td = "border border-emerald-900/10 px-3 py-2 text-right tabular-nums";

  return (
    <div>
      <Link href="/attendance" className="no-print mb-3 inline-flex items-center gap-1 text-sm font-semibold text-emerald-700 hover:underline">
        <ArrowLeft className="h-4 w-4" /> Attendance
      </Link>
      <PageHeader title="Attendance report" description="Week-by-week attendance for one student, ready to print or share." />
      {error && (
        <div className="mb-4">
          <Alert kind="error">{error}</Alert>
        </div>
      )}
      <div className="no-print card mb-6 space-y-4 p-5">
        <div className="grid gap-4 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <span className="label">Student</span>
            {students ? <StudentPicker students={students} value={studentId} onChange={setStudentId} /> : <div className="input text-emerald-900/40">Loading…</div>}
          </div>
          <div>
            <label className="label" htmlFor="r-from">From</label>
            <input id="r-from" type="date" className="input" value={range.from} onChange={(e) => setRange({ label: "", from: e.target.value, to: range.to })} />
          </div>
          <div>
            <label className="label" htmlFor="r-to">To</label>
            <input id="r-to" type="date" className="input" value={range.to} min={range.from} onChange={(e) => setRange({ label: "", from: range.from, to: e.target.value })} />
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {presets(today).map((p) => (
              <button
                key={p.label}
                className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${
                  range.label === p.label ? "bg-emerald-700 text-white ring-emerald-700" : "text-emerald-800 ring-emerald-900/15 hover:bg-emerald-50"
                }`}
                onClick={() => setRange(p)}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button className="btn-primary" disabled={!rows} onClick={() => window.print()}>
              <Printer className="h-4 w-4" /> Print
            </button>
            <button className="btn-secondary" disabled={!rows || exporting} onClick={downloadImage}>
              {exporting ? <Spinner className="h-4 w-4" /> : <ImageDown className="h-4 w-4" />} Image
            </button>
          </div>
        </div>
      </div>

      {!studentId ? (
        <div className="card">
          <EmptyState icon={<CalendarCheck className="h-10 w-10" />} title="Choose a student">
            The report appears here, ready to print or save as an image.
          </EmptyState>
        </div>
      ) : !current || !rows || !total ? (
        !error && <Loading />
      ) : (
        <div ref={reportRef} className="card mx-auto max-w-3xl bg-white p-6 sm:p-8 print:max-w-none print:border-0 print:p-0">
          <div className="border-b-4 border-emerald-700 pb-3 text-center">
            <h2 className="text-2xl font-bold text-emerald-800">AL-ISMAT Academy</h2>
            <p className="text-sm text-emerald-900/60">Weekly Attendance Report</p>
          </div>
          <dl className="mt-5 grid gap-x-8 gap-y-1.5 text-sm sm:grid-cols-2">
            {[
              ["Student", current.name],
              ["Class", classShort(current.class_name)],
              ["Roll #", current.roll_no ?? "—"],
              ["Period", `${formatDate(range.from)} to ${formatDate(range.to)}`],
            ].map(([k, v]) => (
              <div key={k} className="flex gap-2">
                <dt className="w-16 shrink-0 font-semibold text-emerald-800">{k}</dt>
                <dd className="text-emerald-950">{v}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              ["Attendance", total.pct == null ? "—" : `${total.pct}%`, "text-emerald-800"],
              ["Present", total.present, "text-emerald-700"],
              ["Late", total.late, "text-amber-700"],
              ["Absent", total.absent, "text-red-600"],
            ].map(([label, value, tone]) => (
              <div key={label as string} className="rounded-xl bg-emerald-50/70 px-3 py-2">
                <div className="text-[11px] font-semibold tracking-wide text-emerald-900/55 uppercase">{label}</div>
                <div className={`text-xl font-bold tabular-nums ${tone}`}>{value}</div>
              </div>
            ))}
          </div>

          <table className="mt-5 w-full border border-emerald-900/15 text-sm">
            <thead className="bg-emerald-50 text-xs font-semibold tracking-wide text-emerald-900/70 uppercase">
              <tr>
                <th className={`${th} text-left`}>Week</th>
                <th className={`${th} text-right`}>Days</th>
                <th className={`${th} text-right`}>Present</th>
                <th className={`${th} text-right`}>Late</th>
                <th className={`${th} text-right`}>Absent</th>
                <th className={`${th} text-right`}>Holiday</th>
                <th className={`${th} text-right`}>%</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-emerald-900/50">
                    No attendance marked in this period.
                  </td>
                </tr>
              )}
              {rows.map((r) => (
                <tr key={`${r.start}-${r.legacyId ?? ""}`}>
                  <td className="border border-emerald-900/10 px-3 py-2 whitespace-nowrap">
                    {formatDate(r.start).slice(0, 6)} – {formatDate(r.end)}
                    {r.legacy && <span className="ml-1 text-xs text-emerald-900/45">(weekly total)</span>}
                  </td>
                  <td className={td}>{r.tally.working}</td>
                  <td className={td}>{r.tally.present}</td>
                  <td className={td}>{r.tally.late}</td>
                  <td className={td}>{r.tally.absent}</td>
                  <td className={td}>{r.tally.holiday}</td>
                  <td className={`${td} font-semibold`}>{r.tally.pct == null ? "—" : `${r.tally.pct}%`}</td>
                </tr>
              ))}
            </tbody>
            {rows.length > 0 && (
              <tfoot className="bg-emerald-50/70 font-semibold">
                <tr>
                  <td className="border border-emerald-900/10 px-3 py-2">Overall</td>
                  <td className={td}>{total.working}</td>
                  <td className={td}>{total.present}</td>
                  <td className={td}>{total.late}</td>
                  <td className={td}>{total.absent}</td>
                  <td className={td}>{total.holiday}</td>
                  <td className={td}>{total.pct == null ? "—" : `${total.pct}%`}</td>
                </tr>
              </tfoot>
            )}
          </table>
          <p className="mt-3 text-xs text-emerald-900/50">Days = days classes were held (holidays not counted). % = (present + late) ÷ days.</p>
          <p className="mt-6 text-center text-xs text-emerald-900/45">Generated on {formatDate(today)} · AL-ISMAT Academy</p>
        </div>
      )}
    </div>
  );
}
