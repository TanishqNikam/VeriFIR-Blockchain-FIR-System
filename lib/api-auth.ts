/**
 * lib/api-auth.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Server-side authentication helpers for API route handlers.
 *
 * AUTHENTICATION FLOW:
 *   1. User logs in via POST /api/auth/login
 *   2. Server creates a signed session token (lib/session.ts) and stores it
 *      in an HTTP-only cookie named "verifir_session"
 *   3. Every subsequent API request carries the cookie automatically
 *   4. API routes call requireSession() which reads + verifies the token
 *
 * TWO-LAYER SECURITY:
 *   - middleware.ts:  Decodes token payload (no sig verify) for route redirects
 *   - api-auth.ts:    Fully verifies HMAC signature before trusting any session data
 *
 * TYPICAL USAGE IN AN API ROUTE:
 *   const auth = await requireSession(["police", "admin"])
 *   if (isAuthError(auth)) return auth          // returns 401 or 403 response
 *   const { session } = auth                    // session is now type-safe
 *   console.log(session.userId, session.role)
 */
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken, type SessionPayload } from "./session";

/** Name of the HTTP-only cookie that holds the session token */
export const SESSION_COOKIE = "verifir_session";

/**
 * Read the session cookie and verify its HMAC signature.
 * @returns The decoded session payload, or null if absent / tampered.
 */
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

/**
 * Require a valid session, optionally restricted to certain roles.
 *
 * @param allowedRoles  If provided, only these roles can proceed.
 *                      Omit to allow any authenticated user.
 * @returns `{ session }` on success, or a NextResponse (401/403) on failure.
 *
 * Pattern:
 *   const auth = await requireSession(["police"])
 *   if (isAuthError(auth)) return auth
 *   const { session } = auth
 */
export async function requireSession(
  allowedRoles?: Array<"citizen" | "police" | "admin">
): Promise<{ session: SessionPayload } | NextResponse> {
  const session = await getSession();

  if (!session) {
    return NextResponse.json(
      { error: "Authentication required. Please log in." },
      { status: 401 }
    );
  }

  if (allowedRoles && !allowedRoles.includes(session.role)) {
    return NextResponse.json(
      { error: `Access denied. Required role: ${allowedRoles.join(" or ")}.` },
      { status: 403 }
    );
  }

  return { session };
}

/**
 * Type guard that distinguishes a successful auth result from an error response.
 *
 * Use immediately after requireSession():
 *   if (isAuthError(auth)) return auth   // short-circuit the handler
 */
export function isAuthError(
  v: { session: SessionPayload } | NextResponse
): v is NextResponse {
  return v instanceof NextResponse;
}
