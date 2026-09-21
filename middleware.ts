import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, isValidSession } from "@/lib/auth";

// Protect every route except /login, the mobile API, and static assets. The
// matcher below already excludes _next, /api/v1, and common asset files;
// here we also let /login through.
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Defense in depth: app/api/v1/* routes authenticate themselves via
  // requireDevice() (lib/api/auth.ts, a Bearer token, not this cookie), and
  // the matcher below already excludes them from ever reaching this
  // function — but if that matcher is ever loosened, redirecting a JSON API
  // caller to an HTML /login page would be a confusing way to fail.
  if (pathname.startsWith("/api/v1")) {
    return NextResponse.next();
  }

  const isLogin = pathname === "/login";
  const cookie = req.cookies.get(SESSION_COOKIE)?.value;
  const authed = await isValidSession(cookie);

  if (!authed && !isLogin) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Already logged in but visiting /login -> send to dashboard.
  if (authed && isLogin) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all paths except Next internals, the mobile API (app/api/v1/*,
    // which authenticates itself — see the early return above), and static
    // files (with a dot in the last segment).
    "/((?!_next/static|_next/image|favicon.ico|api/v1|.*\\..*).*)",
  ],
};
