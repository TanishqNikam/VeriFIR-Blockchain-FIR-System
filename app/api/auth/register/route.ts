/**
 * POST /api/auth/register
 * Create a new citizen account (unverified until OTP confirmed).
 * Police and admin accounts are created exclusively by admins via /api/admin/users.
 */
import { NextResponse } from "next/server";
import crypto from "crypto";
import { connectDB } from "@/lib/db";
import UserModel, { hashPassword } from "@/lib/models/User";
import { sendEmail, otpEmail } from "@/lib/email";

function maskAadhaar(aadhaar: string): string {
  const digits = aadhaar.replace(/\D/g, "")
  if (digits.length !== 12) return "XXXX-XXXX-" + digits.slice(-4)
  return `XXXX-XXXX-${digits.slice(8)}`
}

function generateOTP(): string {
  return String(crypto.randomInt(100000, 999999))
}

export async function POST(req: Request) {
  try {
    const { name, email, password, role, gender, phone, aadhaar, dateOfBirth } = await req.json()

    // Only citizen self-registration is allowed
    if (role && role !== "citizen") {
      return NextResponse.json(
        { error: "Police and admin accounts must be created by an administrator" },
        { status: 403 }
      )
    }

    if (!name?.trim() || !email?.trim() || !password) {
      return NextResponse.json({ error: "Name, email and password are required" }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 })
    }
    if (!gender) {
      return NextResponse.json({ error: "Gender is required" }, { status: 400 })
    }
    if (!phone?.trim()) {
      return NextResponse.json({ error: "Phone number is required" }, { status: 400 })
    }
    if (!/^\d{10}$/.test(phone.replace(/\s/g, ""))) {
      return NextResponse.json({ error: "Enter a valid 10-digit phone number" }, { status: 400 })
    }
    if (!aadhaar?.trim()) {
      return NextResponse.json({ error: "Aadhaar number is required" }, { status: 400 })
    }
    if (!/^\d{12}$/.test(aadhaar.replace(/\s/g, ""))) {
      return NextResponse.json({ error: "Aadhaar must be 12 digits" }, { status: 400 })
    }
    if (!dateOfBirth?.trim()) {
      return NextResponse.json({ error: "Date of birth is required" }, { status: 400 })
    }

    await connectDB()

    const existing = await UserModel.findOne({ email: email.toLowerCase().trim() })
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 })
    }

    const otp = generateOTP()
    const otpExpiry = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes

    const userId = `citizen-${crypto.randomBytes(4).toString("hex")}`
    await UserModel.create({
      userId,
      email: email.toLowerCase().trim(),
      passwordHash: hashPassword(password),
      name: name.trim(),
      role: "citizen",
      gender,
      phone: phone.replace(/\s/g, ""),
      aadhaarMasked: maskAadhaar(aadhaar),
      dateOfBirth,
      emailVerified: false,
      emailOTP: otp,
      emailOTPExpiry: otpExpiry,
    })

    // Send OTP email
    await sendEmail({
      to: email.toLowerCase().trim(),
      subject: "VeriFIR — Verify Your Email",
      html: otpEmail({ name: name.trim(), otp }),
    })

    return NextResponse.json(
      { success: true, message: "Account created. Check your email for the OTP." },
      { status: 201 }
    )
  } catch (err) {
    console.error("[POST /api/auth/register] error:", err)
    return NextResponse.json({ error: "Registration failed" }, { status: 500 })
  }
}
