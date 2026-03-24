/**
 * GET /api/blockchain-events
 * Returns real on-chain events from the FIRRegistry contract.
 * Falls back to an empty array if the blockchain is unavailable.
 *
 * Query params:
 *   fromBlock  (number, default 0)
 *   limit      (number, default 100)
 */
import { NextResponse } from "next/server";
import { getContractEvents } from "@/lib/blockchain";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const fromBlock = parseInt(searchParams.get("fromBlock") || "0", 10);
  const limit = Math.min(500, Math.max(1, parseInt(searchParams.get("limit") || "100", 10)));

  try {
    const events = await getContractEvents(fromBlock);
    // Newest first, limited
    const sliced = events.reverse().slice(0, limit);
    return NextResponse.json({ events: sliced, total: events.length, source: "blockchain" });
  } catch (err) {
    console.error("[GET /api/blockchain-events] blockchain unavailable:", (err as Error).message);
    // Return empty rather than 500 so the UI can show a graceful fallback
    return NextResponse.json(
      { events: [], total: 0, source: "unavailable", error: "Blockchain node unreachable" },
      { status: 200 }
    );
  }
}
