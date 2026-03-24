/**
 * app/api/fir/[id]/route.ts
 *
 * GET /api/fir/:id — Fetch a specific FIR, recompute its hash,
 *                    and cross-check against the on-chain record.
 * PATCH /api/fir/:id — Update FIR status (verify / reject / under-verification)
 */
import { NextResponse } from "next/server";
import crypto from "crypto";
import { connectDB } from "@/lib/db";
import FIRModel from "@/lib/models/FIR";
import UserModel from "@/lib/models/User";
import { getFIRFromChain, verifyFIROnChain, updateFIRStatusOnChain } from "@/lib/blockchain";
import { createNotification } from "@/lib/notifications";
import { sendEmail, firStatusEmail } from "@/lib/email";
import { logAudit } from "@/lib/audit";
import { emitFIRUpdate } from "@/lib/sse-emitter";

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  try {
    await connectDB();

    const fir = await FIRModel.findOne({ firId: id }).lean();
    if (!fir) {
      return NextResponse.json({ error: "FIR not found" }, { status: 404 });
    }

    // ── Recompute SHA-256 hash from original submission data ─────────────────
    // Use originalEvidenceRefs (frozen at filing) so that evidence added later
    // by citizen or police does not cause a false integrity failure.
    //
    // Migration for FIRs filed before originalEvidenceRefs existed:
    // Try each prefix of evidenceFiles (oldest-first) until one produces
    // the storedHash. Save the match so the migration only runs once.
    let evidenceRefsForHash: { name: string; cid: string }[];

    if (fir.originalEvidenceRefs && fir.originalEvidenceRefs.length > 0) {
      evidenceRefsForHash = fir.originalEvidenceRefs.map((r) => ({ name: r.name, cid: r.cid }));
    } else {
      // Auto-detect the original evidence set by trying prefixes
      const allFiles = fir.evidenceFiles ?? [];
      let found = false;
      for (let i = 0; i <= allFiles.length; i++) {
        const subset = allFiles.slice(0, i).map((f) => ({ name: f.name, cid: f.ipfsCid }));
        const testHash = crypto
          .createHash("sha256")
          .update(JSON.stringify({
            firId: fir.firId, title: fir.title, description: fir.description,
            location: fir.location, incidentDate: fir.incidentDate,
            citizenId: fir.citizenId, evidenceRefs: subset,
          }))
          .digest("hex");
        if (testHash === fir.storedHash) {
          evidenceRefsForHash = subset;
          // Persist so this migration only runs once
          await FIRModel.updateOne({ firId: fir.firId }, { $set: { originalEvidenceRefs: subset } });
          found = true;
          break;
        }
      }
      if (!found) {
        // No prefix matched — use all current files as best effort
        evidenceRefsForHash = allFiles.map((f) => ({ name: f.name, cid: f.ipfsCid }));
      }
    }

    const canonical = {
      firId: fir.firId,
      title: fir.title,
      description: fir.description,
      location: fir.location,
      incidentDate: fir.incidentDate,
      citizenId: fir.citizenId,
      evidenceRefs: evidenceRefsForHash,
    };

    const computedHash = crypto
      .createHash("sha256")
      .update(JSON.stringify(canonical))
      .digest("hex");

    const integrityVerified = computedHash === fir.storedHash;

    // ── Verify against blockchain (non-blocking) ─────────────────────────────
    // null  = blockchain node unreachable (don't show pass/fail to user)
    // true  = FIR found on-chain and hash matches
    // false = FIR found on-chain but hash does NOT match (genuine tampering signal)
    let chainData = null;
    let chainVerified: boolean | null = null;
    try {
      chainData = await getFIRFromChain(fir.firId);
      chainVerified = chainData.dataHash === fir.storedHash;
    } catch {
      // Chain unavailable — leave chainVerified as null
    }

    return NextResponse.json({
      ...fir,
      id: fir.firId,
      evidenceFiles: (fir.evidenceFiles ?? []).map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (f: any, i: number) => ({ ...f, id: `${fir.firId}-ev-${i}` })
      ),
      policeEvidenceFiles: fir.policeEvidenceFiles ?? [],
      computedHash,
      integrityVerified,
      chainData,
      chainVerified,
    });
  } catch (err) {
    console.error(`[GET /api/fir/${id}] error:`, err);
    return NextResponse.json({ error: "Failed to fetch FIR" }, { status: 500 });
  }
}

/**
 * PATCH /api/fir/:id
 * Body (JSON):
 *   { action: "under-verification" }
 *   { action: "verify", policeVerifierId, policeVerifierName, policeVerifierWallet? }
 *   { action: "reject",  policeVerifierId, policeVerifierName, rejectionReason }
 */
