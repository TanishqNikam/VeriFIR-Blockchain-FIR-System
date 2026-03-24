/**
 * GET  /api/notifications?userId=...  — fetch notifications for a user
 * PATCH /api/notifications             — mark one or all as read
 *   body: { id?: string, userId: string, markAll?: boolean }
 */
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import NotificationModel from "@/lib/models/Notification";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  try {
    await connectDB();
    const notifications = await NotificationModel.find({ userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return NextResponse.json({
      notifications: notifications.map((n) => ({
        id: (n._id as { toString(): string }).toString(),
        userId: n.userId,
        type: n.type,
        title: n.title,
        message: n.message,
        firId: n.firId,
        read: n.read,
        createdAt: n.createdAt,
      })),
      unreadCount: notifications.filter((n) => !n.read).length,
    });
  } catch (err) {
    console.error("[GET /api/notifications]", err);
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { id, userId, markAll } = await req.json();
    if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

    await connectDB();

    if (markAll) {
      await NotificationModel.updateMany({ userId, read: false }, { read: true });
    } else if (id) {
      await NotificationModel.findByIdAndUpdate(id, { read: true });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[PATCH /api/notifications]", err);
    return NextResponse.json({ error: "Failed to update notifications" }, { status: 500 });
  }
}
