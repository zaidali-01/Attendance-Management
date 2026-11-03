import "server-only";
import postgres from "postgres";
import { hashPassword } from "./password";

const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;

type Sql = ReturnType<typeof postgres>;

const globalForDb = globalThis as unknown as { __sql?: Sql; __schema?: Promise<void> };

function client(): Sql {
  if (!url) {
    throw new Error("DATABASE_URL is not set. Add a Postgres connection string to .env.local (see README).");
  }
  if (!globalForDb.__sql) {
    globalForDb.__sql = postgres(url, {
      max: process.env.VERCEL ? 3 : 10,
      idle_timeout: 20,
      // Required for pooled connections (Neon / PgBouncer in transaction mode).
      prepare: false,
      // "already exists, skipping" notices from CREATE ... IF NOT EXISTS are expected.
      onnotice: () => {},
      // Return DATE columns as plain "YYYY-MM-DD" strings, never JS Dates.
      types: {
        date: {
          to: 1082,
          from: [1082],
          serialize: (x: string) => x,
          parse: (x: string) => x,
        },
      },
    });
  }
  return globalForDb.__sql;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS students (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  class_name    TEXT NOT NULL,
  roll_no       TEXT,
  -- The student's actual monthly fee (the challan always shows the standard challan amount).
  monthly_fee   INT NOT NULL DEFAULT 0,
  admission_form BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS weekly_attendance (
  id           SERIAL PRIMARY KEY,
  student_id   INT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  start_date   DATE NOT NULL,
  end_date     DATE NOT NULL,
  total_days   INT NOT NULL,
  present_days INT NOT NULL
);
CREATE INDEX IF NOT EXISTS weekly_attendance_student ON weekly_attendance (student_id, start_date);

-- Daily attendance marked on the calendar (weekly totals are worked out from these).
CREATE TABLE IF NOT EXISTS daily_attendance (
  student_id INT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  day        DATE NOT NULL,
  status     TEXT NOT NULL CHECK (status IN ('present', 'late', 'absent', 'holiday')),
  PRIMARY KEY (student_id, day)
);
CREATE INDEX IF NOT EXISTS daily_attendance_day ON daily_attendance (day);

-- One row per paid month per student.
CREATE TABLE IF NOT EXISTS fee_payments (
  id         SERIAL PRIMARY KEY,
  student_id INT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  year       INT NOT NULL,
  month      INT NOT NULL CHECK (month BETWEEN 1 AND 12),
  amount     INT NOT NULL,
  method     TEXT NOT NULL CHECK (method IN ('online', 'cash')),
  paid_on    DATE NOT NULL,
  note       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, year, month)
);
CREATE INDEX IF NOT EXISTS fee_payments_month ON fee_payments (year, month);

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  username      TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'admin',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id    INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL
);
`;

/**
 * The first version of the app (Prisma) kept students in "Student" and "WeeklyAttendance".
 * Copy them into the new tables once, keeping their ids. The old tables are left untouched.
 */
async function importLegacyData(sql: Sql) {
  const [{ done }] = await sql<{ done: boolean }[]>`select exists(select 1 from settings where key = 'legacyImported') as done`;
  if (done) return;
  const [{ legacy }] = await sql<{ legacy: boolean }[]>`select to_regclass('public."Student"') is not null as legacy`;
  if (legacy) {
    await sql.begin(async (tx) => {
      await tx`
        insert into students (id, name, class_name, roll_no, created_at)
        select id, name, "className", "rollNo", "createdAt" from "Student"
        on conflict (id) do nothing`;
      await tx`
        insert into weekly_attendance (id, student_id, start_date, end_date, total_days, present_days)
        select id, "studentId", "startDate"::date, "endDate"::date, "totalDays", "presentDays" from "WeeklyAttendance"
        on conflict (id) do nothing`;
      await tx`select setval(pg_get_serial_sequence('students', 'id'), coalesce((select max(id) from students), 0) + 1, false)`;
      await tx`select setval(pg_get_serial_sequence('weekly_attendance', 'id'), coalesce((select max(id) from weekly_attendance), 0) + 1, false)`;
    });
  }
  await sql`insert into settings (key, value) values ('legacyImported', 'true') on conflict (key) do nothing`;
}

/**
 * The first admin. Reuses the login from the old version (ADMIN_USERNAME / ADMIN_PASSWORD_HASH)
 * so the password stays the same; otherwise admin / admin123.
 */
function initialAdmin() {
  const username = process.env.ADMIN_USERNAME?.trim();
  const hash = process.env.ADMIN_PASSWORD_HASH?.replace(/\\\$/g, "$").trim();
  if (username && hash?.startsWith("$2")) return { username, passwordHash: hash };
  return { username: "admin", passwordHash: hashPassword("admin123") };
}

async function ensureSchema(sql: Sql) {
  try {
    await sql.unsafe(SCHEMA);
  } catch (err) {
    // Two cold starts racing on CREATE TABLE can collide; the second attempt sees the tables.
    await new Promise((r) => setTimeout(r, 300));
    await sql.unsafe(SCHEMA).catch(() => {
      throw err;
    });
  }

  await importLegacyData(sql);

  const [{ count }] = await sql<{ count: number }[]>`select count(*)::int as count from users`;
  if (count === 0) {
    const admin = initialAdmin();
    await sql`
      insert into users (username, password_hash, role)
      values (${admin.username}, ${admin.passwordHash}, 'admin')
      on conflict (username) do nothing`;
  }
}

/** Returns a ready-to-use SQL client, creating tables on first use. */
export async function getDb(): Promise<Sql> {
  const sql = client();
  if (!globalForDb.__schema) {
    globalForDb.__schema = ensureSchema(sql).catch((e) => {
      globalForDb.__schema = undefined;
      throw e;
    });
  }
  await globalForDb.__schema;
  return sql;
}
