import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { CLASS_CHOICES } from "@/lib/constants";
import { deleteStudent } from "@/lib/actions";
import ConfirmDeleteForm from "@/components/ConfirmDeleteForm";

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ className?: string }>;
}) {
  const { className } = await searchParams;

  const students = await prisma.student.findMany({
    where: className ? { className } : undefined,
    orderBy: [{ className: "asc" }, { name: "asc" }],
  });

  return (
    <div className="card">
      <h1 className="text-2xl font-bold mb-5" style={{ color: "var(--brand-green-darker)" }}>
        Students
      </h1>

      <form method="get" className="flex items-end gap-3 mb-5">
        <div className="form-field" style={{ maxWidth: 220 }}>
          <label htmlFor="className">Filter by class</label>
          <select id="className" name="className" defaultValue={className || ""}>
            <option value="">All classes</option>
            {CLASS_CHOICES.map((c) => (
              <option key={c} value={c}>
                Class {c}
              </option>
            ))}
          </select>
        </div>
        <button className="btn btn-secondary" type="submit">
          Apply
        </button>
      </form>

      <Link className="btn" href="/students/new">
        + Add Student
      </Link>

      <table className="data-table mt-5">
        <thead>
          <tr>
            <th>Name</th>
            <th>Class</th>
            <th>Roll No.</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {students.length === 0 && (
            <tr>
              <td colSpan={4} className="empty-state">
                No students yet.
              </td>
            </tr>
          )}
          {students.map((s) => (
            <tr key={s.id}>
              <td>{s.name}</td>
              <td>
                <span className="tag">Class {s.className}</span>
              </td>
              <td>{s.rollNo || "-"}</td>
              <td>
                <Link className="row-link" href={`/students/${s.id}/attendance`}>
                  Attendance
                </Link>
                <span className="mx-2 text-[color:var(--border)]">&middot;</span>
                <Link className="row-link" href={`/students/${s.id}/edit`}>
                  Edit
                </Link>
                <span className="mx-2 text-[color:var(--border)]">&middot;</span>
                <ConfirmDeleteForm
                  action={deleteStudent.bind(null, s.id)}
                  confirmMessage="Delete this student and all their attendance records?"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
