import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/types";

/** True when there is no Origin header (same-site navigation, curl) or it matches this site's host. */
function sameHost(origin: string | null, host: string | null): boolean {
  if (!origin) return true;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/**
 * Fast gate: anyone without a session cookie is sent to the login page.
 * The session itself is verified by every API route (see lib/auth.ts).
 */
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Requests that change data must come from this site's own pages (blocks cross-site request forgery).
  if (pathname.startsWith("/api/") && !["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
    if (req.headers.get("sec-fetch-site") === "cross-site" || !sameHost(req.headers.get("origin"), host)) {
      return NextResponse.json({ error: "Request blocked" }, { status: 403 });
    }
  }

  if (pathname === "/login" || pathname.startsWith("/api/auth/")) return NextResponse.next();
  if (req.cookies.has(SESSION_COOKIE)) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Please sign in" }, { status: 401 });
  }
  const url = new URL("/login", req.url);
  if (pathname !== "/") url.searchParams.set("next", pathname + req.nextUrl.search);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg).*)"],
};
