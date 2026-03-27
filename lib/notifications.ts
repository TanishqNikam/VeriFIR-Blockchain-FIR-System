/**
 * lib/notifications.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Server-side helper to create in-app notifications.
 * Called from API routes after status changes, evidence uploads, etc.
 *
 * Notifications are stored in MongoDB and polled / streamed to the client.
 * Failure is intentionally non-fatal — a notification glitch should never
 * prevent the primary operation (FIR creation, verification, etc.) from
 * completing successfully.
 */
import { connectDB } from "@/lib/db";
import NotificationModel from "@/lib/models/Notification";

/** The set of events that can trigger a notification */
type NotificationType =
  | "status_change"      // FIR moved to a new status
  | "appeal_submitted"   // Citizen re-submitted a rejected FIR
  | "evidence_added"     // New files uploaded to an FIR
  | "note_added"         // Police added an internal note
  | "fir_filed";         // New FIR created (for admin dashboards)

interface CreateNotificationInput {
  /** The user who will see this notification in their inbox */
  userId: string;
  type: NotificationType;
  /** Short heading shown in the notification list */
  title: string;
  /** Full detail message */
  message: string;
  /** Related FIR ID for deep-linking */
  firId: string;
}

/**
 * Create a single in-app notification record in MongoDB.
 * Never throws — errors are caught and logged so callers can use `.catch(() => {})`.
 */
export async function createNotification(input: CreateNotificationInput): Promise<void> {
  try {
    await connectDB();
    await NotificationModel.create(input);
  } catch (err) {
    // Notification failure is non-critical — log and continue
    console.warn("[createNotification] failed:", err);
  }
}
