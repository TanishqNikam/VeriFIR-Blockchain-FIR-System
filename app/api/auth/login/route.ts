/**
 * POST /api/auth/login
 * Validates credentials against MongoDB.
 * On first run, seeds the three default demo accounts if none exist.
 */
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import UserModel, { hashPassword, verifyPassword } from "@/lib/models/User";

// Default demo accounts — seeded automatically on first login
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
    walletAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD58",
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

async function seedDefaultUsers() {
  const count = await UserModel.countDocuments();
  if (count > 0) return;
  await UserModel.insertMany(
    DEFAULT_USERS.map((u) => ({
      userId: u.userId,
      email: u.email,
      passwordHash: hashPassword(u.password),
      name: u.name,
      role: u.role,
      walletAddress: u.walletAddress,
    }))
  );
  console.log("[auth/login] Seeded default demo users.");
}

export async function POST(req: Request) {
  try {
    const { email, password, role } = await req.json();

    if (!email || !password || !role) {
      return NextResponse.json({ error: "email, password and role are required" }, { status: 400 });
    }

    await connectDB();
    await seedDefaultUsers();

    const user = await UserModel.findOne({ email: email.toLowerCase().trim() }).lean();

    if (!user) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    if (!verifyPassword(password, user.passwordHash)) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    if (user.role !== role) {
      return NextResponse.json(
        { error: `This account is registered as "${user.role}", not "${role}". Please select the correct role.` },
        { status: 403 }
      );
    }

    return NextResponse.json({
      id: user.userId,
      email: user.email,
      name: user.name,
      role: user.role,
      walletAddress: user.walletAddress,
    });
  } catch (err) {
    console.error("[POST /api/auth/login] error:", err);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
