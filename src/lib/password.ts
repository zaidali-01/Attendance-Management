import "server-only";
import bcrypt from "bcryptjs";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

/** Checks a password. Also accepts bcrypt hashes from the first version of the app. */
export function verifyPassword(password: string, stored: string): boolean {
  if (password.length > MAX_PASSWORD_LENGTH) return false;
  if (stored.startsWith("$2")) return bcrypt.compareSync(password, stored);
  const [scheme, salt, hash] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "hex");
  const actual = scryptSync(password, salt, expected.length);
  return timingSafeEqual(expected, actual);
}

/** True for hashes that should be replaced with a scrypt hash after a successful sign-in. */
export const needsRehash = (stored: string) => !stored.startsWith("scrypt$");

export const MIN_PASSWORD_LENGTH = 6;
/** Very long passwords are refused so hashing them can't be used to slow the server down. */
export const MAX_PASSWORD_LENGTH = 200;

let dummy: string | undefined;
/** Checked when the username doesn't exist, so a wrong username takes as long as a wrong password. */
export function dummyHash(): string {
  return (dummy ??= hashPassword("not-a-real-password"));
}