export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  try {
    await connectDB();

    const fir = await FIRModel.findOne({ firId: id });
    if (!fir) {
      return NextResponse.json({ error: "FIR not found" }, { status: 404 });
    }

    const body = await req.json();
    const action: string = body.action ?? "verify";

    // Helper: get citizen email for notifications
    const getCitizenEmail = async (): Promise<string | null> => {
      try {
        const user = await UserModel.findOne({ userId: fir.citizenId }).lean();
        return user?.email ?? null;
      } catch { return null; }
    };

    // ── under-verification ──────────────────────────────────────────────────
    if (action === "under-verification") {
      if (fir.status !== "pending") {
        return NextResponse.json({ status: fir.status }); // idempotent
      }
      fir.status = "under-verification";
      fir.underVerificationAt = new Date();
      await fir.save();

      // Audit log
      await logAudit({
        action: "FIR_STATUS_CHANGED",
        firId: id,
        actorId: body.policeVerifierId || "unknown",
        actorName: body.policeVerifierName || "Police Officer",
        actorRole: "police",
        fromStatus: "pending",
        toStatus: "under-verification",
      });

      // Real-time push to connected clients
      emitFIRUpdate({ firId: id, status: "under-verification", citizenId: fir.citizenId, title: fir.title });

      // On-chain status update (non-blocking)
      updateFIRStatusOnChain(id, "under-verification").catch(() => {});

      // Notify citizen
      await createNotification({
        userId: fir.citizenId,
        type: "status_change",
        title: "FIR Under Review",
        message: `Your FIR ${id} is now under review by a police officer.`,
        firId: id,
      });
      const email = await getCitizenEmail();
      if (email) {
        sendEmail({
          to: email,
          subject: `FIR ${id} — Now Under Review`,
          html: firStatusEmail({ citizenName: fir.citizenName, firId: id, status: "under-verification" }),
        });
      }

      return NextResponse.json({ success: true, firId: id, status: fir.status });
    }

    // ── reject ─────────────────────────────────────────────────────────────
    if (action === "reject") {
      if (fir.status === "verified" || fir.status === "rejected") {
        return NextResponse.json({ error: `FIR is already ${fir.status}` }, { status: 400 });
      }
      const { policeVerifierId, policeVerifierName, rejectionReason } = body;
      if (!policeVerifierId || !policeVerifierName || !rejectionReason) {
        return NextResponse.json(
          { error: "policeVerifierId, policeVerifierName and rejectionReason are required" },
          { status: 400 }
        );
      }
      const prevStatus = fir.status;
      fir.status = "rejected";
      fir.policeVerifierId = policeVerifierId;
      fir.policeVerifierName = policeVerifierName;
      fir.rejectionReason = rejectionReason;
      await fir.save();

      // Audit log
      await logAudit({
        action: "FIR_STATUS_CHANGED",
        firId: id,
        actorId: policeVerifierId,
        actorName: policeVerifierName,
        actorRole: "police",
        fromStatus: prevStatus,
        toStatus: "rejected",
        details: `Rejection reason: ${rejectionReason}`,
      });

      // Real-time push to connected clients
      emitFIRUpdate({ firId: id, status: "rejected", citizenId: fir.citizenId, title: fir.title, updatedBy: policeVerifierName });

      // On-chain status update (non-blocking)
      updateFIRStatusOnChain(id, "rejected").catch(() => {});

      // Notify citizen
      await createNotification({
        userId: fir.citizenId,
        type: "status_change",
        title: "FIR Rejected",
        message: `Your FIR ${id} has been rejected. Reason: ${rejectionReason}`,
        firId: id,
      });
      const email = await getCitizenEmail();
      if (email) {
        sendEmail({
          to: email,
          subject: `FIR ${id} — Rejected`,
          html: firStatusEmail({ citizenName: fir.citizenName, firId: id, status: "rejected", reason: rejectionReason }),
        });
      }

      return NextResponse.json({ success: true, firId: id, status: "rejected" });
    }

    // ── verify (default) ───────────────────────────────────────────────────
    if (fir.status === "verified") {
      return NextResponse.json({ error: "FIR is already verified" }, { status: 400 });
    }
    const { policeVerifierId, policeVerifierName, policeVerifierWallet } = body;
    if (!policeVerifierId || !policeVerifierName) {
      return NextResponse.json(
        { error: "policeVerifierId and policeVerifierName are required" },
        { status: 400 }
      );
    }

    let verificationTxHash: string | undefined;
    let verificationBlockNumber: number | undefined;
    try {
      const chainResult = await verifyFIROnChain(id);
      verificationTxHash = chainResult.txHash;
      verificationBlockNumber = chainResult.blockNumber;
    } catch (chainErr) {
      console.warn(`[PATCH /api/fir/${id}] blockchain verification skipped:`, (chainErr as Error).message);
    }

    const prevStatusForVerify = fir.status;
    fir.status = "verified";
    fir.policeVerifierId = policeVerifierId;
    fir.policeVerifierName = policeVerifierName;
    if (policeVerifierWallet) fir.policeVerifierWallet = policeVerifierWallet;
    if (verificationTxHash) fir.verificationTxHash = verificationTxHash;
    fir.verifiedAt = new Date();
    await fir.save();

    // Audit log
    await logAudit({
      action: "FIR_STATUS_CHANGED",
      firId: id,
      actorId: policeVerifierId,
      actorName: policeVerifierName,
      actorRole: "police",
      fromStatus: prevStatusForVerify,
      toStatus: "verified",
      details: verificationTxHash ? `Blockchain tx: ${verificationTxHash}` : "Verified (blockchain unavailable)",
    });

    // Real-time push to connected clients
    emitFIRUpdate({ firId: id, status: "verified", citizenId: fir.citizenId, title: fir.title, updatedBy: policeVerifierName });

    // Notify citizen
    await createNotification({
      userId: fir.citizenId,
      type: "status_change",
      title: "FIR Verified",
      message: `Your FIR ${id} has been verified and endorsed on the blockchain by ${policeVerifierName}.`,
      firId: id,
    });
    const email = await getCitizenEmail();
    if (email) {
      sendEmail({
        to: email,
        subject: `FIR ${id} — Verified ✓`,
        html: firStatusEmail({ citizenName: fir.citizenName, firId: id, status: "verified" }),
      });
    }

    return NextResponse.json({
      success: true,
      firId: id,
      status: "verified",
      verificationTxHash: verificationTxHash || fir.blockchainTxHash,
      verificationBlockNumber,
      verifiedAt: fir.verifiedAt,
      onChain: !!verificationTxHash,
    });
  } catch (err) {
    console.error(`[PATCH /api/fir/${id}] error:`, err);
    return NextResponse.json({ error: "Failed to update FIR" }, { status: 500 });
  }
}
