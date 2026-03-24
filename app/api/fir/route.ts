/**
 * app/api/fir/route.ts
 *
 * POST /api/fir  — Submit a new FIR
 *   Body: multipart/form-data
 *     - title        (string, required)
 *     - description  (string, required)
 *     - location     (string, required)
 *     - incidentDate (string YYYY-MM-DD, required)
 *     - citizenId    (string)
 *     - citizenName  (string)
 *     - files        (File[], optional) — actual evidence files
 *
 * GET /api/fir   — List FIRs (with optional filters)
 *   Query params: citizenId, status, page, limit
 */
import { NextResponse } from "next/server";
import crypto from "crypto";
import { connectDB } from "@/lib/db";
import FIRModel from "@/lib/models/FIR";
import { uploadFileToPinata, uploadJSONToPinata } from "@/lib/ipfs";
import { registerFIROnChain } from "@/lib/blockchain";
import { validateFiles } from "@/lib/file-validation";
import { logAudit } from "@/lib/audit";
import { emitNewFIR } from "@/lib/sse-emitter";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateFIRId(): string {
  const year = new Date().getFullYear();
  // 4 random bytes = 8 hex chars = 4.3 billion combinations; negligible collision probability
  const suffix = crypto.randomBytes(4).toString("hex").toUpperCase();
  return `FIR-${year}-${suffix}`;
}

function buildCanonicalMetadata(params: {
  firId: string;
  title: string;
  description: string;
  location: string;
  incidentDate: string;
  citizenId: string;
  evidenceRefs: { name: string; cid: string }[];
}) {
  // Canonical form: sorted keys, deterministic JSON
  return {
    firId: params.firId,
    title: params.title,
    description: params.description,
    location: params.location,
    incidentDate: params.incidentDate,
    citizenId: params.citizenId,
    evidenceRefs: params.evidenceRefs,
  };
}

