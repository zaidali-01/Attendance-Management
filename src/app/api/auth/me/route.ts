import { handle } from "@/lib/api";
import { currentUser } from "@/lib/auth";

/** The signed-in user, or { user: null } (never 401, so the login page can call it). */
export const GET = handle(async () => {
  const user = await currentUser();
  return Response.json({ user: user ? { id: user.id, username: user.username, role: user.role } : null });
});
