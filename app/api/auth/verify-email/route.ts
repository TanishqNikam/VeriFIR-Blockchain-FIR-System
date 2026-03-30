/**
 * POST /api/auth/verify-email
 * Verify OTP sent during registration and mark account as verified.
 * Body: { email, otp }
 */
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import UserModel from "@/lib/models/User";

export async function POST(req: Request) {
  try {
    const { email, otp } = await req.json()

    if (!email?.trim() || !otp?.trim()) {
      return NextResponse.json({ error: "Email and OTP are required" }, { status: 400 })
    }

    await connectDB()

    const user = await UserModel.findOne({ email: email.toLowerCase().trim() })

    if (!user) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 })
    }
    if (user.emailVerified) {
      return NextResponse.json({ success: true, message: "Email already verified" })
    }
    if (!user.emailOTP || !user.emailOTPExpiry) {
      return NextResponse.json({ error: "No OTP found. Please request a new one." }, { status: 400 })
    }
    if (new Date() > user.emailOTPExpiry) {
      return NextResponse.json({ error: "OTP has expired. Please request a new one." }, { status: 400 })
    }
    if (user.emailOTP !== otp.trim()) {
      return NextResponse.json({ error: "Incorrect OTP. Please try again." }, { status: 400 })
    }

    await UserModel.updateOne(
      { email: email.toLowerCase().trim() },
      { $set: { emailVerified: true }, $unset: { emailOTP: "", emailOTPExpiry: "" } }
    )

    return NextResponse.json({ success: true, message: "Email verified successfully" })
  } catch (err) {
    console.error("[POST /api/auth/verify-email] error:", err)
    return NextResponse.json({ error: "Verification failed" }, { status: 500 })
  }
}
