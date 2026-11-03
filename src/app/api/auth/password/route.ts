import { handle, HttpError, readJson } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { hashPassword, MIN_PASSWORD_LENGTH, verifyPassword } from "@/lib/password";

/** Change your own password. Signs out your other sessions. */
export const PUT = handle(async (req: Request) => {
  const user = await requireUser();
  const { currentPassword, newPassword } = await readJson<{ currentPassword?: string; newPassword?: string }>(req);
  if (!currentPassword || !newPassword) throw new HttpError(400, "Enter your current and new password");
  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    throw new HttpError(400, `New password must be at least ${MIN_PASSWORD_LENGTH} characters`);
  }

  const sql = await getDb();
  const [row] = await sql<{ password_hash: string }[]>`select password_hash from users where id = ${user.id}`;
  if (!row || !verifyPassword(currentPassword, row.password_hash)) throw new HttpError(400, "Current password is incorrect");

  await sql`update users set password_hash = ${hashPassword(newPassword)} where id = ${user.id}`;
  await sql`delete from sessions where user_id = ${user.id} and token_hash <> ${user.tokenHash}`;
  return Response.json({ ok: true });
});
