/**
 * GET /api/blockchain-stats
 * Returns on-chain registry statistics:
 *   - firCount: total FIRs registered on the smart contract
 *   - recentEvents: last N contract events (for the admin dashboard preview)
 */
import { NextResponse } from "next/server";
import { getFIRCount, getContractEvents } from "@/lib/blockchain";
import { connectDB } from "@/lib/db";
import FIRModel from "@/lib/models/FIR";

const BLOCKCHAIN_TIMEOUT_MS = 7000;

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
  const limit = Math.min(Number(searchParams.get("limit") ?? "5"), 20);

  try {
    const [firCount, allEvents] = await Promise.all([
      withTimeout(getFIRCount(), BLOCKCHAIN_TIMEOUT_MS),
      withTimeout(getContractEvents(0), BLOCKCHAIN_TIMEOUT_MS),
    ]);

    const recentEvents = allEvents.slice(-limit).reverse();

    return NextResponse.json({
      firCount,
      recentEvents,
      source: "blockchain",
    });
  } catch (err) {
    console.warn("[GET /api/blockchain-stats] blockchain unavailable:", (err as Error).message);
  }

  // Fallback: derive stats from MongoDB
  try {
    await connectDB();
    const [totalCount, recentFirs] = await Promise.all([
      FIRModel.countDocuments({}),
      FIRModel.find({}).sort({ filedDate: -1 }).limit(limit).lean(),
    ]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recentEvents: any[] = recentFirs.map((fir) => ({
      event: "FIRCreated",
      firId: fir.firId,
      txHash: fir.blockchainTxHash ?? "pending",
      blockNumber: fir.blockNumber ?? 0,
      timestamp: fir.filedDate ? Math.floor(new Date(fir.filedDate).getTime() / 1000) : undefined,
      walletAddress: fir.citizenId ?? "",
    }));

    return NextResponse.json({
      firCount: totalCount,
      recentEvents,
      source: "database",
    });
  } catch (dbErr) {
    console.error("[GET /api/blockchain-stats] database fallback failed:", (dbErr as Error).message);
    return NextResponse.json({
      firCount: null,
      recentEvents: [],
      source: "unavailable",
    });
  }
}
