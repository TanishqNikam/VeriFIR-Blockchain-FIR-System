/**
 * POST /api/auth/logout
 * Clears the server-side session cookie.
 */
import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/api-auth";

export async function POST() {
  const res = NextResponse.json({ success: true });
  res.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0, // Immediately expire
  });
  return res;
}
