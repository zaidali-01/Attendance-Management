# Al-Ismat Academy · Student Portal

Students, monthly fees, fee challans and weekly attendance for Al-Ismat Academy.
Next.js (App Router) + Postgres, deployed on Vercel. Same stack as the Employee Attendance Portal.

## Features
- **Home**: students per class, fees paid / unpaid for the month, amount collected (online vs cash), admission forms pending, unpaid list and recent payments.
- **Students**: add / edit / delete with name, class (9, 10, 11, 12, Other), roll #, monthly fee and whether the admission form is submitted. Search and filter by class or form status. Click a form badge to switch it.
- **Student page**: two tabs. *Monthly fees*: the 12 months with paid / unpaid / overdue; click a month to mark it paid (Online or Cash, amount, date, note) or undo it. *Attendance*: the student's calendar and weekly totals.
- **Fees**: one month for everyone: mark paid / edit / undo, totals collected and outstanding, filters.
- **Challans**: pick a student and a month; name, roll #, class are filled in automatically. Shows today's date and the last date to pay (both editable). Print gives two copies on one A4 page; "Image" downloads one copy (for WhatsApp). "Whole class" prints every student of a class, one page each.
  - The fee on every challan is the standard challan fee (**Rs 13,000** by default), whatever the student's own fee is. The student's own fee is used when marking the fee as paid.
  - The payment QR is the academy's Raast QR (ALISMAT INSTITUTE), drawn sharp from its code.
- **Attendance**: choose a class, click a day on the calendar and mark each student Present, Late, Absent or Holiday ("All present", "Holiday for class" and "Clear day" do the whole class at once). The calendar shows how many are marked each day. "Weekly view" shows the week Monday–Sunday with totals per student. A student's own page has their calendar and weekly totals too.
- **Attendance report**: weekly totals for one student over a date range (this month, last month, last 3 months, this year or custom); print or save as an image. % = (present + late) ÷ days classes were held; holidays don't count.
- **Settings**: challan fee, last day to pay, late fine, "no classes after the …" day and the WhatsApp number.

## Local setup
```bash
npm install
cp .env.example .env.local   # set DATABASE_URL
npm run dev
```
Tables are created automatically on first use. Students and attendance from the first (Prisma) version — the `"Student"` and `"WeeklyAttendance"` tables — are copied over once, keeping their ids; the old tables are left untouched.

The first login reuses `ADMIN_USERNAME` / `ADMIN_PASSWORD_HASH` from the first version, so the password stays the same; otherwise it is **admin / admin123** — change it under the user menu → Change password.

## Deploy
Push to GitHub; Vercel builds with `next build`. Only `DATABASE_URL` is required (`NEXTAUTH_*` are no longer used).
