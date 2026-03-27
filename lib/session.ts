/**
 * lib/session.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Custom HMAC-SHA256 session tokens — no external JWT libraries required.
 *
 * TOKEN FORMAT
 *   base64url(JSON_payload) + "." + HMAC-SHA256(base64url(payload))
 *
 * WHY NOT JWT?
 *   Standard JWTs work fine, but this keeps the dependency tree smaller and
 *   gives us full control over the signing logic. The security properties are
 *   identical: the server signs the payload, and only the server can verify it.
 *
 * HOW IT WORKS
 *   1. Payload serialised to JSON, base64url-encoded → `data`
 *   2. HMAC-SHA256(data) with SESSION_SECRET → `sig`
 *   3. Token = `data.sig`
 *
 *   On verification, the server recomputes the HMAC and compares using
 *   crypto.timingSafeEqual to prevent timing-side-channel attacks.
 *
 * EDGE RUNTIME NOTE
 *   This file uses Node.js `crypto` — it runs in API routes only.
 *   The middleware (middleware.ts) does NOT import this; it uses `atob` to
 *   decode the payload for routing decisions WITHOUT verifying the signature.
 *   Security is enforced here in the API layer.
 *
 * REQUIRED ENV:
 *   SESSION_SECRET=<random 32+ character string>
 *   Defaults to a hardcoded dev secret — MUST be set in production.
 */
import crypto from "crypto";

const SECRET =
  process.env.SESSION_SECRET ||
  "verifir-dev-secret-CHANGE-THIS-IN-PRODUCTION-32chars+";

/** The data baked into every session token */
export interface SessionPayload {
  userId: string;
  email: string;
  name: string;
  role: "citizen" | "police" | "admin";
  /**
   * Jurisdiction pincode (police only).
   * Police officers only see FIRs whose pincode matches this value.
   */
  pincode?: string;
}

/**
 * Sign a payload and return an opaque session token string.
 * Store this in an HTTP-only cookie; never expose it to JavaScript.
 */
export function createSessionToken(payload: SessionPayload): string {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto
    .createHmac("sha256", SECRET)
    .update(data)
    .digest("base64url");
  return `${data}.${sig}`;
}

/**
 * Verify a session token and return the decoded payload, or null if invalid.
 * Uses constant-time comparison to resist timing attacks.
 */
export function verifySessionToken(token: string): SessionPayload | null {
  try {
    const lastDot = token.lastIndexOf(".");
    if (lastDot === -1) return null;

    const data = token.slice(0, lastDot);
    const sig = token.slice(lastDot + 1);

    // Recompute expected signature
    const expected = crypto
      .createHmac("sha256", SECRET)
      .update(data)
      .digest("base64url");

    // Reject if lengths differ (timingSafeEqual requires equal-length buffers)
    if (sig.length !== expected.length) return null;

    // Constant-time comparison — prevents attackers from guessing the sig byte-by-byte
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
      return null;
    }

    return JSON.parse(Buffer.from(data, "base64url").toString()) as SessionPayload;
  } catch {
    // Malformed token — return null instead of throwing
    return null;
  }
}
