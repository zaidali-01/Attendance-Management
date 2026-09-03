import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { ReportDocument } from "@/lib/ReportDocument";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const studentId = Number(searchParams.get("studentId"));
  const fromDateRaw = searchParams.get("fromDate");
  const toDateRaw = searchParams.get("toDate");

  if (!studentId) {
    return NextResponse.json({ error: "studentId is required" }, { status: 400 });
  }

  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  const fromDate = fromDateRaw ? new Date(`${fromDateRaw}T00:00:00.000Z`) : null;
  const toDate = toDateRaw ? new Date(`${toDateRaw}T00:00:00.000Z`) : null;

  const records = await prisma.weeklyAttendance.findMany({
    where: {
      studentId,
      ...(fromDate ? { startDate: { gte: fromDate } } : {}),
      ...(toDate ? { endDate: { lte: toDate } } : {}),
    },
    orderBy: { startDate: "asc" },
  });

  const totals = {
    totalDays: records.reduce((sum, r) => sum + r.totalDays, 0),
    presentDays: records.reduce((sum, r) => sum + r.presentDays, 0),
  };
  const absentDays = totals.totalDays - totals.presentDays;
  const percentage = totals.totalDays ? Math.round((totals.presentDays / totals.totalDays) * 1000) / 10 : 0;

  const pdfBuffer = await renderToBuffer(
    <ReportDocument
      student={student}
      records={records}
      fromDate={fromDate}
      toDate={toDate}
      totals={{ ...totals, absentDays, percentage }}
    />
  );

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="attendance_report_${student.name.replace(/\s+/g, "_")}.pdf"`,
    },
  });
}
