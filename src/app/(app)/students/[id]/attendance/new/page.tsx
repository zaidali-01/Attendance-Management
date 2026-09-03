import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import AttendanceForm from "@/components/AttendanceForm";
import { createAttendance } from "@/lib/actions";

export default async function NewAttendancePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const studentId = Number(id);

  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student) notFound();

  return (
    <AttendanceForm
      action={createAttendance.bind(null, studentId)}
      studentName={student.name}
      error={error}
      cancelHref={`/students/${studentId}/attendance`}
    />
  );
}
