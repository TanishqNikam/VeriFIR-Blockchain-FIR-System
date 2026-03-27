/**
 * GET /api/auth/me
 * ─────────────────────────────────────────────────────────────────────────────
 * Returns the current user's session data by reading the HTTP-only session
 * cookie. Used by AuthProvider on mount to hydrate client-side auth state
 * when sessionStorage is empty (e.g. after the tab was closed and reopened).
 *
 * This is a lightweight view-only endpoint — it does not touch MongoDB.
 * It simply verifies the HMAC signature on the session cookie and returns
 * the embedded payload, which contains all the user data needed for the UI.
 *
 * Returns:
 *   200 { id, email, name, role, pincode, walletAddress } — valid session
 *   401 { error: "No session" }                           — no cookie / invalid
 */
import { NextResponse } from "next/server";
import { getSession } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import UserModel from "@/lib/models/User";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No session" }, { status: 401 });
  }

  // Fetch fresh user data from DB to include walletAddress which isn't in the token
  try {
    await connectDB();
    const user = await UserModel.findOne({ userId: session.userId }).lean();
    if (!user) {
      return NextResponse.json({ error: "No session" }, { status: 401 });
    }
    return NextResponse.json({
      id: user.userId,
      email: user.email,
      name: user.name,
      role: user.role,
      walletAddress: user.walletAddress,
      pincode: user.pincode,
    });
  } catch {
    // If DB is unreachable, return session payload (no walletAddress)
    return NextResponse.json({
      id: session.userId,
      email: session.email,
      name: session.name,
      role: session.role,
      pincode: session.pincode,
    });
  }
}
