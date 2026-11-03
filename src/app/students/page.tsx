"use client";

import { Pencil, ReceiptText, Search, Trash2, UserPlus, Users } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { StudentForm } from "@/components/student-form";
import { useToast } from "@/components/toast";
import { Alert, ClassBadge, ConfirmDialog, EmptyState, FeeBadge, FormBadge, Loading, Modal, PageHeader, Segmented } from "@/components/ui";
import { api, errorMessage } from "@/lib/client";
import { currentMonth, dueDate, joinedBy, money, monthKey, MONTHS, todayYmd } from "@/lib/format";
import { CLASSES, DEFAULT_SETTINGS, type Settings, type Student, type StudentWithPayment } from "@/lib/types";

type ClassFilter = "all" | (typeof CLASSES)[number];
type FormFilter = "all" | "submitted" | "pending";

export default function StudentsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <StudentsView />
    </Suspense>
  );
}

function StudentsView() {
  const toast = useToast();
  const router = useRouter();
  const params = useSearchParams();
  const [{ year, month }] = useState(currentMonth);
  const [today] = useState(todayYmd);
  const [students, setStudents] = useState<StudentWithPayment[] | null>(null);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [cls, setCls] = useState<ClassFilter>((CLASSES as readonly string[]).includes(params.get("class") ?? "") ? (params.get("class") as ClassFilter) : "all");
  const [form, setForm] = useState<FormFilter>(params.get("form") === "pending" ? "pending" : "all");
  const [editing, setEditing] = useState<Student | "new" | null>(params.get("add") ? "new" : null);
  const [deleting, setDeleting] = useState<Student | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api<StudentWithPayment[]>(`/api/students?year=${year}&month=${month}`).then(setStudents, (e) => setError(errorMessage(e)));
  }, [year, month]);
  useEffect(load, [load]);
  useEffect(() => {
    api<Settings>("/api/settings").then(setSettings, () => {});
  }, []);

  const overdue = today > dueDate(year, month, settings.dueDay);
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: students?.length ?? 0 };
    for (const s of students ?? []) c[s.class_name] = (c[s.class_name] ?? 0) + 1;
    return c;
  }, [students]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (students ?? []).filter(
      (s) =>
        (cls === "all" || s.class_name === cls) &&
        (form === "all" || (form === "submitted") === s.admission_form) &&
        (!q || s.name.toLowerCase().includes(q) || (s.roll_no ?? "").toLowerCase().includes(q)),
    );
  }, [students, query, cls, form]);

  function closeForm() {
    setEditing(null);
    if (params.get("add")) router.replace("/students");
  }

  async function toggleForm(s: StudentWithPayment) {
    const next = !s.admission_form;
    setStudents((list) => list?.map((x) => (x.id === s.id ? { ...x, admission_form: next } : x)) ?? null);
    try {
      await api(`/api/students/${s.id}`, { method: "PUT", json: { admission_form: next } });
      toast("success", `${s.name}: admission form ${next ? "submitted" : "marked as pending"}`);
    } catch (e) {
      setStudents((list) => list?.map((x) => (x.id === s.id ? { ...x, admission_form: !next } : x)) ?? null);
      toast("error", errorMessage(e));
    }
  }

  async function remove() {
    if (!deleting) return;
    setBusy(true);
    try {
      await api(`/api/students/${deleting.id}`, { method: "DELETE" });
      toast("success", `${deleting.name} deleted`);
      setDeleting(null);
      load();
    } catch (e) {
      toast("error", errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const challanHref = (s: Student) => `/challans?student=${s.id}&month=${monthKey(year, month)}`;

  return (
    <div>
      <PageHeader
        title="Students"
        description={`Fee status is for ${MONTHS[month - 1]} ${year}. Click a form badge to switch it between Submitted and Pending.`}
        actions={
          <button className="btn-primary" onClick={() => setEditing("new")}>
            <UserPlus className="h-4 w-4" /> Add student
          </button>
        }
      />

      <div className="card mb-4 space-y-3 p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-emerald-900/40" />
          <input className="input pl-9" placeholder="Search by name or roll #" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Segmented
            size="sm"
            value={cls}
            onChange={setCls}
            options={[
              { value: "all", label: `All (${counts.all})` },
              ...CLASSES.map((c) => ({ value: c, label: `${c === "other" ? "Other" : `Class ${c}`} (${counts[c] ?? 0})` })),
            ]}
          />
          <Segmented
            size="sm"
            value={form}
            onChange={setForm}
            options={[
              { value: "all", label: "Any form" },
              { value: "submitted", label: "Form submitted" },
              { value: "pending", label: "Form pending" },
            ]}
          />
        </div>
      </div>

      {error && <Alert kind="error">{error}</Alert>}
      {!students ? (
        !error && <Loading />
      ) : (
        <div className="card overflow-hidden">
          {shown.length === 0 ? (
            <EmptyState icon={<Users className="h-10 w-10" />} title={students.length ? "No students match" : "No students yet"}>
              {students.length ? "Try another search or filter." : "Add your first student to get started."}
            </EmptyState>
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-sm">
                  <thead className="bg-emerald-50/70 text-left text-xs font-semibold tracking-wide text-emerald-900/60 uppercase">
                    <tr>
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Class</th>
                      <th className="px-4 py-3">Roll #</th>
                      <th className="px-4 py-3 text-right">Monthly fee</th>
                      <th className="px-4 py-3">Admission form</th>
                      <th className="px-4 py-3">{MONTHS[month - 1].slice(0, 3)} fee</th>
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
                        </td>
                        <td className="px-4 py-3">
                          <ClassBadge className={s.class_name} short />
                        </td>
                        <td className="px-4 py-3 tabular-nums">{s.roll_no ?? "—"}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{s.monthly_fee ? money(s.monthly_fee) : <span className="text-amber-700">Not set</span>}</td>
                        <td className="px-4 py-3">
                          <button onClick={() => toggleForm(s)} title="Click to change">
                            <FormBadge submitted={s.admission_form} />
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <FeeBadge payment={s.payment} overdue={overdue && joinedBy(s.created_at, year, month)} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-0.5">
                            <Link href={challanHref(s)} className="btn-ghost py-1.5" title="Fee challan">
                              <ReceiptText className="h-4 w-4" />
                            </Link>
                            <button className="btn-ghost py-1.5" title="Edit" onClick={() => setEditing(s)}>
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button className="btn-ghost py-1.5 text-red-600 hover:bg-red-50" title="Delete" onClick={() => setDeleting(s)}>
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
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
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <button onClick={() => toggleForm(s)} className="flex items-center gap-1.5 text-xs text-emerald-900/60">
                        Form <FormBadge submitted={s.admission_form} />
                      </button>
                      <div className="flex gap-0.5">
                        <Link href={challanHref(s)} className="btn-ghost py-1.5" aria-label="Fee challan">
                          <ReceiptText className="h-4 w-4" />
                        </Link>
                        <button className="btn-ghost py-1.5" aria-label="Edit" onClick={() => setEditing(s)}>
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button className="btn-ghost py-1.5 text-red-600" aria-label="Delete" onClick={() => setDeleting(s)}>
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="border-t border-emerald-900/10 px-4 py-2.5 text-xs text-emerald-900/50">
                Showing {shown.length} of {students.length} students
              </div>
            </>
          )}
        </div>
      )}

      <Modal open={editing !== null} title={editing === "new" ? "Add student" : "Edit student"} onClose={closeForm}>
        {editing !== null && (
          <StudentForm
            student={editing === "new" ? null : editing}
            challanFee={settings.challanFee}
            onCancel={closeForm}
            onSaved={(s) => {
              toast("success", editing === "new" ? `${s.name} added` : `${s.name} saved`);
              closeForm();
              load();
            }}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        title="Delete student?"
        message={
          <>
            <strong>{deleting?.name}</strong> and all of their fee payments and attendance records will be deleted. This cannot be undone.
          </>
        }
        busy={busy}
        onConfirm={remove}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
