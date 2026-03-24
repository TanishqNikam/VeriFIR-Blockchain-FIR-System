/**
 * POST /api/auth/register
 * Create a new user account.
 * Body: { name, email, password, role }
 */
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import UserModel, { hashPassword } from "@/lib/models/User";
import type { UserRole } from "@/lib/types";

const VALID_ROLES: UserRole[] = ["citizen", "police", "admin"];

export async function POST(req: Request) {
  try {
    const { name, email, password, role } = await req.json();

    if (!name?.trim() || !email?.trim() || !password || !role) {
      return NextResponse.json({ error: "name, email, password and role are required" }, { status: 400 });
    }
    if (!VALID_ROLES.includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    await connectDB();

    const existing = await UserModel.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
    }

    const userId = `${role}-${Date.now()}`;
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
