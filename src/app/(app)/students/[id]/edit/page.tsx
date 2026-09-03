import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import StudentForm from "@/components/StudentForm";
import { updateStudent } from "@/lib/actions";

export default async function EditStudentPage({
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
    <StudentForm
      action={updateStudent.bind(null, studentId)}
      student={student}
      error={error}
      cancelHref="/students"
    />
  );
}
