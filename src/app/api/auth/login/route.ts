import { handle, HttpError, readJson } from "@/lib/api";
import { startSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { dummyHash, hashPassword, MAX_PASSWORD_LENGTH, needsRehash, verifyPassword } from "@/lib/password";
import { clearLoginFailures, isLoginBlocked, LOGIN_WINDOW_MINUTES, recordLoginFailure } from "@/lib/rate-limit";
import type { SessionUser } from "@/lib/types";

export const POST = handle(async (req: Request) => {
  const { username, password } = await readJson<{ username?: unknown; password?: unknown }>(req);
  const name = typeof username === "string" ? username.trim().toLowerCase().slice(0, 100) : "";
  if (!name || typeof password !== "string" || !password) throw new HttpError(400, "Enter your username and password");
  if (password.length > MAX_PASSWORD_LENGTH) throw new HttpError(401, "Incorrect username or password");

  if (await isLoginBlocked(name)) {
    throw new HttpError(429, `Too many wrong attempts. Please wait ${LOGIN_WINDOW_MINUTES} minutes and try again.`);
  }

  const sql = await getDb();
  const [user] = await sql<(SessionUser & { password_hash: string })[]>`
    select id, username, role, password_hash from users where lower(username) = ${name}`;
  // Always check a hash, so unknown usernames take as long as wrong passwords.
  const ok = verifyPassword(password, user?.password_hash ?? dummyHash()) && !!user;
  // Same message for unknown user and wrong password, so usernames can't be probed.
  if (!ok) {
    await recordLoginFailure(name);
    await new Promise((r) => setTimeout(r, 400));
    throw new HttpError(401, "Incorrect username or password");
  }
  await clearLoginFailures(name);
  // Passwords carried over from the first version are re-saved in the current format.
  if (needsRehash(user.password_hash)) {
    await sql`update users set password_hash = ${hashPassword(password)} where id = ${user.id}`;
  }

  await startSession(user.id);
  return Response.json({ id: user.id, username: user.username, role: user.role });
});
