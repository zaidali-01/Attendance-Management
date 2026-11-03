// Types and constants shared by the server and the browser.

export const SESSION_COOKIE = "aisp_session";

export interface SessionUser {
  id: number;
  username: string;
  role: string;
}

export const CLASSES = ["9", "10", "11", "12", "other"] as const;
export type ClassName = (typeof CLASSES)[number];

export function classLabel(c: string): string {
  return c === "other" ? "Other" : `Class ${c}`;
}

/** "9" -> "9th", for places that already say "Class". */
export function classShort(c: string): string {
  return c === "other" ? "Other" : `${c}th`;
}

export const DAY_STATUSES = ["present", "late", "absent", "holiday"] as const;
export type DayStatus = (typeof DAY_STATUSES)[number];
export const STATUS_LABEL: Record<DayStatus, string> = { present: "Present", late: "Late", absent: "Absent", holiday: "Holiday" };

/** One student's mark for one day. */
export interface DayMark {
  student_id: number;
  day: string; // YYYY-MM-DD
  status: DayStatus;
}

export const PAYMENT_METHODS = ["online", "cash"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export const METHOD_LABEL: Record<PaymentMethod, string> = { online: "Online", cash: "Cash" };

export interface Payment {
  id: number;
  student_id: number;
  year: number;
  month: number; // 1–12
  amount: number;
  method: PaymentMethod;
  paid_on: string; // YYYY-MM-DD
  note: string | null;
}

export interface Student {
  id: number;
  name: string;
  class_name: ClassName;
  roll_no: string | null;
  monthly_fee: number;
  admission_form: boolean;
  created_at: string;
}

/** A student with the payment for the month that was asked for (null = unpaid). */
export interface StudentWithPayment extends Student {
  payment: Payment | null;
}

export interface WeeklyRecord {
  id: number;
  student_id: number;
  start_date: string;
  end_date: string;
  total_days: number;
  present_days: number;
}

export interface StudentDetail extends Student {
  payments: Payment[];
  attendance: WeeklyRecord[];
}

export interface Settings {
  /** The fee printed on every challan, whatever the student's own fee is. */
  challanFee: number;
  /** Last day of the month to pay (shown on the challan). */
  dueDay: number;
  lateFine: number;
  /** Students without fee cannot attend classes after this day of the month. */
  noClassAfterDay: number;
  contactNumber: string;
}

export const DEFAULT_SETTINGS: Settings = {
  challanFee: 13000,
  dueDay: 5,
  lateFine: 500,
  noClassAfterDay: 6,
  contactNumber: "0336-4447628",
};

export interface DashboardResponse {
  year: number;
  month: number;
  totalStudents: number;
  byClass: Record<string, number>;
  paidCount: number;
  unpaidCount: number;
  collected: number;
  expected: number;
  byMethod: Record<PaymentMethod, number>;
  formsPending: number;
  feeNotSet: number;
  unpaid: Pick<Student, "id" | "name" | "class_name" | "roll_no" | "monthly_fee">[];
  recentPayments: (Payment & { name: string; class_name: ClassName })[];
  /** Attendance marked for ?today= (the browser's date). */
  today: { day: string; present: number; late: number; absent: number; holiday: number; marked: number } | null;
}
