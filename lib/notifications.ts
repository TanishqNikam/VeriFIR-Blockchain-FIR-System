/**
 * lib/notifications.ts
 * Helper to create in-app notifications. Called server-side from API routes.
 */
import { connectDB } from "@/lib/db";
import NotificationModel from "@/lib/models/Notification";

type NotificationType = "status_change" | "appeal_submitted" | "evidence_added" | "note_added" | "fir_filed";

interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  firId: string;
}

export async function createNotification(input: CreateNotificationInput): Promise<void> {
  try {
    await connectDB();
    await NotificationModel.create(input);
  } catch (err) {
    // Notification failure is non-critical — log and continue
    console.warn("[createNotification] failed:", err);
  }
}
