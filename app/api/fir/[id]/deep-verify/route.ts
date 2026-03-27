/**
 * GET /api/fir/:id/deep-verify
 *
 * IPFS Deep Verification — the gold-standard integrity check:
 *   1. Fetch the FIR metadata JSON from IPFS (via Pinata gateway) using the stored CID
 *   2. Recompute SHA-256 hash from the fetched data
 *   3. Compare the recomputed hash against the on-chain dataHash
 *
 * This proves the FIR data stored on IPFS has not been tampered with,
 * independently of the MongoDB database.
 *
 * Response:
 *   { ipfsFetched, ipfsHash, chainHash, deepVerified, firId, ipfsCid, source }
 */
import { NextResponse } from "next/server";
import crypto from "crypto";
import { connectDB } from "@/lib/db";
import FIRModel from "@/lib/models/FIR";
import { getFIRFromChain } from "@/lib/blockchain";

/** Ordered list of IPFS gateways — tried in sequence until one succeeds */
const IPFS_GATEWAYS = [
  "https://gateway.pinata.cloud/ipfs",
  "https://cloudflare-ipfs.com/ipfs",
  "https://ipfs.io/ipfs",
  "https://dweb.link/ipfs",
];

/**
 * Attempt to fetch a JSON document from IPFS, trying each gateway in order.
 * Returns the parsed data and the gateway that succeeded, or null if all fail.
 */
async function fetchFromIPFS(
  cid: string
): Promise<{ data: Record<string, unknown>; gateway: string } | null> {
  for (const gateway of IPFS_GATEWAYS) {
    try {
      const res = await fetch(`${gateway}/${cid}`, {
        signal: AbortSignal.timeout(10_000),
      });
      if (res.ok) {
        const data = (await res.json()) as Record<string, unknown>;
        return { data, gateway };
      }
    } catch {
      // Try next gateway
    }
  }
  return null;
}

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

    const ipfsCid = fir.ipfsCid as string | undefined;
    if (!ipfsCid) {
      return NextResponse.json(
        { error: "No IPFS CID stored for this FIR" },
        { status: 400 }
      );
    }

    // ── Step 1: Fetch from IPFS (with gateway fallback) ───────────────────────
    let ipfsData: Record<string, unknown> | null = null;
    let ipfsFetched = false;
    let ipfsSource: string | null = null;

    const ipfsResult = await fetchFromIPFS(ipfsCid);
    if (ipfsResult) {
      ipfsData = ipfsResult.data;
      ipfsFetched = true;
      ipfsSource = ipfsResult.gateway;
    }

    // ── Step 2: Recompute hash from IPFS data ─────────────────────────────────
    let ipfsHash: string | null = null;
    if (ipfsData) {
      ipfsHash = crypto
        .createHash("sha256")
        .update(JSON.stringify(ipfsData))
        .digest("hex");
    }

    // ── Step 3: Get on-chain hash ─────────────────────────────────────────────
    let chainHash: string | null = null;
    try {
      const chainData = await getFIRFromChain(id);
      chainHash = chainData.dataHash;
    } catch {
      // Blockchain node unreachable
    }

    // ── Step 4: Compare ───────────────────────────────────────────────────────
    const deepVerified =
      ipfsHash !== null && chainHash !== null && ipfsHash === chainHash;

    return NextResponse.json({
      firId: id,
      ipfsCid,
      ipfsFetched,
      ipfsHash,
      chainHash,
      dbStoredHash: fir.storedHash,
      deepVerified,
      // deepVerified = null when we couldn't fetch from IPFS or chain
      canVerify: ipfsFetched && chainHash !== null,
      ipfsSource, // which gateway responded
    });
  } catch (err) {
    console.error(`[GET /api/fir/${id}/deep-verify] error:`, err);
    return NextResponse.json(
      { error: "Deep verification failed" },
      { status: 500 }
    );
  }
}
