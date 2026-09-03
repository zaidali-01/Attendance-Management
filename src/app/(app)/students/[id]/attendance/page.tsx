import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { absentDays, percentage, formatDate } from "@/lib/attendance";
import { deleteAttendance } from "@/lib/actions";
import ConfirmDeleteForm from "@/components/ConfirmDeleteForm";

export default async function AttendanceListPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const studentId = Number(id);

  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student) notFound();

  const records = await prisma.weeklyAttendance.findMany({
    where: { studentId },
    orderBy: { startDate: "desc" },
  });

  return (
    <div className="card">
      <h1 className="text-2xl font-bold mb-5" style={{ color: "var(--brand-green-darker)" }}>
        {student.name} <span className="tag ml-2">Class {student.className}</span>
      </h1>

      <div className="flex gap-3 mb-5">
        <Link className="btn" href={`/students/${studentId}/attendance/new`}>
          + Add Weekly Record
        </Link>
        <Link className="btn btn-secondary" href="/students">
          Back to Students
        </Link>
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th>Start</th>
            <th>End</th>
            <th>Total Days</th>
            <th>Present</th>
            <th>Absent</th>
            <th>%</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {records.length === 0 && (
            <tr>
              <td colSpan={7} className="empty-state">
                No attendance records yet.
              </td>
            </tr>
          )}
          {records.map((r) => (
            <tr key={r.id}>
              <td>{formatDate(r.startDate)}</td>
              <td>{formatDate(r.endDate)}</td>
              <td>{r.totalDays}</td>
              <td>{r.presentDays}</td>
              <td>{absentDays(r.totalDays, r.presentDays)}</td>
              <td>{percentage(r.totalDays, r.presentDays)}%</td>
              <td>
                <Link className="row-link" href={`/students/${studentId}/attendance/${r.id}/edit`}>
                  Edit
                </Link>
                <span className="mx-2 text-[color:var(--border)]">&middot;</span>
                <ConfirmDeleteForm
                  action={deleteAttendance.bind(null, studentId, r.id)}
                  confirmMessage="Delete this weekly record?"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
