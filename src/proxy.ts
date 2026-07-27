import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "idlib_session";

// Fast, DB-free redirect for the obvious logged-out case. The authoritative
// check (session validity, active flag, RBAC permission) happens per-request
// in src/lib/auth.ts, called from every protected page/layout/action — this
// proxy is a UX convenience only, not the security boundary.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.has(SESSION_COOKIE);

  if (!hasSession) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/dashboard/:path*"],
};
