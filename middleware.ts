import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, isValidSession } from "@/lib/auth";

// Protect every route except /login, the mobile API, and static assets. The
// matcher below already excludes _next, /api/v1, and common asset files;
// here we also let /login through.
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // app/api/v1/* routes authenticate themselves via requireDevice()
  // (lib/api/auth.ts, a Bearer token, not this cookie) — never redirect a
  // JSON API caller to an HTML /login page.
  if (pathname.startsWith("/api/v1")) {
    // Dev-only CORS preflight shortcut for 01_untungin_mobile's Expo *web*
    // preview (a different origin, localhost:8081, from this app's
    // localhost:3000 — see next.config.mjs's headers() for the matching
    // Access-Control-Allow-Origin on the real response). A route handler
    // with no exported OPTIONS would otherwise 405 here, and a preflight
    // must get a 2xx to succeed regardless of what headers a 405 carries.
    // Never reachable in production: NODE_ENV is "production" for both
    // `next build`/`next start` and the Vercel deployment.
    if (req.method === "OPTIONS" && process.env.NODE_ENV !== "production") {
      return new NextResponse(null, {
        status: 200,
        headers: {
          "Access-Control-Allow-Origin": "http://localhost:8081",
          "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      });
    }
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
    // Match all paths except Next internals and static files (with a dot in
    // the last segment). app/api/v1/* is NOT excluded (unlike before) —
    // this function now needs to run for it too, to serve the dev-only CORS
    // preflight shortcut above; the early return keeps the cost of that to
    // one cheap pathname check per API request.
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
