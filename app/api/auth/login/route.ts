/**
 * POST /api/auth/login
 * Validates credentials against MongoDB.
 * On success, sets an HTTP-only session cookie for server-side auth.
 * On first run, seeds the demo accounts if none exist.
 */
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import UserModel, { hashPassword, verifyPassword } from "@/lib/models/User";
import { createSessionToken } from "@/lib/session";
import { SESSION_COOKIE } from "@/lib/api-auth";
import { rateLimit } from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit";

// ── Demo accounts (seeded on first login) ─────────────────────────────────────
// Two police officers with DIFFERENT pincodes to demonstrate jurisdiction routing
const DEFAULT_USERS = [
  {
    userId: "citizen-001",
    email: "citizen@verifir.in",
    password: "citizen123",
    name: "Rahul Sharma",
    role: "citizen" as const,
  },
  {
    userId: "police-001",
    email: "police@verifir.in",
    password: "police123",
    name: "Inspector Ajay Singh",
    role: "police" as const,
    walletAddress: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    pincode: "411007", // Pune (Kothrud) jurisdiction
  },
  {
    userId: "police-002",
    email: "police2@verifir.in",
    password: "police123",
    name: "Inspector Priya Mehta",
    role: "police" as const,
    walletAddress: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    pincode: "411005", // Pune (Shivajinagar) jurisdiction
  },
  {
    userId: "admin-001",
    email: "admin@verifir.in",
    password: "admin123",
    name: "System Administrator",
    role: "admin" as const,
    walletAddress: "0x8Ba1f109551bD432803012645Ac136E8dc8F2Ac",
  },
];

/**
 * Seed default demo users into MongoDB.
 *
 * Uses per-user upsert instead of a single "skip if count > 0" check.
 * This ensures that new demo accounts added to DEFAULT_USERS are always
 * created even when the DB was previously seeded with an older version
 * of the list (the old approach caused police2 to never be inserted).
 *
 * Existing accounts are NOT overwritten — their passwords/pincodes are
 * preserved. Only missing accounts are inserted.
 */
async function seedDefaultUsers() {
  let seeded = 0;
  let updated = 0;
  for (const u of DEFAULT_USERS) {
    const existing = await UserModel.findOne({ userId: u.userId });
    if (!existing) {
      await UserModel.create({
        userId: u.userId,
        email: u.email,
        passwordHash: hashPassword(u.password),
        name: u.name,
        role: u.role,
        walletAddress: (u as { walletAddress?: string }).walletAddress,
        pincode: (u as { pincode?: string }).pincode,
      });
      seeded++;
    } else {
      // Always sync pincode and walletAddress for demo accounts so config
      // changes (like the 400001→411007 pincode update) take effect immediately.
      const updateFields: Record<string, string | undefined> = {};
      const targetPincode = (u as { pincode?: string }).pincode;
      const targetWallet = (u as { walletAddress?: string }).walletAddress;
      if (targetPincode && existing.pincode !== targetPincode) updateFields.pincode = targetPincode;
      if (targetWallet && existing.walletAddress !== targetWallet) updateFields.walletAddress = targetWallet;
      if (Object.keys(updateFields).length > 0) {
        await UserModel.updateOne({ userId: u.userId }, { $set: updateFields });
        updated++;
      }
    }
  }
  if (seeded > 0 || updated > 0) console.log(`[auth/login] Demo users: ${seeded} created, ${updated} updated.`);
}

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
    await seedDefaultUsers();

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
