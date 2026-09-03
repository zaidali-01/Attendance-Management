import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import AttendanceForm from "@/components/AttendanceForm";
import { updateAttendance } from "@/lib/actions";

export default async function EditAttendancePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; recordId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id, recordId } = await params;
  const { error } = await searchParams;
  const studentId = Number(id);
  const attendanceId = Number(recordId);

  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student) notFound();

  const record = await prisma.weeklyAttendance.findFirst({
    where: { id: attendanceId, studentId },
  });
  if (!record) notFound();

  return (
    <AttendanceForm
      action={updateAttendance.bind(null, studentId, attendanceId)}
      studentName={student.name}
      record={record}
      error={error}
      cancelHref={`/students/${studentId}/attendance`}
    />
  );
}
