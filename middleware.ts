import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, isValidSession } from "@/lib/auth";

// Protect every route except /login and static assets. The matcher below already
// excludes _next and common asset files; here we also let /login through.
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

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
    // Match all paths except Next internals, the API auth flow is handled via
    // server actions, and static files (with a dot in the last segment).
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
