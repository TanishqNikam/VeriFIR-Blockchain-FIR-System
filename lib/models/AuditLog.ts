/**
 * lib/models/AuditLog.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Immutable append-only audit trail for all significant system actions.
 *
 * DESIGN PRINCIPLES:
 *   - Records are NEVER updated or deleted (enforced via pre-hooks below).
 *   - Every FIR status change, evidence upload, login, and user management
 *     action creates one record here.
 *   - The audit log is separate from the FIR document so that even if an FIR
 *     is somehow modified, the trail of who did what remains intact.
 *
 * VIEWING LOGS:
 *   Admin dashboard → Blockchain Logs → uses GET /api/audit
 */
import mongoose, { Schema, Document, Model } from "mongoose";

/**
 * All action types that can appear in the audit trail.
 * Add new types here when introducing new auditable actions.
 */
export type AuditAction =
  | "FIR_CREATED"         // New FIR filed by a citizen
  | "FIR_STATUS_CHANGED"  // Status transition (pending → verified, etc.)
  | "EVIDENCE_ADDED"      // Legacy evidence action name
  | "EVIDENCE_UPLOADED"   // Evidence uploaded via /api/fir/:id/evidence
  | "FIR_APPEALED"        // Citizen submitted an appeal
  | "NOTE_ADDED"          // Police officer added an internal note
  | "FIR_VIEWED"          // FIR record viewed (optional, for access logging)
  | "USER_LOGIN"          // Successful login
  | "USER_CREATED"        // Admin created a new user account
  | "USER_UPDATED"        // Admin updated a user (pincode, name, etc.)
  | "USER_DELETED";       // Admin deleted a user account

export interface IAuditLog extends Document {
  action: AuditAction;
  /** The FIR this event relates to. Omitted for user-management events. */
  firId?: string;
  /** userId of the person who performed the action */
  actorId: string;
  /** Human-readable name for audit reports */
  actorName: string;
  actorRole: "citizen" | "police" | "admin" | "system";
  /** FIR status before the change (for FIR_STATUS_CHANGED events) */
  fromStatus?: string;
  /** FIR status after the change */
  toStatus?: string;
  /** Additional context: reason for rejection, list of files uploaded, etc. */
  details?: string;
  /** Best-effort IP address of the requester */
  ipAddress?: string;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    action: {
      type: String,
      required: true,
      enum: [
        "FIR_CREATED", "FIR_STATUS_CHANGED",
        "EVIDENCE_ADDED", "EVIDENCE_UPLOADED",
        "FIR_APPEALED", "NOTE_ADDED", "FIR_VIEWED",
        "USER_LOGIN", "USER_CREATED", "USER_UPDATED", "USER_DELETED",
      ],
      index: true,
    },
    // firId is optional (null for user-management events like USER_CREATED)
    firId: { type: String, index: true },
    actorId: { type: String, required: true },
    actorName: { type: String, required: true },
    actorRole: { type: String, required: true, enum: ["citizen", "police", "admin", "system"] },
    fromStatus: { type: String },
    toStatus: { type: String },
    details: { type: String, maxlength: 1000 },
    ipAddress: { type: String },
  },
  {
    // Only createdAt — no updatedAt, reinforcing immutability
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// ── Immutability guards ────────────────────────────────────────────────────────
// Throw if any code tries to update an existing audit record.
// deleteOne is intentionally not blocked — DB admins may need to purge PII
// via direct DB access, but application code cannot.
AuditLogSchema.pre("findOneAndUpdate", function () {
  throw new Error("AuditLog records are immutable");
});
AuditLogSchema.pre("updateOne", function () {
  throw new Error("AuditLog records are immutable");
});

// Guard against model re-registration during HMR
const AuditLogModel: Model<IAuditLog> =
  (mongoose.models.AuditLog as Model<IAuditLog>) ||
  mongoose.model<IAuditLog>("AuditLog", AuditLogSchema);

export default AuditLogModel;
