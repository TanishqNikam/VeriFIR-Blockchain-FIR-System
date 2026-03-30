/**
 * POST /api/auth/login
 * Validates credentials against MongoDB.
 * On success, sets an HTTP-only session cookie for server-side auth.
 */
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import UserModel, { verifyPassword } from "@/lib/models/User";
import { createSessionToken } from "@/lib/session";
import { SESSION_COOKIE } from "@/lib/api-auth";
import { rateLimit } from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit";


export async function POST(req: Request) {
  // Rate limit: 10 attempts per 15 minutes per IP
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = rateLimit(`login:${ip}`, 10, 15 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many login attempts. Please wait and try again." },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil(rl.resetInMs / 1000)) },
      }
    );
  }

  try {
    const { email, password, role } = await req.json();

    if (!email || !password || !role) {
      return NextResponse.json(
        { error: "email, password and role are required" },
        { status: 400 }
      );
    }

    await connectDB();

    const user = await UserModel.findOne({
      email: email.toLowerCase().trim(),
    }).lean();

    if (!user || !verifyPassword(password, user.passwordHash)) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    if (user.role !== role) {
      return NextResponse.json(
        {
          error: `This account is registered as "${user.role}", not "${role}". Please select the correct role.`,
        },
        { status: 403 }
      );
    }

    // ── Audit log ───────────────────────────────────────────────────────────
    logAudit({
      action: "USER_LOGIN",
      actorId: user.userId,
      actorName: user.name,
      actorRole: user.role,
      details: `Login from IP: ${ip}`,
    }).catch(() => {});

    // ── Create session token → HTTP-only cookie ─────────────────────────────
    const token = createSessionToken({
      userId: user.userId,
      email: user.email,
      name: user.name,
      role: user.role,
      pincode: user.pincode,
    });

    const userData = {
      id: user.userId,
      email: user.email,
      name: user.name,
      role: user.role,
      walletAddress: user.walletAddress,
      pincode: user.pincode,
    };

    const res = NextResponse.json(userData);
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });
    return res;
  } catch (err) {
    console.error("[POST /api/auth/login] error:", err);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
