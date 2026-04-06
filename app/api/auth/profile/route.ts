/**
 * GET  /api/auth/profile — Return full profile of the logged-in user
 * PATCH /api/auth/profile — Update editable profile fields
 *
 * Editable fields by role:
 *   All:     name, phone
 *   Citizen: gender, dateOfBirth
 *   Police:  badgeNumber, policeStation (pincode is admin-managed only)
 *   Admin:   (same as base)
 */
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import UserModel from "@/lib/models/User";
import { requireSession, isAuthError } from "@/lib/api-auth";

export async function GET() {
  const auth = await requireSession(["citizen", "police", "admin"]);
  if (isAuthError(auth)) return auth;
  const { session } = auth;

  try {
    await connectDB();
    const user = await UserModel.findOne({ userId: session.userId }).lean();
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Return all non-sensitive fields (no passwordHash, no OTP, no reset tokens)
    return NextResponse.json({
      userId: user.userId,
      email: user.email,
      name: user.name,
      role: user.role,
      phone: user.phone ?? null,
      gender: user.gender ?? null,
      dateOfBirth: user.dateOfBirth ?? null,
      badgeNumber: user.badgeNumber ?? null,
      policeStation: user.policeStation ?? null,
      pincode: user.pincode ?? null,
      walletAddress: user.walletAddress ?? null,
      emailVerified: user.emailVerified ?? false,
    });
  } catch (err) {
    console.error("[GET /api/auth/profile] error:", err);
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const auth = await requireSession(["citizen", "police", "admin"]);
  if (isAuthError(auth)) return auth;
  const { session } = auth;

  try {
    await connectDB();
    const body = await req.json();

    // Build safe update — only allow editable fields, never allow role/email/password changes here
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const update: Record<string, any> = {};

    // All roles: name, phone
    if (typeof body.name === "string" && body.name.trim()) {
      update.name = body.name.trim();
    }
    if (typeof body.phone === "string") {
      const cleaned = body.phone.replace(/\D/g, "").slice(0, 10);
      update.phone = cleaned || undefined;
    }

    // Citizen-only fields
    if (session.role === "citizen") {
      if (typeof body.gender === "string" && ["male", "female", "other"].includes(body.gender)) {
        update.gender = body.gender;
      }
      if (typeof body.dateOfBirth === "string") {
        update.dateOfBirth = body.dateOfBirth || undefined;
      }
    }

    // Police-only fields
    if (session.role === "police") {
      if (typeof body.badgeNumber === "string") {
        update.badgeNumber = body.badgeNumber.trim() || undefined;
      }
      if (typeof body.policeStation === "string") {
        update.policeStation = body.policeStation.trim() || undefined;
      }
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const updated = await UserModel.findOneAndUpdate(
      { userId: session.userId },
      { $set: update },
      { new: true, lean: true }
    );

    if (!updated) return NextResponse.json({ error: "User not found" }, { status: 404 });

    return NextResponse.json({
      success: true,
      name: updated.name,
      phone: updated.phone ?? null,
      gender: updated.gender ?? null,
      dateOfBirth: updated.dateOfBirth ?? null,
      badgeNumber: updated.badgeNumber ?? null,
      policeStation: updated.policeStation ?? null,
    });
  } catch (err) {
    console.error("[PATCH /api/auth/profile] error:", err);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
