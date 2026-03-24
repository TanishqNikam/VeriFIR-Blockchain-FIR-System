/**
 * lib/models/Notification.ts
 * In-app notification model.
 */
import mongoose, { Schema, Document, Model } from "mongoose";

export interface INotification extends Document {
  userId: string;
  type: "status_change" | "appeal_submitted" | "evidence_added" | "note_added" | "fir_filed";
  title: string;
  message: string;
  firId: string;
  read: boolean;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: { type: String, required: true, index: true },
    type: {
      type: String,
      enum: ["status_change", "appeal_submitted", "evidence_added", "note_added", "fir_filed"],
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    firId: { type: String, required: true },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const NotificationModel: Model<INotification> =
  (mongoose.models.Notification as Model<INotification>) ||
  mongoose.model<INotification>("Notification", NotificationSchema);

export default NotificationModel;
