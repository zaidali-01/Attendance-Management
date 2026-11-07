import "server-only";
import { headers } from "next/headers";
import { getDb } from "./db";

const WINDOW_MINUTES = 15;
/**
 * Wrong passwords allowed within the window: per username from one IP address (so a stranger
 * elsewhere can't lock the real user out), and per IP address across all usernames.
 */
const MAX_PER_USER = 8;
const MAX_PER_IP = 30;

async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

async function keys(username: string) {
  const ip = await clientIp();
  return { user: `user:${username}|${ip}`, ip: `ip:${ip}` };
}

/** True when this username or IP has had too many wrong passwords recently. */
export async function isLoginBlocked(username: string): Promise<boolean> {
  const k = await keys(username);
  const sql = await getDb();
  const rows = await sql<{ key: string; n: number }[]>`
    select key, count(*)::int as n from login_failures
    where key in (${k.user}, ${k.ip}) and at > now() - ${`${WINDOW_MINUTES} minutes`}::interval
    group by key`;
  const count = (key: string) => rows.find((r) => r.key === key)?.n ?? 0;
  return count(k.user) >= MAX_PER_USER || count(k.ip) >= MAX_PER_IP;
}

export async function recordLoginFailure(username: string): Promise<void> {
  const k = await keys(username);
  const sql = await getDb();
  await sql`insert into login_failures (key) values (${k.user}), (${k.ip})`;
  // Opportunistic cleanup of old rows.
  await sql`delete from login_failures where at < now() - interval '1 day'`;
}

export async function clearLoginFailures(username: string): Promise<void> {
  const k = await keys(username);
  const sql = await getDb();
  await sql`delete from login_failures where key = ${k.user}`;
}

export const LOGIN_WINDOW_MINUTES = WINDOW_MINUTES;
