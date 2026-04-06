/**
 * POST /api/admin/retry-blockchain
 * Admin-only endpoint to retry blockchain registration for FIRs
 * whose blockchainTxHash is still "pending" due to a prior failure.
 *
 * Body: { firId: string }  — retry a specific FIR
 * Body: {}                 — retry ALL pending FIRs (up to 20 at a time)
 */
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import FIRModel from "@/lib/models/FIR";
import { registerFIROnChain } from "@/lib/blockchain";
import { requireSession, isAuthError } from "@/lib/api-auth";

export async function POST(req: Request) {
  const auth = await requireSession(["admin"]);
  if (isAuthError(auth)) return auth;

  try {
    await connectDB();
    const body = await req.json().catch(() => ({}));
    const specificFirId: string | undefined = body.firId;

    const query = specificFirId
      ? { firId: specificFirId, blockchainTxHash: "pending" }
      : { blockchainTxHash: "pending" };

    const pendingFIRs = await FIRModel.find(query).limit(20).lean();

    if (pendingFIRs.length === 0) {
      return NextResponse.json({ message: "No pending FIRs found.", retried: 0, succeeded: 0, failed: 0 });
    }

    let succeeded = 0;
    let failed = 0;
    const results: { firId: string; status: string; txHash?: string; error?: string }[] = [];

    for (const fir of pendingFIRs) {
      try {
        const result = await registerFIROnChain(fir.firId, fir.ipfsCid, fir.storedHash, "citizen");
        await FIRModel.updateOne(
          { firId: fir.firId },
          { $set: { blockchainTxHash: result.txHash, blockNumber: result.blockNumber } }
        );
        succeeded++;
        results.push({ firId: fir.firId, status: "success", txHash: result.txHash });
      } catch (err) {
        failed++;
        results.push({ firId: fir.firId, status: "failed", error: (err as Error).message });
      }
    }

    return NextResponse.json({
      message: `Retried ${pendingFIRs.length} FIR(s). ${succeeded} succeeded, ${failed} failed.`,
      retried: pendingFIRs.length,
      succeeded,
      failed,
      results,
    });
  } catch (err) {
    console.error("[POST /api/admin/retry-blockchain] error:", err);
    return NextResponse.json({ error: "Failed to retry blockchain registration" }, { status: 500 });
  }
}
