import { handle, HttpError, readJson } from "@/lib/api";
import { startSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { hashPassword, needsRehash, verifyPassword } from "@/lib/password";
import type { SessionUser } from "@/lib/types";

export const POST = handle(async (req: Request) => {
  const { username, password } = await readJson<{ username?: string; password?: string }>(req);
  const name = username?.trim().toLowerCase();
  if (!name || !password) throw new HttpError(400, "Enter your username and password");

  const sql = await getDb();
  const [user] = await sql<(SessionUser & { password_hash: string })[]>`
    select id, username, role, password_hash from users where lower(username) = ${name}`;
  // Same message for unknown user and wrong password, so usernames can't be probed.
  if (!user || !verifyPassword(password, user.password_hash)) {
    await new Promise((r) => setTimeout(r, 400));
    throw new HttpError(401, "Incorrect username or password");
  }
  // Passwords carried over from the first version are re-saved in the current format.
  if (needsRehash(user.password_hash)) {
    await sql`update users set password_hash = ${hashPassword(password)} where id = ${user.id}`;
  }

  await startSession(user.id);
  return Response.json({ id: user.id, username: user.username, role: user.role });
});
