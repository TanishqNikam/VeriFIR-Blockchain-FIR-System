/**
 * app/api/health/route.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * FAILSAFE — HEALTH CHECK ENDPOINT
 *
 * GET /api/health
 *
 * Actively checks every critical service the application depends on and
 * returns a clear status for each. If any service is down, the overall
 * status is "degraded" (not "error") because VeriFIR has failsafes for
 * each service — the app continues to function in a reduced capacity.
 *
 * Example response:
 * {
 *   "status": "degraded",
 *   "services": {
 *     "database":   { "status": "ok",      "latencyMs": 12  },
 *     "blockchain": { "status": "down",    "error": "..."   },
 *     "ipfs":       { "status": "ok",      "latencyMs": 203 }
 *   },
 *   "timestamp": "2025-06-29T10:00:00.000Z"
 * }
 */
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import mongoose from "mongoose";
import { ethers } from "ethers";
import axios from "axios";

type ServiceStatus = { status: "ok"; latencyMs: number } | { status: "down"; error: string };

async function checkDatabase(): Promise<ServiceStatus> {
  const start = Date.now();
  try {
    await connectDB();
    // Ping the database to confirm the connection is truly live
    await mongoose.connection.db!.admin().ping();
    return { status: "ok", latencyMs: Date.now() - start };
  } catch (err) {
    return { status: "down", error: err instanceof Error ? err.message : "Unknown error" };
  }
}

async function checkBlockchain(): Promise<ServiceStatus> {
  const start = Date.now();
  try {
    const rpcUrl = process.env.RPC_URL || "http://127.0.0.1:8545";
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    // getBlockNumber is the lightest possible read call
    await provider.getBlockNumber();
    return { status: "ok", latencyMs: Date.now() - start };
  } catch (err) {
    return { status: "down", error: err instanceof Error ? err.message : "Unknown error" };
  }
}

async function checkIPFS(): Promise<ServiceStatus> {
  const start = Date.now();
  try {
    // Pinata's /data/testAuthentication endpoint verifies keys without uploading anything
    await axios.get("https://api.pinata.cloud/data/testAuthentication", {
      headers: {
        pinata_api_key: process.env.PINATA_API_KEY!,
        pinata_secret_api_key: process.env.PINATA_SECRET_KEY!,
      },
      timeout: 8_000,
    });
    return { status: "ok", latencyMs: Date.now() - start };
  } catch (err) {
    return { status: "down", error: err instanceof Error ? err.message : "Unknown error" };
  }
}

export async function GET() {
  const [database, blockchain, ipfs] = await Promise.all([
    checkDatabase(),
    checkBlockchain(),
    checkIPFS(),
  ]);

  const services = { database, blockchain, ipfs };

  // "ok" only if every service is up; "degraded" if any are down (not a crash —
  // the app has per-service failsafes and continues running in reduced capacity)
  const allOk = Object.values(services).every((s) => s.status === "ok");
  const overallStatus = allOk ? "ok" : "degraded";

  return NextResponse.json(
    { status: overallStatus, services, timestamp: new Date().toISOString() },
    { status: allOk ? 200 : 207 } // 207 Multi-Status — partial success
  );
}
