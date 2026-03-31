/**
 * POST /api/auth/change-password
 * Allows any authenticated user to change their own password.
 * Requires current password to be correct before accepting the new one.
 */
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import UserModel, { verifyPassword, hashPassword } from "@/lib/models/User";
import { requireSession, isAuthError } from "@/lib/api-auth";

export async function POST(req: Request) {
  const auth = await requireSession();
  if (isAuthError(auth)) return auth;
  const { session } = auth;

  try {
    const { oldPassword, newPassword } = await req.json();

    if (!oldPassword || !newPassword) {
      return NextResponse.json(
        { error: "Old password and new password are required." },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "New password must be at least 8 characters." },
        { status: 400 }
      );
    }

    if (oldPassword === newPassword) {
      return NextResponse.json(
        { error: "New password must be different from the current password." },
        { status: 400 }
      );
    }

    await connectDB();

    const user = await UserModel.findOne({ userId: session.userId });
    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    if (!verifyPassword(oldPassword, user.passwordHash)) {
      return NextResponse.json(
        { error: "Current password is incorrect." },
        { status: 400 }
      );
    }

    user.passwordHash = hashPassword(newPassword);
    await user.save();

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[POST /api/auth/change-password]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
