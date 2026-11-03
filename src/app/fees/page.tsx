"use client";

import { Banknote, CheckCircle2, CircleDashed, Pencil, ReceiptText, Search, Smartphone, Undo2, Wallet } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { PayModal, type PayTarget } from "@/components/pay-modal";
import { useToast } from "@/components/toast";
import { Alert, ClassBadge, ConfirmDialog, EmptyState, FeeBadge, Loading, MonthPicker, PageHeader, Segmented, StatCard } from "@/components/ui";
import { api, errorMessage } from "@/lib/client";
import { currentMonth, dueDate, joinedBy, formatDate, money, monthKey, MONTHS, parseMonthKey, todayYmd } from "@/lib/format";
import { CLASSES, DEFAULT_SETTINGS, type Payment, type Settings, type StudentWithPayment } from "@/lib/types";

type Status = "all" | "unpaid" | "paid";
type ClassFilter = "all" | (typeof CLASSES)[number];

export default function FeesPage() {
  return (
    <Suspense fallback={<Loading />}>
      <FeesView />
    </Suspense>
  );
}

function FeesView() {
  const toast = useToast();
  const params = useSearchParams();
  const [{ year, month }, setMonth] = useState(() => parseMonthKey(params.get("month")) ?? currentMonth());
  const [today] = useState(todayYmd);
  const [data, setData] = useState<{ key: string; rows: StudentWithPayment[] } | null>(null);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>(params.get("status") === "unpaid" ? "unpaid" : params.get("status") === "paid" ? "paid" : "all");
  const [cls, setCls] = useState<ClassFilter>("all");
  const [query, setQuery] = useState("");
  const [pay, setPay] = useState<PayTarget | null>(null);
  const [undo, setUndo] = useState<{ payment: Payment; name: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const key = monthKey(year, month);

  const load = useCallback(() => {
    api<StudentWithPayment[]>(`/api/students?year=${year}&month=${month}`).then(
      (rows) => setData({ key: monthKey(year, month), rows }),
      (e) => setError(errorMessage(e)),
    );
  }, [year, month]);
  useEffect(load, [load]);
  useEffect(() => {
    api<Settings>("/api/settings").then(setSettings, () => {});
  }, []);

  const rows = data?.key === key ? data.rows : null;
  const due = dueDate(year, month, settings.dueDay);
  const overdue = today > due;

  const stats = useMemo(() => {
    const list = rows ?? [];
    const paid = list.filter((s) => s.payment);
    const sum = (ps: Payment[]) => ps.reduce((a, p) => a + p.amount, 0);
    const payments = paid.map((s) => s.payment!);
    return {
      total: list.length,
      paid: paid.length,
      collected: sum(payments),
      online: sum(payments.filter((p) => p.method === "online")),
      cash: sum(payments.filter((p) => p.method === "cash")),
      outstanding: list.filter((s) => !s.payment).reduce((a, s) => a + s.monthly_fee, 0),
    };
  }, [rows]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (rows ?? []).filter(
      (s) =>
        (cls === "all" || s.class_name === cls) &&
        (status === "all" || (status === "paid") === !!s.payment) &&
        (!q || s.name.toLowerCase().includes(q) || (s.roll_no ?? "").toLowerCase().includes(q)),
    );
  }, [rows, query, cls, status]);

  async function doUndo() {
    if (!undo) return;
    setBusy(true);
    try {
      const p = undo.payment;
      await api(`/api/payments?studentId=${p.student_id}&year=${p.year}&month=${p.month}`, { method: "DELETE" });
      toast("success", `${undo.name}: ${MONTHS[p.month - 1]} marked as unpaid`);
      setUndo(null);
      load();
    } catch (e) {
      toast("error", errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const actions = (s: StudentWithPayment) =>
    s.payment ? (
      <>
        <button className="btn-ghost px-2 py-1.5 text-xs" onClick={() => setPay({ student: s, year, month, payment: s.payment })}>
          <Pencil className="h-3.5 w-3.5" /> Edit
        </button>
        <button className="btn-ghost px-2 py-1.5 text-xs text-red-600 hover:bg-red-50" onClick={() => setUndo({ payment: s.payment!, name: s.name })}>
          <Undo2 className="h-3.5 w-3.5" /> Undo
        </button>
      </>
    ) : (
      <>
        <button className="btn-primary px-3 py-1.5 text-xs" onClick={() => setPay({ student: s, year, month, payment: null })}>
          <CheckCircle2 className="h-3.5 w-3.5" /> Mark paid
        </button>
        <Link href={`/challans?student=${s.id}&month=${key}`} className="btn-ghost px-2 py-1.5 text-xs" title="Fee challan">
          <ReceiptText className="h-3.5 w-3.5" />
        </Link>
      </>
    );

  return (
    <div>
      <PageHeader
        title="Fees"
        description={`Last day to pay for ${MONTHS[month - 1]}: ${formatDate(due)}${overdue ? " (passed)" : ""}`}
        actions={<MonthPicker year={year} month={month} onChange={(y, m) => setMonth({ year: y, month: m })} />}
      />

      {error && <Alert kind="error">{error}</Alert>}
      {!rows ? (
        !error && <Loading />
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <StatCard label="Paid" value={`${stats.paid} / ${stats.total}`} icon={<CheckCircle2 className="h-5 w-5" />} hint={`${stats.total - stats.paid} unpaid`} />
            <StatCard label="Collected" value={money(stats.collected)} tone="sky" icon={<Wallet className="h-5 w-5" />} />
            <StatCard label="Paid online" value={money(stats.online)} tone="violet" icon={<Smartphone className="h-5 w-5" />} hint={`Cash ${money(stats.cash)}`} />
            <StatCard label="Outstanding" value={money(stats.outstanding)} tone={stats.outstanding ? "amber" : "emerald"} icon={<Banknote className="h-5 w-5" />} hint="Own fees of unpaid students" />
          </div>

          <div className="card mb-4 space-y-3 p-4">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-emerald-900/40" />
              <input className="input pl-9" placeholder="Search by name or roll #" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
            <div className="flex flex-wrap gap-3">
              <Segmented
                size="sm"
                value={status}
                onChange={setStatus}
                options={[
                  { value: "all", label: "All" },
                  { value: "unpaid", label: `Unpaid (${stats.total - stats.paid})` },
                  { value: "paid", label: `Paid (${stats.paid})` },
                ]}
              />
              <Segmented
                size="sm"
                value={cls}
                onChange={setCls}
                options={[{ value: "all", label: "All classes" }, ...CLASSES.map((c) => ({ value: c, label: c === "other" ? "Other" : `Class ${c}` }))]}
              />
            </div>
          </div>

          <div className="card overflow-hidden">
            {shown.length === 0 ? (
              <EmptyState icon={<CircleDashed className="h-10 w-10" />} title={rows.length ? "Nothing here" : "No students yet"}>
                {rows.length ? (status === "unpaid" ? "Everyone in this view has paid." : "Try another filter.") : <Link href="/students?add=1" className="text-emerald-700 underline">Add a student</Link>}
              </EmptyState>
            ) : (
              <>
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full text-sm">
                    <thead className="bg-emerald-50/70 text-left text-xs font-semibold tracking-wide text-emerald-900/60 uppercase">
                      <tr>
                        <th className="px-4 py-3">Student</th>
                        <th className="px-4 py-3">Class</th>
                        <th className="px-4 py-3 text-right">Fee</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Payment</th>
                        <th className="px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-emerald-900/5">
                      {shown.map((s) => (
                        <tr key={s.id} className="hover:bg-emerald-50/40">
                          <td className="px-4 py-3">
                            <Link href={`/students/${s.id}`} className="font-medium text-emerald-950 hover:underline">
                              {s.name}
                            </Link>
                            {s.roll_no && <div className="text-xs text-emerald-900/50">Roll {s.roll_no}</div>}
                          </td>
                          <td className="px-4 py-3">
                            <ClassBadge className={s.class_name} short />
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums">{s.monthly_fee ? money(s.monthly_fee) : <span className="text-amber-700">Not set</span>}</td>
                          <td className="px-4 py-3">
                            <FeeBadge payment={s.payment} overdue={overdue && joinedBy(s.created_at, year, month)} />
                          </td>
                          <td className="px-4 py-3 text-xs text-emerald-900/65">
                            {s.payment ? (
                              <>
                                <span className="font-semibold text-emerald-950 tabular-nums">{money(s.payment.amount)}</span> on {formatDate(s.payment.paid_on)}
                                {s.payment.note && <div className="max-w-48 truncate italic">{s.payment.note}</div>}
                              </>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-1">{actions(s)}</div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <ul className="divide-y divide-emerald-900/5 md:hidden">
                  {shown.map((s) => (
                    <li key={s.id} className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <Link href={`/students/${s.id}`} className="min-w-0">
                          <div className="truncate font-semibold text-emerald-950">{s.name}</div>
                          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-emerald-900/60">
                            <ClassBadge className={s.class_name} />
                            {s.roll_no && <span>Roll {s.roll_no}</span>}
                            <span>· {s.monthly_fee ? money(s.monthly_fee) : "fee not set"}</span>
                          </div>
                        </Link>
                        <FeeBadge payment={s.payment} overdue={overdue && joinedBy(s.created_at, year, month)} />
                      </div>
                      {s.payment && (
                        <div className="mt-2 text-xs text-emerald-900/65">
                          {money(s.payment.amount)} on {formatDate(s.payment.paid_on)}
                        </div>
                      )}
                      <div className="mt-2 flex justify-end gap-1">{actions(s)}</div>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </>
      )}

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
        message={undo && <>The {MONTHS[undo.payment.month - 1]} {undo.payment.year} payment of {money(undo.payment.amount)} by {undo.name} will be removed.</>}
        confirmLabel="Mark unpaid"
        busy={busy}
        onConfirm={doUndo}
        onClose={() => setUndo(null)}
      />
    </div>
  );
}
