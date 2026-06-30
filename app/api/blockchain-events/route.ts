/**
 * GET /api/blockchain-events
 * Returns on-chain events from the FIRRegistry contract.
 * Falls back to MongoDB-derived records when blockchain is unavailable.
 *
 * Query params:
 *   fromBlock  (number, default 0)
 *   limit      (number, default 100)
 */
import { NextResponse } from "next/server";
import { getContractEvents } from "@/lib/blockchain";
import { connectDB } from "@/lib/db";
import FIRModel from "@/lib/models/FIR";

const BLOCKCHAIN_TIMEOUT_MS = 25000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Blockchain call timed out after ${ms}ms`)), ms)
    ),
  ]);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const fromBlock = parseInt(searchParams.get("fromBlock") || "0", 10);
  const limit = Math.min(500, Math.max(1, parseInt(searchParams.get("limit") || "100", 10)));

  try {
    const events = await withTimeout(getContractEvents(fromBlock), BLOCKCHAIN_TIMEOUT_MS);
    const total = events.length;
    const sliced = [...events].reverse().slice(0, limit);
    return NextResponse.json({ events: sliced, total, source: "blockchain" });
  } catch (err) {
    console.error("[GET /api/blockchain-events] blockchain unavailable:", (err as Error).message);
  }

  // Fallback: synthesise events from all MongoDB FIR records
  try {
    await connectDB();
    const firs = await FIRModel.find({})
      .sort({ filedDate: -1 })
      .limit(limit)
      .lean();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const events: any[] = [];
    for (const fir of firs) {
      // FIRCreated event — include all FIRs regardless of tx hash state
      events.push({
        event: "FIRCreated",
        firId: fir.firId,
        txHash: fir.blockchainTxHash ?? "pending",
        blockNumber: fir.blockNumber ?? 0,
        timestamp: fir.filedDate ? Math.floor(new Date(fir.filedDate).getTime() / 1000) : undefined,
        walletAddress: fir.citizenId ?? "",
        extra: { cid: fir.ipfsCid ?? "", dataHash: fir.storedHash ?? "" },
      });
      // FIRVerified event (only if verified with a real tx hash)
      if (fir.status === "verified" && fir.verificationTxHash && fir.verificationTxHash !== "pending") {
        events.push({
          event: "FIRVerified",
          firId: fir.firId,
          txHash: fir.verificationTxHash,
          blockNumber: fir.blockNumber ?? 0,
          timestamp: fir.verifiedAt ? Math.floor(new Date(fir.verifiedAt).getTime() / 1000) : undefined,
          walletAddress: fir.policeVerifierWallet ?? fir.policeVerifierId ?? "",
        });
      }
    }

    return NextResponse.json({ events, total: events.length, source: "database" });
  } catch (dbErr) {
    console.error("[GET /api/blockchain-events] database fallback failed:", (dbErr as Error).message);
    return NextResponse.json(
      { events: [], total: 0, source: "unavailable", error: "Blockchain and database both unreachable" },
      { status: 200 }
    );
  }
}
