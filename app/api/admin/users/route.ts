/**
 * Admin User Management API
 *
 * GET  /api/admin/users          — List all users (with optional ?role= filter)
 * POST /api/admin/users          — Create a new user
 * PATCH /api/admin/users         — Update a user (pincode, name, role, active status)
 * DELETE /api/admin/users?id=    — Deactivate (soft-delete) a user
 */
import { NextResponse } from "next/server";
import crypto from "crypto";
import { connectDB } from "@/lib/db";
import UserModel, { hashPassword } from "@/lib/models/User";
import { requireSession, isAuthError } from "@/lib/api-auth";
import { logAudit } from "@/lib/audit";

// Only admins can access these routes
async function adminAuth() {
  const auth = await requireSession(["admin"]);
  return auth;
}

// ─── GET /api/admin/users ──────────────────────────────────────────────────────

export async function GET(req: Request) {
  const auth = await adminAuth();
  if (isAuthError(auth)) return auth;
  const { session } = auth;

  try {
    const { searchParams } = new URL(req.url);
    const role = searchParams.get("role");

    await connectDB();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: Record<string, any> = {};
    if (role && ["citizen", "police", "admin"].includes(role)) {
      query.role = role;
    }

    const users = await UserModel.find(query)
      .select("-passwordHash -passwordResetToken -passwordResetExpiry")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ users, total: users.length });
  } catch (err) {
    console.error("[GET /api/admin/users]", err);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

// ─── POST /api/admin/users ────────────────────────────────────────────────────

export async function POST(req: Request) {
  const auth = await adminAuth();
  if (isAuthError(auth)) return auth;
  const { session } = auth;

  try {
    const body = await req.json();
    const { name, email, password, role, pincode, walletAddress } = body;

    if (!name?.trim() || !email?.trim() || !password || !role) {
      return NextResponse.json(
        { error: "name, email, password, and role are required" },
        { status: 400 }
      );
    }

    if (!["citizen", "police", "admin"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    if (role === "police" && pincode && !/^\d{6}$/.test(pincode)) {
      return NextResponse.json({ error: "Pincode must be 6 digits" }, { status: 400 });
    }

    await connectDB();

    const existing = await UserModel.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return NextResponse.json({ error: "Email already in use" }, { status: 409 });
    }

    const userId = `${role}-${crypto.randomBytes(4).toString("hex")}`;
    const passwordHash = hashPassword(password);

    const user = await UserModel.create({
      userId,
      email: email.toLowerCase().trim(),
      passwordHash,
      name: name.trim(),
      role,
      pincode: role === "police" ? pincode?.trim() || undefined : undefined,
      walletAddress: walletAddress?.trim() || undefined,
    });

    logAudit({
      action: "USER_CREATED",
      actorId: session.userId,
      actorName: session.name,
      actorRole: "admin",
      details: `Created user ${userId} (${role}) — ${email}${pincode ? ` — pincode: ${pincode}` : ""}`,
    }).catch(() => {});

    return NextResponse.json(
      {
        success: true,
        user: {
          userId: user.userId,
          email: user.email,
          name: user.name,
          role: user.role,
          pincode: user.pincode,
          walletAddress: user.walletAddress,
          createdAt: user.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[POST /api/admin/users]", err);
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}

// ─── PATCH /api/admin/users ───────────────────────────────────────────────────

export async function PATCH(req: Request) {
  const auth = await adminAuth();
  if (isAuthError(auth)) return auth;
  const { session } = auth;

  try {
    const body = await req.json();
    const { userId, name, pincode, walletAddress, role } = body;

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    await connectDB();

    const user = await UserModel.findOne({ userId });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const changes: string[] = [];

    if (name?.trim() && name.trim() !== user.name) {
      user.name = name.trim();
      changes.push("name");
    }
    if (pincode !== undefined) {
      if (pincode && !/^\d{6}$/.test(pincode)) {
        return NextResponse.json({ error: "Pincode must be 6 digits" }, { status: 400 });
      }
      user.pincode = pincode?.trim() || undefined;
      changes.push("pincode");
    }
    if (walletAddress !== undefined) {
      user.walletAddress = walletAddress?.trim() || undefined;
      changes.push("walletAddress");
    }
    if (role && ["citizen", "police", "admin"].includes(role) && role !== user.role) {
      user.role = role;
      changes.push("role");
    }

    if (changes.length === 0) {
      return NextResponse.json({ success: true, message: "No changes" });
    }

    await user.save();

    logAudit({
      action: "USER_UPDATED",
      actorId: session.userId,
      actorName: session.name,
      actorRole: "admin",
      details: `Updated user ${userId}: ${changes.join(", ")}`,
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      user: {
        userId: user.userId,
        email: user.email,
        name: user.name,
        role: user.role,
        pincode: user.pincode,
        walletAddress: user.walletAddress,
      },
    });
  } catch (err) {
    console.error("[PATCH /api/admin/users]", err);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}

// ─── DELETE /api/admin/users ──────────────────────────────────────────────────

export async function DELETE(req: Request) {
  const auth = await adminAuth();
  if (isAuthError(auth)) return auth;
  const { session } = auth;

  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("id");

    if (!userId) {
      return NextResponse.json({ error: "id query param required" }, { status: 400 });
    }

    // Prevent admin from deleting themselves
    if (userId === session.userId) {
      return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
    }

    await connectDB();

    const user = await UserModel.findOne({ userId });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    await UserModel.deleteOne({ userId });

    logAudit({
      action: "USER_DELETED",
      actorId: session.userId,
      actorName: session.name,
      actorRole: "admin",
      details: `Deleted user ${userId} (${user.role}) — ${user.email}`,
    }).catch(() => {});

    return NextResponse.json({ success: true, userId });
  } catch (err) {
    console.error("[DELETE /api/admin/users]", err);
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}
