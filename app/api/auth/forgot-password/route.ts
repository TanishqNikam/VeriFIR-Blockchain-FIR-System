/**
 * POST /api/auth/forgot-password
 * Body: { email: string }
 *
 * Generates a one-time reset token, stores its SHA-256 hash in the DB,
 * and sends a reset link to the user's email.
 * Always returns 200 (to avoid email enumeration attacks).
 */
import { NextResponse } from "next/server";
import crypto from "crypto";
import { connectDB } from "@/lib/db";
import UserModel from "@/lib/models/User";
import { sendEmail } from "@/lib/email";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    await connectDB();
    const user = await UserModel.findOne({ email: email.toLowerCase().trim() });

    if (user) {
      // Generate a secure random token (32 bytes = 64 hex chars)
      const plainToken = crypto.randomBytes(32).toString("hex");
      // Store only the hash — if the DB is compromised, tokens can't be used
      const hashedToken = crypto.createHash("sha256").update(plainToken).digest("hex");

      user.passwordResetToken = hashedToken;
      user.passwordResetExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      await user.save();

      // Build reset URL — use NEXT_PUBLIC_APP_URL or fallback
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const resetUrl = `${baseUrl}/reset-password?token=${plainToken}&email=${encodeURIComponent(user.email)}`;

      await sendEmail({
        to: user.email,
        subject: "VeriFIR — Password Reset Request",
        html: `
          <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#f9fafb;border-radius:8px;">
            <div style="background:#1e293b;padding:16px 24px;border-radius:6px 6px 0 0;">
              <h1 style="color:#f8fafc;font-size:18px;margin:0;">VeriFIR — Password Reset</h1>
            </div>
            <div style="background:#fff;padding:24px;border-radius:0 0 6px 6px;border:1px solid #e2e8f0;">
              <p style="color:#374151;">Dear <strong>${user.name}</strong>,</p>
              <p style="color:#374151;">We received a request to reset the password for your VeriFIR account.</p>
              <p style="margin:24px 0;">
                <a href="${resetUrl}" style="background:#1e293b;color:#f8fafc;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;">
                  Reset Password
                </a>
              </p>
              <p style="color:#6b7280;font-size:13px;">This link expires in <strong>1 hour</strong>. If you did not request this, you can safely ignore this email.</p>
              <p style="color:#9ca3af;font-size:12px;margin-top:20px;border-top:1px solid #e2e8f0;padding-top:16px;">
                If the button does not work, copy this link:<br/>
                <code style="word-break:break-all;font-size:11px;">${resetUrl}</code>
              </p>
            </div>
          </div>
        `,
      });
    }

    // Always return 200 — never confirm whether an email exists
    return NextResponse.json({
      message: "If an account with that email exists, a reset link has been sent.",
    });
  } catch (err) {
    console.error("[POST /api/auth/forgot-password]", err);
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}
