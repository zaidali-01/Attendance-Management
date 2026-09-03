"use server";

import { prisma } from "@/lib/prisma";
import { CLASS_CHOICES } from "@/lib/constants";
import { redirect } from "next/navigation";

function parseDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

export async function createStudent(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  const className = String(formData.get("className") || "");
  const rollNo = String(formData.get("rollNo") || "").trim();

  if (!name || !CLASS_CHOICES.includes(className as (typeof CLASS_CHOICES)[number])) {
    redirect(`/students/new?error=${encodeURIComponent("Please provide a valid name and class.")}`);
  }

  await prisma.student.create({
    data: { name, className, rollNo: rollNo || null },
  });

  redirect("/students");
}

export async function updateStudent(studentId: number, formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  const className = String(formData.get("className") || "");
  const rollNo = String(formData.get("rollNo") || "").trim();

  if (!name || !CLASS_CHOICES.includes(className as (typeof CLASS_CHOICES)[number])) {
    redirect(`/students/${studentId}/edit?error=${encodeURIComponent("Please provide a valid name and class.")}`);
  }

  await prisma.student.update({
    where: { id: studentId },
    data: { name, className, rollNo: rollNo || null },
  });

  redirect("/students");
}

export async function deleteStudent(studentId: number) {
  await prisma.student.delete({ where: { id: studentId } });
  redirect("/students");
}

export async function createAttendance(studentId: number, formData: FormData) {
  const startDateRaw = String(formData.get("startDate") || "");
  const endDateRaw = String(formData.get("endDate") || "");
  const totalDays = Number(formData.get("totalDays"));
  const presentDays = Number(formData.get("presentDays"));

  const error = validateAttendance(startDateRaw, endDateRaw, totalDays, presentDays);
  if (error) {
    redirect(`/students/${studentId}/attendance/new?error=${encodeURIComponent(error)}`);
  }

  await prisma.weeklyAttendance.create({
    data: {
      studentId,
      startDate: parseDateOnly(startDateRaw),
      endDate: parseDateOnly(endDateRaw),
      totalDays,
      presentDays,
    },
  });

  redirect(`/students/${studentId}/attendance`);
}

export async function updateAttendance(studentId: number, recordId: number, formData: FormData) {
  const startDateRaw = String(formData.get("startDate") || "");
  const endDateRaw = String(formData.get("endDate") || "");
  const totalDays = Number(formData.get("totalDays"));
  const presentDays = Number(formData.get("presentDays"));

  const error = validateAttendance(startDateRaw, endDateRaw, totalDays, presentDays);
  if (error) {
    redirect(`/students/${studentId}/attendance/${recordId}/edit?error=${encodeURIComponent(error)}`);
  }

  await prisma.weeklyAttendance.update({
    where: { id: recordId },
    data: {
      startDate: parseDateOnly(startDateRaw),
      endDate: parseDateOnly(endDateRaw),
      totalDays,
      presentDays,
    },
  });

  redirect(`/students/${studentId}/attendance`);
}

export async function deleteAttendance(studentId: number, recordId: number) {
  await prisma.weeklyAttendance.delete({ where: { id: recordId } });
  redirect(`/students/${studentId}/attendance`);
}

function validateAttendance(
  startDateRaw: string,
  endDateRaw: string,
  totalDays: number,
  presentDays: number
): string | null {
  if (!startDateRaw || !endDateRaw || Number.isNaN(totalDays) || Number.isNaN(presentDays)) {
    return "Please enter valid dates and numbers.";
  }
  if (new Date(endDateRaw) < new Date(startDateRaw)) {
    return "End date cannot be before start date.";
  }
  if (totalDays <= 0) {
    return "Total days must be greater than zero.";
  }
  if (presentDays < 0 || presentDays > totalDays) {
    return "Present days must be between 0 and total days.";
  }
  return null;
}
