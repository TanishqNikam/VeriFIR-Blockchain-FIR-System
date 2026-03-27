/**
 * POST /api/fir/:id/appeal
 * Citizen appeals a rejected FIR, resetting it to pending with an appeal reason.
 * The appeal is anchored on-chain using the citizen signer.
 * Body: { reason }
 */
import { NextResponse } from "next/server";
import crypto from "crypto";
import { connectDB } from "@/lib/db";
import FIRModel from "@/lib/models/FIR";
import { createNotification } from "@/lib/notifications";
import { updateFIRStatusOnChain } from "@/lib/blockchain";
import { requireSession, isAuthError } from "@/lib/api-auth";
import { logAudit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Ctx) {
  // Only the citizen who owns the FIR can appeal
  const auth = await requireSession(["citizen"]);
  if (isAuthError(auth)) return auth;
  const { session } = auth;

  const { id } = await params;
  try {
    const { reason } = await req.json();
    if (!reason?.trim()) {
      return NextResponse.json({ error: "Appeal reason is required" }, { status: 400 });
    }

    await connectDB();
    const fir = await FIRModel.findOne({ firId: id });
    if (!fir) return NextResponse.json({ error: "FIR not found" }, { status: 404 });

    // Ensure only the citizen who filed the FIR can appeal it
    if (fir.citizenId !== session.userId) {
      return NextResponse.json({ error: "You can only appeal your own FIRs" }, { status: 403 });
    }
    if (fir.status !== "rejected") {
      return NextResponse.json({ error: "Only rejected FIRs can be appealed" }, { status: 400 });
    }

    fir.status = "pending";
    fir.appealReason = reason.trim();
    fir.appealedAt = new Date();
    fir.isAppeal = true;
    fir.rejectionReason = undefined;
    fir.policeVerifierId = undefined;
    fir.policeVerifierName = undefined;
    await fir.save();

    // ── On-chain anchor — use citizen signer ─────────────────────────────────
    // Format: "appealed:{sha256(reason).slice(0,16)}" so auditors can verify appeal reason
    const appealFingerprint = crypto
      .createHash("sha256")
      .update(reason.trim())
      .digest("hex")
      .slice(0, 16);
    updateFIRStatusOnChain(id, `appealed:${appealFingerprint}`, "citizen").catch(() => {});

    // ── Audit log ─────────────────────────────────────────────────────────────
    logAudit({
      action: "FIR_STATUS_CHANGED",
      firId: id,
      actorId: session.userId,
      actorName: session.name,
      actorRole: "citizen",
      fromStatus: "rejected",
      toStatus: "pending",
      details: `Citizen appeal submitted. Reason fingerprint: ${appealFingerprint}`,
    }).catch(() => {});

    createNotification({
      userId: fir.citizenId,
      type: "appeal_submitted",
      title: "Appeal Submitted",
      message: `Your appeal for FIR ${id} has been submitted and is pending review.`,
      firId: id,
    });

    return NextResponse.json({ success: true, firId: id, status: "pending", isAppeal: true });
  } catch (err) {
    console.error(`[POST /api/fir/${id}/appeal]`, err);
    return NextResponse.json({ error: "Failed to submit appeal" }, { status: 500 });
  }
}
