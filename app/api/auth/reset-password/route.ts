/**
 * POST /api/auth/reset-password
 * Body: { email: string; token: string; password: string }
 *
 * Validates the reset token and updates the user's password.
 */
import { NextResponse } from "next/server";
import crypto from "crypto";
import { connectDB } from "@/lib/db";
import UserModel, { hashPassword } from "@/lib/models/User";

export async function POST(req: Request) {
  try {
    const { email, token, password } = await req.json();

    if (!email || !token || !password) {
      return NextResponse.json({ error: "email, token and password are required" }, { status: 400 });
    }

    if (typeof password !== "string" || password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    await connectDB();

    // Hash the incoming token and compare with stored hash
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await UserModel.findOne({
      email: (email as string).toLowerCase().trim(),
      passwordResetToken: hashedToken,
      passwordResetExpiry: { $gt: new Date() }, // not expired
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid or expired reset token. Please request a new one." },
        { status: 400 }
      );
    }

    // Update password and clear reset token fields
    user.passwordHash = hashPassword(password);
    user.passwordResetToken = undefined;
    user.passwordResetExpiry = undefined;
    await user.save();

    return NextResponse.json({ message: "Password updated successfully. You can now log in." });
  } catch (err) {
    console.error("[POST /api/auth/reset-password]", err);
    return NextResponse.json({ error: "Failed to reset password" }, { status: 500 });
  }
}
