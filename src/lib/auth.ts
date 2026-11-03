import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { HttpError } from "./api";
import { getDb } from "./db";
import { SESSION_COOKIE, type SessionUser } from "./types";

const SESSION_DAYS = 30;

const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");

/** Creates a session for the user and sets the cookie. Only the token's hash is stored. */
export async function startSession(userId: number): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const sql = await getDb();
  await sql`
    insert into sessions (token_hash, user_id, expires_at)
    values (${tokenHash(token)}, ${userId}, now() + ${`${SESSION_DAYS} days`}::interval)`;
  // Opportunistic cleanup of expired sessions.
  await sql`delete from sessions where expires_at < now()`;
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function endSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    const sql = await getDb();
    await sql`delete from sessions where token_hash = ${tokenHash(token)}`;
  }
  jar.delete(SESSION_COOKIE);
}

/** The signed-in user, or null. */
export async function currentUser(): Promise<(SessionUser & { tokenHash: string }) | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const sql = await getDb();
  const h = tokenHash(token);
  const [user] = await sql<SessionUser[]>`
    select u.id, u.username, u.role
    from sessions s join users u on u.id = s.user_id
    where s.token_hash = ${h} and s.expires_at > now()`;
  return user ? { ...user, tokenHash: h } : null;
}

/** Throws 401 when signed out. */
export async function requireUser() {
  const user = await currentUser();
  if (!user) throw new HttpError(401, "Please sign in");
  return user;
}
