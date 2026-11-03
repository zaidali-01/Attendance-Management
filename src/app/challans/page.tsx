"use client";

import { ImageDown, Printer, ReceiptText } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { StudentPicker } from "@/components/student-picker";
import { useToast } from "@/components/toast";
import { Alert, EmptyState, Loading, MonthPicker, PageHeader, Segmented, Spinner } from "@/components/ui";
import { FitToWidth, SHEET_WIDTH, VoucherSheet, type VoucherData } from "@/components/voucher";
import { api, errorMessage } from "@/lib/client";
import { currentMonth, dueDate, formatDate, money, monthKey, MONTHS, parseMonthKey, todayYmd } from "@/lib/format";
import { CLASSES, classLabel, DEFAULT_SETTINGS, METHOD_LABEL, type ClassName, type Settings, type StudentWithPayment } from "@/lib/types";

type Mode = "student" | "class";

export default function ChallansPage() {
  return (
    <Suspense fallback={<Loading />}>
      <ChallansView />
    </Suspense>
  );
}

function ChallansView() {
  const toast = useToast();
  const params = useSearchParams();
  const [mode, setMode] = useState<Mode>(params.get("class") ? "class" : "student");
  const [studentId, setStudentId] = useState<number | null>(Number(params.get("student")) || null);
  const [cls, setCls] = useState<ClassName>(((CLASSES as readonly string[]).includes(params.get("class") ?? "") ? params.get("class") : "9") as ClassName);
  const [{ year, month }, setMonthState] = useState(() => parseMonthKey(params.get("month")) ?? currentMonth());
  const [issueDate, setIssueDate] = useState(todayYmd);
  const [dueOverride, setDueOverride] = useState<string | null>(null);
  const [data, setData] = useState<{ key: string; rows: StudentWithPayment[] } | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const copyRef = useRef<HTMLDivElement>(null);
  const key = monthKey(year, month);

  useEffect(() => {
    api<StudentWithPayment[]>(`/api/students?year=${year}&month=${month}`).then(
      (rows) => setData({ key: monthKey(year, month), rows }),
      (e) => setError(errorMessage(e)),
    );
  }, [year, month]);
  useEffect(() => {
    api<Settings>("/api/settings").then(setSettings, (e) => setError(errorMessage(e)));
  }, []);

  const rows = data?.key === key ? data.rows : data?.rows ?? null;
  const s = settings ?? DEFAULT_SETTINGS;
  const due = dueOverride ?? dueDate(year, month, s.dueDay);
  const student = rows?.find((r) => r.id === studentId) ?? null;
  const classStudents = useMemo(() => (rows ?? []).filter((r) => r.class_name === cls), [rows, cls]);
  const targets = mode === "student" ? (student ? [student] : []) : classStudents;

  const toVoucher = (r: StudentWithPayment): VoucherData => ({
    name: r.name,
    rollNo: r.roll_no,
    className: r.class_name,
    year,
    month,
    issueDate,
    dueDate: due,
  });

  function setMonth(y: number, m: number) {
    setMonthState({ year: y, month: m });
    setDueOverride(null); // the last date follows the month unless typed in
  }

  async function downloadImage() {
    if (!copyRef.current || !student) return;
    setExporting(true);
    try {
      const { toPng } = await import("html-to-image");
      const url = await toPng(copyRef.current, { pixelRatio: 3, backgroundColor: "#ffffff" });
      const a = document.createElement("a");
      a.href = url;
      a.download = `Fee-Challan_${student.name.replace(/[^\w]+/g, "-")}_${MONTHS[month - 1]}-${year}.png`;
      a.click();
      toast("success", "Challan image downloaded");
    } catch (e) {
      toast("error", `Could not create the image: ${errorMessage(e)}`);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div>
      <PageHeader title="Fee challans" description="Choose a student and a month. Student details are filled in automatically." />
      {error && (
        <div className="mb-4">
          <Alert kind="error">{error}</Alert>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[340px_1fr] print:block">
        <aside className="no-print space-y-5 self-start lg:sticky lg:top-24">
          <div className="card space-y-5 p-5">
            <Segmented
              value={mode}
              onChange={setMode}
              options={[
                { value: "student", label: "One student" },
                { value: "class", label: "Whole class" },
              ]}
            />

            {mode === "student" ? (
              <div>
                <span className="label">Student</span>
                {rows ? <StudentPicker students={rows} value={studentId} onChange={setStudentId} /> : <div className="input text-emerald-900/40">Loading…</div>}
              </div>
            ) : (
              <div>
                <span className="label">Class</span>
                <Segmented size="sm" value={cls} onChange={setCls} options={CLASSES.map((c) => ({ value: c, label: c === "other" ? "Other" : c }))} />
                <p className="mt-1.5 text-xs text-emerald-900/55">
                  {classStudents.length} student{classStudents.length === 1 ? "" : "s"} in {classLabel(cls)} · one page each
                </p>
              </div>
            )}

            <div>
              <span className="label">Month</span>
              <MonthPicker year={year} month={month} onChange={setMonth} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="c-date">Date</label>
                <input id="c-date" type="date" className="input px-2" value={issueDate} onChange={(e) => e.target.value && setIssueDate(e.target.value)} />
              </div>
              <div>
                <label className="label" htmlFor="c-due">Last date to pay</label>
                <input id="c-due" type="date" className="input px-2" value={due} onChange={(e) => e.target.value && setDueOverride(e.target.value)} />
              </div>
            </div>

            <div className="rounded-xl bg-emerald-50 px-3 py-2.5 text-xs text-emerald-900/75">
              Fee on every challan: <b>{money(s.challanFee)}</b>
              {mode === "student" && student && student.monthly_fee > 0 && student.monthly_fee !== s.challanFee && (
                <> (this student&apos;s own fee is {money(student.monthly_fee)})</>
              )}
              . Change it in{" "}
              <Link href="/settings" className="font-semibold underline">
                Settings
              </Link>
              .
            </div>

            {mode === "student" && student?.payment && (
              <Alert kind="info">
                <span className="block font-semibold">Already paid</span>
                {MONTHS[month - 1]} fee paid {money(student.payment.amount)} ({METHOD_LABEL[student.payment.method]}) on {formatDate(student.payment.paid_on)}.
              </Alert>
            )}

            <div className="flex flex-wrap gap-2 border-t border-emerald-900/10 pt-4">
              <button className="btn-primary flex-1" disabled={!targets.length || !settings} onClick={() => window.print()}>
                <Printer className="h-4 w-4" /> Print{mode === "class" && targets.length > 1 ? ` all ${targets.length}` : ""}
              </button>
              {mode === "student" && (
                <button className="btn-secondary flex-1" disabled={!student || !settings || exporting} onClick={downloadImage}>
                  {exporting ? <Spinner className="h-4 w-4" /> : <ImageDown className="h-4 w-4" />} Image
                </button>
              )}
            </div>
            <p className="-mt-2 text-xs text-emerald-900/50">
              Print gives two copies on one A4 page (student and academy). Image downloads one copy, handy for WhatsApp.
            </p>
          </div>
        </aside>

        <section className="min-w-0 print:block">
          {!rows || !settings ? (
            !error && <Loading />
          ) : targets.length === 0 ? (
            <div className="card no-print">
              <EmptyState icon={<ReceiptText className="h-10 w-10" />} title={mode === "student" ? "Choose a student" : `No students in ${classLabel(cls)}`}>
                {mode === "student" ? "The challan preview appears here." : "Add students to this class first."}
              </EmptyState>
            </div>
          ) : (
            <div className="space-y-6 print:space-y-0">
              {targets.map((t, i) => (
                <div key={t.id} className="card overflow-hidden bg-slate-100 p-3 sm:p-5 print:rounded-none print:border-0 print:bg-white print:p-0">
                  {mode === "class" && (
                    <div className="no-print mb-2 flex items-center justify-between text-xs font-semibold text-emerald-900/60">
                      <span>
                        {i + 1}. {t.name}
                      </span>
                      {t.payment && <span className="text-emerald-700">Paid ✓</span>}
                    </div>
                  )}
                  <FitToWidth width={SHEET_WIDTH}>
                    <VoucherSheet ref={i === 0 ? copyRef : undefined} data={toVoucher(t)} settings={settings} />
                  </FitToWidth>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
