/**
 * POST /api/auth/resend-otp
 * Generate a new OTP and resend to the user's email.
 * Body: { email }
 */
import { NextResponse } from "next/server";
import crypto from "crypto";
import { connectDB } from "@/lib/db";
import UserModel from "@/lib/models/User";
import { sendEmail, otpEmail } from "@/lib/email";

export async function POST(req: Request) {
  try {
    const { email } = await req.json()

    if (!email?.trim()) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    await connectDB()

    const user = await UserModel.findOne({ email: email.toLowerCase().trim() })

    if (!user) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 })
    }
    if (user.emailVerified) {
      return NextResponse.json({ success: true, message: "Email already verified" })
    }

    const otp = String(crypto.randomInt(100000, 999999))
    const otpExpiry = new Date(Date.now() + 15 * 60 * 1000)

    await UserModel.updateOne(
      { email: email.toLowerCase().trim() },
      { $set: { emailOTP: otp, emailOTPExpiry: otpExpiry } }
    )

    await sendEmail({
      to: email.toLowerCase().trim(),
      subject: "VeriFIR — New Verification OTP",
      html: otpEmail({ name: user.name, otp }),
    })

    return NextResponse.json({ success: true, message: "New OTP sent to your email" })
  } catch (err) {
    console.error("[POST /api/auth/resend-otp] error:", err)
    return NextResponse.json({ error: "Failed to resend OTP" }, { status: 500 })
  }
}
