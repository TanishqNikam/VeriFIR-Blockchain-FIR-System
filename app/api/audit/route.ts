/**
 * GET /api/audit
 * Returns audit log entries (admin only).
 * Query params: firId, action, page, limit
 */
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import AuditLogModel from "@/lib/models/AuditLog";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const firId = searchParams.get("firId");
    const action = searchParams.get("action");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));

    await connectDB();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: Record<string, any> = {};
    if (firId) query.firId = firId;
    if (action) query.action = action;

    const [logs, total] = await Promise.all([
      AuditLogModel.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      AuditLogModel.countDocuments(query),
    ]);

    return NextResponse.json({ logs, total, page, limit });
  } catch (err) {
    console.error("[GET /api/audit] error:", err);
    return NextResponse.json({ error: "Failed to fetch audit logs" }, { status: 500 });
  }
}
