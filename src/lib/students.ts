import "server-only";
import { HttpError } from "./api";
import { CLASSES, type ClassName } from "./types";

export const STUDENT_COLUMNS = "id, name, class_name, roll_no, monthly_fee, admission_form, created_at";

export type StudentInput = {
  name: string;
  class_name: ClassName;
  roll_no: string | null;
  monthly_fee: number;
  admission_form: boolean;
};

/** Validates a full student (create) or only the given fields (partial update). */
export function parseStudent(body: Record<string, unknown>, partial = false): Partial<StudentInput> {
  const out: Partial<StudentInput> = {};
  const has = (k: string) => body[k] !== undefined;

  if (!partial || has("name")) {
    const name = String(body.name ?? "").trim();
    if (!name) throw new HttpError(400, "Name is required");
    if (name.length > 120) throw new HttpError(400, "Name is too long");
    out.name = name;
  }
  if (!partial || has("class_name")) {
    const c = String(body.class_name ?? "");
    if (!CLASSES.includes(c as ClassName)) throw new HttpError(400, "Choose a class: 9, 10, 11, 12 or Other");
    out.class_name = c as ClassName;
  }
  if (!partial || has("roll_no")) {
    const roll = String(body.roll_no ?? "").trim();
    if (roll.length > 30) throw new HttpError(400, "Roll number is too long");
    out.roll_no = roll || null;
  }
  if (!partial || has("monthly_fee")) {
    const fee = Number(body.monthly_fee);
    if (body.monthly_fee === "" || body.monthly_fee == null || !Number.isFinite(fee) || fee < 0 || fee > 10_000_000) {
      throw new HttpError(400, "Enter the student's monthly fee");
    }
    out.monthly_fee = Math.round(fee);
  }
  if (!partial || has("admission_form")) out.admission_form = Boolean(body.admission_form);
  return out;
}
