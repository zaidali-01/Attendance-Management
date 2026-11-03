"use client";

import { CalendarCheck, ImageDown, Printer } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { StudentPicker } from "@/components/student-picker";
import { useToast } from "@/components/toast";
import { Alert, EmptyState, Loading, PageHeader, Spinner } from "@/components/ui";
import { api, errorMessage } from "@/lib/client";
import { formatDate, percentage, todayYmd } from "@/lib/format";
import { classLabel, type Student, type StudentDetail } from "@/lib/types";

export default function ReportsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <ReportView />
    </Suspense>
  );
}

function ReportView() {
  const toast = useToast();
  const params = useSearchParams();
  const [students, setStudents] = useState<Student[] | null>(null);
  const [studentId, setStudentId] = useState<number | null>(Number(params.get("student")) || null);
  const [detail, setDetail] = useState<StudentDetail | null>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [today] = useState(todayYmd);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api<Student[]>("/api/students").then(setStudents, (e) => setError(errorMessage(e)));
  }, []);
  useEffect(() => {
    if (!studentId) return;
    api<StudentDetail>(`/api/students/${studentId}`).then(setDetail, (e) => setError(errorMessage(e)));
  }, [studentId]);

  const current = detail?.id === studentId ? detail : null;
  const records = (current?.attendance ?? [])
    .filter((r) => (!from || r.start_date >= from) && (!to || r.end_date <= to))
    .sort((a, b) => a.start_date.localeCompare(b.start_date));
  const total = records.reduce((a, r) => a + r.total_days, 0);
  const present = records.reduce((a, r) => a + r.present_days, 0);

  async function downloadImage() {
    if (!reportRef.current || !current) return;
    setExporting(true);
    try {
      const { toPng } = await import("html-to-image");
      const url = await toPng(reportRef.current, { pixelRatio: 2, backgroundColor: "#ffffff" });
      const a = document.createElement("a");
      a.href = url;
      a.download = `Attendance_${current.name.replace(/[^\w]+/g, "-")}.png`;
      a.click();
    } catch (e) {
      toast("error", `Could not create the image: ${errorMessage(e)}`);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div>
      <PageHeader title="Attendance report" description="Week-by-week attendance for one student, with an overall total." />
      {error && (
        <div className="mb-4">
          <Alert kind="error">{error}</Alert>
        </div>
      )}
      <div className="no-print card mb-6 grid gap-4 p-5 md:grid-cols-[1.5fr_1fr_1fr_auto] md:items-end">
        <div>
          <span className="label">Student</span>
          {students ? <StudentPicker students={students} value={studentId} onChange={setStudentId} /> : <div className="input text-emerald-900/40">Loading…</div>}
        </div>
        <div>
          <label className="label" htmlFor="r-from">From (optional)</label>
          <input id="r-from" type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="r-to">To (optional)</label>
          <input id="r-to" type="date" className="input" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <button className="btn-primary" disabled={!current} onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> Print
          </button>
          <button className="btn-secondary" disabled={!current || exporting} onClick={downloadImage} aria-label="Download image">
            {exporting ? <Spinner className="h-4 w-4" /> : <ImageDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {!studentId ? (
        <div className="card">
          <EmptyState icon={<CalendarCheck className="h-10 w-10" />} title="Choose a student">
            The report appears here, ready to print or save as an image.
          </EmptyState>
        </div>
      ) : !current ? (
        !error && <Loading />
      ) : (
        <div ref={reportRef} className="card mx-auto max-w-3xl p-6 sm:p-8 print:max-w-none print:border-0 print:p-0">
          <div className="border-b-4 border-emerald-700 pb-3 text-center">
            <h2 className="text-2xl font-bold text-emerald-800">Al-Ismat Academy</h2>
            <p className="text-sm text-emerald-900/60">Weekly Attendance Report</p>
          </div>
          <dl className="mt-5 grid gap-x-8 gap-y-1.5 text-sm sm:grid-cols-2">
            {[
              ["Student", current.name],
              ["Class", classLabel(current.class_name)],
              ["Roll #", current.roll_no ?? "—"],
              ["Period", `${from ? formatDate(from) : "Beginning"} to ${to ? formatDate(to) : "Latest"}`],
            ].map(([k, v]) => (
              <div key={k} className="flex gap-2">
                <dt className="w-20 shrink-0 font-semibold text-emerald-800">{k}</dt>
                <dd className="text-emerald-950">{v}</dd>
              </div>
            ))}
          </dl>
          <table className="mt-5 w-full border border-emerald-900/15 text-sm">
            <thead className="bg-emerald-50 text-left text-xs font-semibold tracking-wide text-emerald-900/70 uppercase">
              <tr>
                <th className="border border-emerald-900/10 px-3 py-2">Week start</th>
                <th className="border border-emerald-900/10 px-3 py-2">Week end</th>
                <th className="border border-emerald-900/10 px-3 py-2 text-right">Total</th>
                <th className="border border-emerald-900/10 px-3 py-2 text-right">Present</th>
                <th className="border border-emerald-900/10 px-3 py-2 text-right">Absent</th>
                <th className="border border-emerald-900/10 px-3 py-2 text-right">%</th>
              </tr>
            </thead>
            <tbody>
              {records.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-emerald-900/50">
                    No attendance records for this period.
                  </td>
                </tr>
              )}
              {records.map((r) => (
                <tr key={r.id}>
                  <td className="border border-emerald-900/10 px-3 py-2">{formatDate(r.start_date)}</td>
                  <td className="border border-emerald-900/10 px-3 py-2">{formatDate(r.end_date)}</td>
                  <td className="border border-emerald-900/10 px-3 py-2 text-right tabular-nums">{r.total_days}</td>
                  <td className="border border-emerald-900/10 px-3 py-2 text-right tabular-nums">{r.present_days}</td>
                  <td className="border border-emerald-900/10 px-3 py-2 text-right tabular-nums">{r.total_days - r.present_days}</td>
                  <td className="border border-emerald-900/10 px-3 py-2 text-right tabular-nums">{percentage(r.total_days, r.present_days)}%</td>
                </tr>
              ))}
            </tbody>
            {records.length > 0 && (
              <tfoot className="bg-emerald-50/70 font-semibold">
                <tr>
                  <td colSpan={2} className="border border-emerald-900/10 px-3 py-2">
                    Overall
                  </td>
                  <td className="border border-emerald-900/10 px-3 py-2 text-right tabular-nums">{total}</td>
                  <td className="border border-emerald-900/10 px-3 py-2 text-right tabular-nums">{present}</td>
                  <td className="border border-emerald-900/10 px-3 py-2 text-right tabular-nums">{total - present}</td>
                  <td className="border border-emerald-900/10 px-3 py-2 text-right tabular-nums">{percentage(total, present)}%</td>
                </tr>
              </tfoot>
            )}
          </table>
          <p className="mt-6 text-center text-xs text-emerald-900/45">Generated on {formatDate(today)} · Al-Ismat Academy</p>
        </div>
      )}
    </div>
  );
}
