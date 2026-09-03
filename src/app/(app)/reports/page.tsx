import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const students = await prisma.student.findMany({
    orderBy: [{ className: "asc" }, { name: "asc" }],
  });

  return (
    <div className="card">
      <h1 className="text-2xl font-bold mb-5" style={{ color: "var(--brand-green-darker)" }}>
        Generate Attendance Report
      </h1>

      <form action="/api/reports/pdf" method="get" target="_blank" className="space-y-4">
        <div className="form-field">
          <label htmlFor="studentId">Student</label>
          <select id="studentId" name="studentId" required defaultValue="">
            <option value="" disabled>
              Select student
            </option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} — Class {s.className}
              </option>
            ))}
          </select>
        </div>

        <div className="form-field">
          <label htmlFor="fromDate">From Date (optional)</label>
          <input id="fromDate" name="fromDate" type="date" />
        </div>

        <div className="form-field">
          <label htmlFor="toDate">To Date (optional)</label>
          <input id="toDate" name="toDate" type="date" />
        </div>

        <div className="pt-2">
          <button className="btn" type="submit">
            Generate PDF Report
          </button>
        </div>
      </form>
    </div>
  );
}
