"use client";

import { ArrowRight, Banknote, ClipboardList, ReceiptText, Smartphone, UserPlus, Users, Wallet } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { PayModal, type PayTarget } from "@/components/pay-modal";
import { Alert, ClassBadge, EmptyState, Loading, MonthPicker, StatCard } from "@/components/ui";
import { useUser } from "@/components/user-context";
import { api, errorMessage } from "@/lib/client";
import { currentMonth, formatDate, money, MONTHS } from "@/lib/format";
import { CLASSES, classLabel, METHOD_LABEL, type DashboardResponse } from "@/lib/types";

export default function HomePage() {
  const { user } = useUser();
  const [{ year, month }, setMonth] = useState(currentMonth);
  const [data, setData] = useState<{ key: string; res: DashboardResponse } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pay, setPay] = useState<PayTarget | null>(null);
  const key = `${year}-${month}`;

  const load = useCallback(() => {
    api<DashboardResponse>(`/api/dashboard?year=${year}&month=${month}`).then(
      (res) => setData({ key: `${year}-${month}`, res }),
      (e) => setError(errorMessage(e)),
    );
  }, [year, month]);
  useEffect(load, [load]);

  const d = data?.key === key ? data.res : null;
  const pct = d && d.totalStudents ? Math.round((d.paidCount / d.totalStudents) * 100) : 0;

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-800 via-emerald-700 to-green-600 px-6 py-8 text-white shadow-lg sm:px-10">
        <div className="absolute -top-16 -right-16 h-56 w-56 rounded-full bg-white/10" />
        <div className="absolute right-24 -bottom-20 h-40 w-40 rounded-full bg-white/5" />
        <div className="relative">
          <p className="text-sm text-emerald-100/80">Assalam-o-Alaikum{user ? `, ${user.username}` : ""}</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Al-Ismat Academy</h1>
          <p className="mt-1 max-w-xl text-sm text-emerald-50/85">Students, monthly fees, fee challans and attendance, all in one place.</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href="/students?add=1" className="btn bg-white text-emerald-800 hover:bg-emerald-50">
              <UserPlus className="h-4 w-4" /> Add student
            </Link>
            <Link href="/challans" className="btn border border-white/30 text-white hover:bg-white/10">
              <ReceiptText className="h-4 w-4" /> Generate challan
            </Link>
            <Link href="/fees" className="btn border border-white/30 text-white hover:bg-white/10">
              <Wallet className="h-4 w-4" /> Record a fee
            </Link>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-emerald-950">
          Fees for {MONTHS[month - 1]} {year}
        </h2>
        <MonthPicker year={year} month={month} onChange={(y, m) => setMonth({ year: y, month: m })} />
      </div>

      {error && <Alert kind="error">{error}</Alert>}
      {!d ? (
        !error && <Loading />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <StatCard
              label="Students"
              value={d.totalStudents}
              icon={<Users className="h-5 w-5" />}
              hint={CLASSES.filter((c) => d.byClass[c]).map((c) => `${c === "other" ? "Other" : `Class ${c}`}: ${d.byClass[c]}`).join(" · ") || "No students yet"}
            />
            <StatCard
              label="Fee paid"
              value={
                <>
                  {d.paidCount}
                  <span className="text-base font-medium text-emerald-900/45"> / {d.totalStudents}</span>
                </>
              }
              icon={<Wallet className="h-5 w-5" />}
              hint={`${d.unpaidCount} still unpaid`}
            />
            <StatCard
              label="Collected"
              value={money(d.collected)}
              tone="sky"
              icon={<Banknote className="h-5 w-5" />}
              hint={`Online ${money(d.byMethod.online)} · Cash ${money(d.byMethod.cash)}`}
            />
            <Link href="/students?form=pending" className="grid rounded-2xl transition hover:-translate-y-0.5 hover:shadow-md">
              <StatCard
                label="Admission forms"
                value={d.formsPending}
                tone={d.formsPending ? "amber" : "emerald"}
                icon={<ClipboardList className="h-5 w-5" />}
                hint={d.formsPending ? "not submitted yet · view" : "All submitted"}
              />
            </Link>
          </div>

          <div className="card p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="font-semibold text-emerald-950">Collection progress</h3>
              <span className="text-sm text-emerald-900/60">
                {money(d.collected)} of {money(d.expected)} expected
              </span>
            </div>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-emerald-900/5">
              <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-700 transition-all" style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-2 text-xs text-emerald-900/55">
              {pct}% of students have paid. Expected = sum of each student&apos;s own monthly fee.
              {d.feeNotSet > 0 && ` ${d.feeNotSet} student${d.feeNotSet === 1 ? " has" : "s have"} no fee set yet.`}
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="card overflow-hidden">
              <div className="flex items-center justify-between border-b border-emerald-900/10 px-5 py-4">
                <h3 className="font-semibold text-emerald-950">Unpaid this month</h3>
                <Link href={`/fees?month=${year}-${String(month).padStart(2, "0")}&status=unpaid`} className="flex items-center gap-1 text-sm font-semibold text-emerald-700 hover:underline">
                  See all <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              {d.unpaid.length === 0 ? (
                <EmptyState icon={<Wallet className="h-10 w-10" />} title={d.totalStudents ? "Everyone has paid" : "No students yet"} />
              ) : (
                <ul className="divide-y divide-emerald-900/5">
                  {d.unpaid.map((s) => (
                    <li key={s.id} className="flex items-center justify-between gap-3 px-5 py-3">
                      <Link href={`/students/${s.id}`} className="min-w-0">
                        <div className="truncate font-medium text-emerald-950 hover:underline">{s.name}</div>
                        <div className="text-xs text-emerald-900/55">
                          {classLabel(s.class_name)}
                          {s.roll_no ? ` · Roll ${s.roll_no}` : ""} · {s.monthly_fee ? money(s.monthly_fee) : "fee not set"}
                        </div>
                      </Link>
                      <button className="btn-secondary shrink-0 px-3 py-1.5 text-xs" onClick={() => setPay({ student: s, year, month, payment: null })}>
                        Mark paid
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="card overflow-hidden">
              <div className="border-b border-emerald-900/10 px-5 py-4">
                <h3 className="font-semibold text-emerald-950">Recent payments</h3>
              </div>
              {d.recentPayments.length === 0 ? (
                <EmptyState icon={<Banknote className="h-10 w-10" />} title="No payments recorded yet" />
              ) : (
                <ul className="divide-y divide-emerald-900/5">
                  {d.recentPayments.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-3 px-5 py-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Link href={`/students/${p.student_id}`} className="truncate font-medium text-emerald-950 hover:underline">
                            {p.name}
                          </Link>
                          <ClassBadge className={p.class_name} />
                        </div>
                        <div className="text-xs text-emerald-900/55">
                          {MONTHS[p.month - 1]} {p.year} · paid {formatDate(p.paid_on)}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="font-semibold text-emerald-950 tabular-nums">{money(p.amount)}</div>
                        <div className="flex items-center justify-end gap-1 text-xs text-emerald-900/55">
                          {p.method === "cash" ? <Banknote className="h-3 w-3" /> : <Smartphone className="h-3 w-3" />}
                          {METHOD_LABEL[p.method]}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
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
    </div>
  );
}
