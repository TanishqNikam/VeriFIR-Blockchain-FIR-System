/**
 * lib/models/AuditLog.ts
 * Immutable audit trail for all FIR-related actions.
 * Records are append-only — never updated or deleted.
 */
import mongoose, { Schema, Document, Model } from "mongoose";

export type AuditAction =
  | "FIR_CREATED"
  | "FIR_STATUS_CHANGED"
  | "EVIDENCE_ADDED"
  | "FIR_APPEALED"
  | "NOTE_ADDED"
  | "FIR_VIEWED";

export interface IAuditLog extends Document {
  action: AuditAction;
  firId: string;
  actorId: string;
  actorName: string;
  actorRole: "citizen" | "police" | "admin" | "system";
  /** Previous status (for FIR_STATUS_CHANGED) */
  fromStatus?: string;
  /** New status (for FIR_STATUS_CHANGED) */
  toStatus?: string;
  /** Free-form detail string */
  details?: string;
  /** IP address of the request (best-effort) */
  ipAddress?: string;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    action: {
      type: String,
      required: true,
      enum: ["FIR_CREATED", "FIR_STATUS_CHANGED", "EVIDENCE_ADDED", "FIR_APPEALED", "NOTE_ADDED", "FIR_VIEWED"],
      index: true,
    },
    firId: { type: String, required: true, index: true },
    actorId: { type: String, required: true },
    actorName: { type: String, required: true },
    actorRole: { type: String, required: true, enum: ["citizen", "police", "admin", "system"] },
    fromStatus: { type: String },
    toStatus: { type: String },
    details: { type: String, maxlength: 1000 },
    ipAddress: { type: String },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // append-only; no updatedAt
  }
);

// Disable update/replace operations to keep logs truly immutable
AuditLogSchema.pre("findOneAndUpdate", function () {
  throw new Error("AuditLog records are immutable");
});
AuditLogSchema.pre("updateOne", function () {
  throw new Error("AuditLog records are immutable");
});

const AuditLogModel: Model<IAuditLog> =
  (mongoose.models.AuditLog as Model<IAuditLog>) ||
  mongoose.model<IAuditLog>("AuditLog", AuditLogSchema);

export default AuditLogModel;
