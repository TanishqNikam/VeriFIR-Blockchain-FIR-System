/**
 * lib/audit.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Append-only audit log writer.
 *
 * WHAT IS LOGGED?
 *   Every significant action in the system (FIR creation, status changes,
 *   evidence uploads, user management, logins) is recorded with who did it,
 *   what they did, and when. Records are never updated or deleted.
 *
 * WHY IS IT NON-FATAL?
 *   Audit logging supports accountability — it should never be the reason
 *   a primary operation (filing an FIR, verifying) fails. If the DB is
 *   momentarily unavailable, we log to console and move on.
 *
 * USAGE:
 *   logAudit({ action: "FIR_CREATED", firId, actorId, actorName, ... })
 *     .catch(() => {})   // caller decides whether to await or fire-and-forget
 */
import { connectDB } from "@/lib/db";
import AuditLogModel, { type AuditAction } from "@/lib/models/AuditLog";

interface AuditParams {
  /** The class of event being recorded */
  action: AuditAction;
  /** The FIR this event relates to (omit for user-management events) */
  firId?: string;
  /** userId of the person performing the action */
  actorId: string;
  /** Display name of the actor (for human-readable audit reports) */
  actorName: string;
  actorRole: "citizen" | "police" | "admin" | "system";
  /** Previous FIR status (for status-change events) */
  fromStatus?: string;
  /** New FIR status (for status-change events) */
  toStatus?: string;
  /** Free-form extra detail (reason, tx hash, file list, …) */
  details?: string;
  /** Requester IP address — best-effort, may be undefined */
  ipAddress?: string;
}

/**
 * Write a single audit log entry to MongoDB.
 * @throws Never — errors are swallowed so callers can use .catch(() => {})
 */
export async function logAudit(params: AuditParams): Promise<void> {
  try {
    await connectDB();
    await AuditLogModel.create(params);
  } catch (err) {
    // Audit failure must never break the main flow
    console.error("[audit] failed to write log:", err);
  }
}
