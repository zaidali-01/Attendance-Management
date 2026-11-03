"use client";

import { useState } from "react";
import { api, errorMessage } from "@/lib/client";
import { percentage } from "@/lib/format";
import type { WeeklyRecord } from "@/lib/types";
import { Alert, Spinner } from "./ui";

/** Add or edit one week of attendance. */
export function AttendanceForm({
  studentId,
  record,
  onSaved,
  onCancel,
}: {
  studentId: number;
  record: WeeklyRecord | null;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    start_date: record?.start_date ?? "",
    end_date: record?.end_date ?? "",
    total_days: record ? String(record.total_days) : "",
    present_days: record ? String(record.present_days) : "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const total = Number(form.total_days) || 0;
  const present = Number(form.present_days) || 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api(record ? `/api/attendance/${record.id}` : `/api/students/${studentId}/attendance`, {
        method: record ? "PUT" : "POST",
        json: { ...form, total_days: total, present_days: present },
      });
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {error && <Alert kind="error">{error}</Alert>}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="a-start">Start date *</label>
          <input id="a-start" className="input" type="date" required value={form.start_date} onChange={(e) => set("start_date", e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="a-end">End date *</label>
          <input id="a-end" className="input" type="date" required min={form.start_date || undefined} value={form.end_date} onChange={(e) => set("end_date", e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="a-total">Total days *</label>
          <input id="a-total" className="input" type="number" min={1} required value={form.total_days} onChange={(e) => set("total_days", e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="a-present">Present days *</label>
          <input id="a-present" className="input" type="number" min={0} max={total || undefined} required value={form.present_days} onChange={(e) => set("present_days", e.target.value)} />
        </div>
      </div>
      {total > 0 && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900/75">
          Absent {Math.max(total - present, 0)} · Attendance {percentage(total, present)}%
        </p>
      )}
      <div className="flex justify-end gap-2 border-t border-emerald-900/10 pt-4">
        <button type="button" className="btn-secondary" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy && <Spinner className="h-4 w-4" />}
          {record ? "Save" : "Add week"}
        </button>
      </div>
    </form>
  );
}
