"use client";

import { useState } from "react";
import { api, errorMessage } from "@/lib/client";
import { money } from "@/lib/format";
import { CLASSES, classLabel, type ClassName, type Student } from "@/lib/types";
import { Alert, Segmented, Spinner, Toggle } from "./ui";

type FormState = { name: string; class_name: ClassName | ""; roll_no: string; monthly_fee: string; admission_form: boolean };

/** Add or edit a student. */
export function StudentForm({
  student,
  challanFee,
  onSaved,
  onCancel,
}: {
  student: Student | null;
  challanFee: number;
  onSaved: (s: Student) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<FormState>({
    name: student?.name ?? "",
    class_name: student?.class_name ?? "",
    roll_no: student?.roll_no ?? "",
    monthly_fee: student ? String(student.monthly_fee || "") : "",
    admission_form: student?.admission_form ?? false,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.class_name) return setError("Choose the class.");
    setBusy(true);
    setError(null);
    try {
      const saved = await api<Student>(student ? `/api/students/${student.id}` : "/api/students", {
        method: student ? "PUT" : "POST",
        json: { ...form, monthly_fee: form.monthly_fee === "" ? "" : Number(form.monthly_fee) },
      });
      onSaved(saved);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      {error && <Alert kind="error">{error}</Alert>}
      <div>
        <label className="label" htmlFor="s-name">Full name *</label>
        <input id="s-name" className="input" required autoFocus value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Muhammad Ali" />
      </div>
      <div>
        <span className="label">Class *</span>
        <Segmented
          value={form.class_name as ClassName}
          options={CLASSES.map((c) => ({ value: c, label: c === "other" ? "Other" : c }))}
          onChange={(v) => set("class_name", v)}
        />
        {form.class_name && <p className="mt-1 text-xs text-emerald-900/50">{classLabel(form.class_name)}</p>}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="s-roll">Roll #</label>
          <input id="s-roll" className="input" value={form.roll_no} onChange={(e) => set("roll_no", e.target.value)} placeholder="e.g. 14" />
        </div>
        <div>
          <label className="label" htmlFor="s-fee">Monthly fee (Rs) *</label>
          <input
            id="s-fee"
            className="input"
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            required
            value={form.monthly_fee}
            onChange={(e) => set("monthly_fee", e.target.value)}
            placeholder="e.g. 9500"
          />
        </div>
      </div>
      <p className="-mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-900/70">
        This is what the student actually pays and is used when marking the fee as paid. The challan always shows {money(challanFee)}.
      </p>
      <div className="rounded-xl border border-emerald-900/10 p-3">
        <Toggle checked={form.admission_form} onChange={(v) => set("admission_form", v)} label="Admission form submitted" />
      </div>
      <div className="flex justify-end gap-2 border-t border-emerald-900/10 pt-4">
        <button type="button" className="btn-secondary" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy && <Spinner className="h-4 w-4" />}
          {student ? "Save changes" : "Add student"}
        </button>
      </div>
    </form>
  );
}
