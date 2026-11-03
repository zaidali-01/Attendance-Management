"use client";

import { Banknote, Smartphone } from "lucide-react";
import { useState } from "react";
import { api, errorMessage } from "@/lib/client";
import { MONTHS, todayYmd } from "@/lib/format";
import { classLabel, type Payment, type PaymentMethod, type Student } from "@/lib/types";
import { useToast } from "./toast";
import { Alert, Modal, Spinner } from "./ui";

export type PayTarget = {
  student: Pick<Student, "id" | "name" | "class_name" | "monthly_fee">;
  year: number;
  month: number;
  payment: Payment | null;
};

/** Mark a month's fee as paid: amount, Online or Cash, and the date. */
export function PayModal({ target, onClose, onSaved }: { target: PayTarget | null; onClose: () => void; onSaved: (p: Payment) => void }) {
  return (
    <Modal open={!!target} title={target?.payment ? "Edit payment" : "Mark fee as paid"} onClose={onClose}>
      {target && <PayForm key={`${target.student.id}-${target.year}-${target.month}`} target={target} onClose={onClose} onSaved={onSaved} />}
    </Modal>
  );
}

function PayForm({ target, onClose, onSaved }: { target: PayTarget; onClose: () => void; onSaved: (p: Payment) => void }) {
  const toast = useToast();
  const { student, year, month, payment } = target;
  const [amount, setAmount] = useState(String(payment?.amount ?? (student.monthly_fee || "")));
  const [method, setMethod] = useState<PaymentMethod | null>(payment?.method ?? null);
  const [paidOn, setPaidOn] = useState(payment?.paid_on ?? todayYmd());
  const [note, setNote] = useState(payment?.note ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!method) return setError("Choose how the fee was paid: Online or Cash.");
    setBusy(true);
    setError(null);
    try {
      const saved = await api<Payment>("/api/payments", {
        method: "PUT",
        json: { studentId: student.id, year, month, amount: Number(amount), method, paidOn, note },
      });
      toast("success", `${student.name}: ${MONTHS[month - 1]} fee marked as paid (${method === "cash" ? "Cash" : "Online"})`);
      onSaved(saved);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  const methods: { value: PaymentMethod; label: string; hint: string; icon: typeof Banknote }[] = [
    { value: "online", label: "Online", hint: "QR / bank transfer", icon: Smartphone },
    { value: "cash", label: "Cash", hint: "Paid at the academy", icon: Banknote },
  ];

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="rounded-xl bg-emerald-50 px-4 py-3">
        <div className="font-semibold text-emerald-950">{student.name}</div>
        <div className="text-sm text-emerald-900/65">
          {classLabel(student.class_name)} · Fee for {MONTHS[month - 1]} {year}
        </div>
      </div>
      {error && <Alert kind="error">{error}</Alert>}
      <div>
        <span className="label">Payment method *</span>
        <div className="grid grid-cols-2 gap-3">
          {methods.map(({ value, label, hint, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setMethod(value)}
              aria-pressed={method === value}
              className={`flex items-center gap-3 rounded-xl border-2 p-3 text-left transition-colors ${
                method === value ? "border-emerald-600 bg-emerald-50" : "border-emerald-900/10 hover:border-emerald-300"
              }`}
            >
              <Icon className={`h-6 w-6 ${method === value ? "text-emerald-700" : "text-emerald-900/40"}`} />
              <span>
                <span className="block font-semibold text-emerald-950">{label}</span>
                <span className="block text-xs text-emerald-900/55">{hint}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="p-amount">Amount paid (Rs) *</label>
          <input id="p-amount" className="input" type="number" min={1} step={1} inputMode="numeric" required value={amount} onChange={(e) => setAmount(e.target.value)} />
          {student.monthly_fee > 0 && <p className="mt-1 text-xs text-emerald-900/50">Student&apos;s fee: Rs {student.monthly_fee.toLocaleString("en-US")}</p>}
        </div>
        <div>
          <label className="label" htmlFor="p-date">Paid on *</label>
          <input id="p-date" className="input" type="date" required value={paidOn} onChange={(e) => setPaidOn(e.target.value)} />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="p-note">Note</label>
        <input id="p-note" className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional, e.g. includes late fine" />
      </div>
      <div className="flex justify-end gap-2 border-t border-emerald-900/10 pt-4">
        <button type="button" className="btn-secondary" onClick={onClose} disabled={busy}>
          Cancel
        </button>
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy && <Spinner className="h-4 w-4" />}
          {payment ? "Save payment" : "Mark as paid"}
        </button>
      </div>
    </form>
  );
}