// ─── POST /api/fir ────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    // ── 1. Parse FormData ──────────────────────────────────────────────────────
    const formData = await req.formData();

    const title = (formData.get("title") as string | null)?.trim();
    const description = (formData.get("description") as string | null)?.trim();
    const location = (formData.get("location") as string | null)?.trim();
    const incidentDate = (formData.get("incidentDate") as string | null)?.trim();
    const citizenId = (formData.get("citizenId") as string | null) || "citizen-001";
    const citizenName = (formData.get("citizenName") as string | null) || "Demo Citizen";

    // ── 2. Validate required fields ────────────────────────────────────────────
    if (!title || !description || !location || !incidentDate) {
      return NextResponse.json(
        { error: "Missing required fields: title, description, location, incidentDate" },
        { status: 400 }
      );
    }

    // ── 3. Validate evidence files ─────────────────────────────────────────────
    const files = formData.getAll("files") as File[];
    const nonEmptyFiles = files.filter((f) => f.size > 0);

    if (nonEmptyFiles.length > 0) {
      const validation = await validateFiles(nonEmptyFiles);
      if (!validation.ok) {
        return NextResponse.json(
          {
            error: "File validation failed",
            details: validation.errors.map((e) => `${e.file}: ${e.reason}`).join("; "),
          },
          { status: 400 }
        );
      }
    }

    // ── 4. Upload evidence files to IPFS ───────────────────────────────────────
    const evidenceFiles: {
      name: string;
      type: string;
      size: number;
      ipfsCid: string;
      uploadedAt: Date;
    }[] = [];

    for (const file of nonEmptyFiles) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const cid = await uploadFileToPinata(buffer, file.name, file.type || "application/octet-stream");
      evidenceFiles.push({
        name: file.name,
        type: file.type,
        size: file.size,
        ipfsCid: cid,
        uploadedAt: new Date(),
      });
    }

    // ── 5. Generate FIR ID ─────────────────────────────────────────────────────
    const firId = generateFIRId();

    // ── 5. Build canonical metadata & SHA-256 hash ────────────────────────────
    const canonical = buildCanonicalMetadata({
      firId,
      title,
      description,
      location,
      incidentDate,
      citizenId,
      evidenceRefs: evidenceFiles.map((f) => ({ name: f.name, cid: f.ipfsCid })),
    });

    const storedHash = crypto
      .createHash("sha256")
      .update(JSON.stringify(canonical))
      .digest("hex");

    // ── 6. Upload FIR metadata JSON to IPFS ───────────────────────────────────
    const ipfsCid = await uploadJSONToPinata(
      { ...canonical, storedHash, filedAt: new Date().toISOString() },
      `${firId}.json`
    );

    // ── 7. Register on blockchain ─────────────────────────────────────────────
    const { txHash, blockNumber } = await registerFIROnChain(
      firId,
      ipfsCid,
      storedHash
    );

    // ── 8. Persist in MongoDB ─────────────────────────────────────────────────
    await connectDB();
    // Frozen snapshot of evidence at filing time — this is what storedHash covers.
    // Never changes after creation regardless of future evidence uploads.
    const originalEvidenceRefs = evidenceFiles.map((f) => ({ name: f.name, cid: f.ipfsCid }));

    await FIRModel.create({
      firId,
      title,
      description,
      location,
      incidentDate,
      citizenId,
      citizenName,
      ipfsCid,
      blockchainTxHash: txHash,
      blockNumber,
      storedHash,
      evidenceFiles,
      originalEvidenceRefs,
      status: "pending",
    });

    // ── 9. Write audit log ────────────────────────────────────────────────────
    await logAudit({
      action: "FIR_CREATED",
      firId,
      actorId: citizenId,
      actorName: citizenName,
      actorRole: "citizen",
      toStatus: "pending",
      details: `FIR submitted with ${evidenceFiles.length} evidence file(s). IPFS CID: ${ipfsCid}`,
    });

    // ── 10. Real-time push to police/admin dashboards ─────────────────────────
    emitNewFIR({ firId, citizenId, citizenName, title });

    // ── 11. Respond ───────────────────────────────────────────────────────────
    return NextResponse.json(
      {
        firId,
        ipfsCid,
        txHash,
        blockNumber,
        storedHash,
        evidenceCount: evidenceFiles.length,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[POST /api/fir] error:", err);
    return NextResponse.json(
      {
        error: "Failed to submit FIR",
        details: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// ─── Shared mapper: MongoDB doc → frontend FIR shape ─────────────────────────
// Maps firId → id and adds stable ids to evidence files so existing page
// code (which uses fir.id and file.id) works without any changes.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapFIRDoc(doc: any) {
  return {
    ...doc,
    id: doc.firId,
    rejectionReason: doc.rejectionReason,
    verificationTxHash: doc.verificationTxHash,
    verifiedAt: doc.verifiedAt,
    evidenceFiles: (doc.evidenceFiles ?? []).map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (f: any, i: number) => ({ ...f, id: `${doc.firId}-ev-${i}` })
    ),
  };
}

// ─── GET /api/fir ─────────────────────────────────────────────────────────────

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const citizenId = searchParams.get("citizenId");
    const status = searchParams.get("status");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));

    await connectDB();

    const txHash = searchParams.get("txHash");
    const location = searchParams.get("location");
    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: Record<string, any> = {};
    if (citizenId) query.citizenId = citizenId;
    if (status) query.status = status;
    if (txHash) query.blockchainTxHash = txHash;
    if (location) query.location = { $regex: location, $options: "i" };
    if (fromDate || toDate) {
      query.filedDate = {};
      if (fromDate) query.filedDate.$gte = new Date(fromDate);
      if (toDate) query.filedDate.$lte = new Date(toDate + "T23:59:59.999Z");
    }

    const [docs, total] = await Promise.all([
      FIRModel.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      FIRModel.countDocuments(query),
    ]);

    return NextResponse.json({ firs: docs.map(mapFIRDoc), total, page, limit });
  } catch (err) {
    console.error("[GET /api/fir] error:", err);
    return NextResponse.json({ error: "Failed to fetch FIRs" }, { status: 500 });
  }
}
