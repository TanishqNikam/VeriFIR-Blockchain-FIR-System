/**
 * GET /api/blockchain-stats
 * Returns on-chain registry statistics:
 *   - firCount: total FIRs registered on the smart contract
 *   - recentEvents: last N contract events (for the admin dashboard preview)
 */
import { NextResponse } from "next/server";
import { getFIRCount, getContractEvents } from "@/lib/blockchain";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get("limit") ?? "5"), 20);

  try {
    const [firCount, allEvents] = await Promise.all([
      getFIRCount(),
      getContractEvents(0),
    ]);

    // Return the most recent N events (already sorted oldest-first, so take from end)
    const recentEvents = allEvents.slice(-limit).reverse();

    return NextResponse.json({
      firCount,
      recentEvents,
      source: "blockchain",
    });
  } catch (err) {
    console.warn("[GET /api/blockchain-stats] blockchain unavailable:", (err as Error).message);
    return NextResponse.json({
      firCount: null,
      recentEvents: [],
      source: "unavailable",
    });
  }
}
