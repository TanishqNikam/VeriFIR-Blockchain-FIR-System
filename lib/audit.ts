/**
 * lib/audit.ts
 * Utility for writing audit log entries.
 * Failures are non-fatal — logged to console but never throw.
 */
import { connectDB } from "@/lib/db";
import AuditLogModel, { type AuditAction } from "@/lib/models/AuditLog";

interface AuditParams {
  action: AuditAction;
  firId: string;
  actorId: string;
  actorName: string;
  actorRole: "citizen" | "police" | "admin" | "system";
  fromStatus?: string;
  toStatus?: string;
  details?: string;
  ipAddress?: string;
}

export async function logAudit(params: AuditParams): Promise<void> {
  try {
    await connectDB();
    await AuditLogModel.create(params);
  } catch (err) {
    // Audit failure must never break the main flow
    console.error("[audit] failed to write log:", err);
  }
}
