/**
 * POST /api/fir/:id/appeal
 * Citizen appeals a rejected FIR, resetting it to pending with an appeal reason.
 * Body: { reason }
 */
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import FIRModel from "@/lib/models/FIR";
import { createNotification } from "@/lib/notifications";
import { updateFIRStatusOnChain } from "@/lib/blockchain";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Ctx) {
  const { id } = await params;
  try {
    const { reason } = await req.json();
    if (!reason?.trim()) {
      return NextResponse.json({ error: "Appeal reason is required" }, { status: 400 });
    }

    await connectDB();
    const fir = await FIRModel.findOne({ firId: id });
    if (!fir) return NextResponse.json({ error: "FIR not found" }, { status: 404 });
    if (fir.status !== "rejected") {
      return NextResponse.json({ error: "Only rejected FIRs can be appealed" }, { status: 400 });
    }

    fir.status = "pending";
    fir.appealReason = reason.trim();
    fir.appealedAt = new Date();
    fir.isAppeal = true;
    // Clear rejection so it is reviewed fresh
    fir.rejectionReason = undefined;
    fir.policeVerifierId = undefined;
    fir.policeVerifierName = undefined;
    await fir.save();

    // On-chain status + notifications (non-blocking)
    updateFIRStatusOnChain(id, "pending").catch(() => {});
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
