/**
 * POST /api/auth/register
 * Create a new citizen account.
 * Police and admin accounts are created exclusively by admins via /api/admin/users.
 * Body: { name, email, password }
 */
import { NextResponse } from "next/server";
import crypto from "crypto";
import { connectDB } from "@/lib/db";
import UserModel, { hashPassword } from "@/lib/models/User";

export async function POST(req: Request) {
  try {
    const { name, email, password, role } = await req.json();

    if (!name?.trim() || !email?.trim() || !password) {
      return NextResponse.json({ error: "name, email and password are required" }, { status: 400 });
    }
    // Only citizen self-registration is allowed. Police/admin accounts are
    // created by administrators through the admin dashboard.
    if (role && role !== "citizen") {
      return NextResponse.json({ error: "Police and admin accounts must be created by an administrator" }, { status: 403 });
    }
    // Enforce minimum length consistent with reset-password endpoint
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    await connectDB();

    const existing = await UserModel.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
    }

    // Use random hex suffix instead of timestamp to avoid collisions under concurrent registration
    const userId = `${role}-${crypto.randomBytes(4).toString("hex")}`;
    await UserModel.create({
      userId,
      email: email.toLowerCase().trim(),
      passwordHash: hashPassword(password),
      name: name.trim(),
      role,
    });

    return NextResponse.json({ success: true, message: "Account created successfully" }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/auth/register] error:", err);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
