/**
 * middleware.ts
 * Next.js Edge Middleware — runs before every request matched by `config.matcher`.
 *
 * Responsibilities:
 *  1. Redirect unauthenticated users away from /dashboard/* to /login
 *  2. Redirect users to their correct role dashboard if they land on the wrong one
 *  3. Redirect already-authenticated users away from /login to their dashboard
 *
 * Note: This middleware only DECODES the token payload (for routing).
 *       Full HMAC signature verification happens inside each API route handler
 *       via `lib/api-auth.ts`. Security lives in the API layer, not here.
 */
import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "verifir_session";

/** Decode the payload portion of our custom token (edge-runtime compatible). */
function decodePayload(
  token: string
): { role?: string; userId?: string } | null {
  try {
    const lastDot = token.lastIndexOf(".");
    if (lastDot === -1) return null;
    const b64url = token.slice(0, lastDot);
    // base64url → base64 (standard) → decode
    const b64 =
      b64url.replace(/-/g, "+").replace(/_/g, "/") +
      "=".repeat((4 - (b64url.length % 4)) % 4);
    return JSON.parse(atob(b64));
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const payload = token ? decodePayload(token) : null;
  const role = payload?.role as string | undefined;
  const isAuthenticated = !!payload;

  // ── Protect all dashboard routes ─────────────────────────────────────────
  if (pathname.startsWith("/dashboard")) {
    if (!isAuthenticated) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Role-specific access control
    if (pathname.startsWith("/dashboard/citizen") && role !== "citizen") {
      return NextResponse.redirect(
        new URL(`/dashboard/${role}`, request.url)
      );
    }
    if (pathname.startsWith("/dashboard/police") && role !== "police") {
      return NextResponse.redirect(
        new URL(`/dashboard/${role}`, request.url)
      );
    }
    if (pathname.startsWith("/dashboard/admin") && role !== "admin") {
      return NextResponse.redirect(
        new URL(`/dashboard/${role}`, request.url)
      );
    }
  }

  // ── Redirect authenticated users away from login page ────────────────────
  if (pathname === "/login" && isAuthenticated && role) {
    return NextResponse.redirect(
      new URL(`/dashboard/${role}`, request.url)
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/login"],
};
