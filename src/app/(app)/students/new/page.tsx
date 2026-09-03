import StudentForm from "@/components/StudentForm";
import { createStudent } from "@/lib/actions";

export default async function NewStudentPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return <StudentForm action={createStudent} error={error} cancelHref="/students" />;
}
