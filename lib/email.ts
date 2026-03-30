/**
 * lib/email.ts
 * Nodemailer email utility for status-change notifications.
 *
 * Required env vars (add to .env.local):
 *   SMTP_HOST=smtp.gmail.com
 *   SMTP_PORT=587
 *   SMTP_USER=your@gmail.com
 *   SMTP_PASS=your-app-password
 *   EMAIL_FROM="VeriFIR <noreply@verifir.in>"
 */
import nodemailer from "nodemailer";

function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "587");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null; // email not configured — silently skip
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(payload: EmailPayload): Promise<void> {
  const transporter = getTransporter();
  if (!transporter) return; // SMTP not configured

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || "VeriFIR <noreply@verifir.in>",
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
    });
  } catch (err) {
    // Email failure is non-critical — log and continue
    console.warn("[sendEmail] failed:", err);
  }
}

// ── Pre-built templates ────────────────────────────────────────────────────────

export function otpEmail(opts: { name: string; otp: string }): string {
  return `
    <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; background: #f9fafb; border-radius: 8px;">
      <div style="background: #1e293b; padding: 16px 24px; border-radius: 6px 6px 0 0;">
        <h1 style="color: #f8fafc; font-size: 18px; margin: 0;">VeriFIR — Verify Your Email</h1>
      </div>
      <div style="background: #fff; padding: 24px; border-radius: 0 0 6px 6px; border: 1px solid #e2e8f0;">
        <p style="color: #374151;">Hi <strong>${opts.name}</strong>,</p>
        <p style="color: #374151;">Use the OTP below to verify your email address. It expires in <strong>15 minutes</strong>.</p>
        <div style="margin: 24px 0; text-align: center;">
          <span style="display: inline-block; font-size: 36px; font-weight: 700; letter-spacing: 10px; color: #1e293b; background: #f1f5f9; padding: 16px 32px; border-radius: 8px; border: 2px dashed #cbd5e1;">${opts.otp}</span>
        </div>
        <p style="color: #6b7280; font-size: 13px;">If you did not create a VeriFIR account, please ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="color: #9ca3af; font-size: 12px; margin: 0;">This is an automated notification from VeriFIR. Do not reply to this email.</p>
      </div>
    </div>
  `;
}

export function firStatusEmail(opts: {
  citizenName: string;
  firId: string;
  status: string;
  reason?: string;
}): string {
  const statusLabel: Record<string, string> = {
    "under-verification": "Under Review",
    verified: "Verified ✓",
    rejected: "Rejected",
    pending: "Pending",
  };

  const statusColor: Record<string, string> = {
    "under-verification": "#2563eb",
    verified: "#16a34a",
    rejected: "#dc2626",
    pending: "#d97706",
  };

  const color = statusColor[opts.status] || "#6b7280";
  const label = statusLabel[opts.status] || opts.status;

  return `
    <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; background: #f9fafb; border-radius: 8px;">
      <div style="background: #1e293b; padding: 16px 24px; border-radius: 6px 6px 0 0;">
        <h1 style="color: #f8fafc; font-size: 18px; margin: 0;">VeriFIR — FIR Status Update</h1>
      </div>
      <div style="background: #fff; padding: 24px; border-radius: 0 0 6px 6px; border: 1px solid #e2e8f0;">
        <p style="color: #374151;">Dear <strong>${opts.citizenName}</strong>,</p>
        <p style="color: #374151;">Your FIR <code style="background:#f1f5f9;padding:2px 6px;border-radius:4px;">${opts.firId}</code> status has been updated.</p>
        <div style="margin: 20px 0; padding: 12px 16px; border-left: 4px solid ${color}; background: #f8fafc; border-radius: 0 4px 4px 0;">
          <p style="margin: 0; font-size: 16px; font-weight: 600; color: ${color};">Status: ${label}</p>
          ${opts.reason ? `<p style="margin: 8px 0 0; color: #6b7280; font-size: 14px;">${opts.reason}</p>` : ""}
        </div>
        <p style="color: #6b7280; font-size: 13px;">Log in to your VeriFIR dashboard to view full details and take any required actions.</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="color: #9ca3af; font-size: 12px; margin: 0;">This is an automated notification from VeriFIR. Do not reply to this email.</p>
      </div>
    </div>
  `;
}
