/**
 * app/api/fir/route.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * POST /api/fir  — Submit a new FIR (requires citizen session)
 * GET  /api/fir  — List FIRs (role-scoped by session):
 *   - citizen → only their own FIRs   (enforced by session.userId)
 *   - police  → only FIRs whose pincode matches the officer's jurisdiction
 *   - admin   → all FIRs with optional filters
 *   - public  → txHash lookup only (no session needed, used on verify page)
 *
 * FIR CREATION PIPELINE:
 *   1. Validate inputs and uploaded files (magic-byte check)
 *   2. Upload evidence files to IPFS (Pinata) → get CIDs
 *   3. Generate a collision-safe FIR ID (retry loop checks MongoDB)
 *   4. Build canonical metadata and compute SHA-256 integrity hash
 *   5. Upload FIR metadata JSON to IPFS
 *   6. Save to MongoDB immediately (so the FIR exists even if chain is slow)
 *   7. Register on blockchain asynchronously (non-blocking)
 *   8. Return FIR details to the citizen
 *
 * INTEGRITY MODEL:
 *   The SHA-256 hash covers: firId, title, description, location, incidentDate,
 *   citizenId, and the IPFS CIDs of evidence files at the time of filing.
 *   It is stored in MongoDB AND anchored on-chain so any tampering is detectable.
 *   Evidence added AFTER filing (by citizen or police) does NOT affect this hash.
 */
import { NextResponse } from "next/server";
import crypto from "crypto";
import { connectDB } from "@/lib/db";
import FIRModel from "@/lib/models/FIR";
import UserModel from "@/lib/models/User";
import { uploadFileToPinata, uploadJSONToPinata } from "@/lib/ipfs";
import { registerFIROnChain } from "@/lib/blockchain";
import { validateFiles } from "@/lib/file-validation";
import { logAudit } from "@/lib/audit";
import { emitNewFIR } from "@/lib/sse-emitter";
import { rateLimit } from "@/lib/rate-limit";
import { requireSession, getSession, isAuthError } from "@/lib/api-auth";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Generate a unique FIR ID.
 * Retries up to 5 times if a collision is detected in MongoDB.
 */
async function generateUniqueFIRId(): Promise<string> {
  const year = new Date().getFullYear();
  for (let attempt = 0; attempt < 5; attempt++) {
    const suffix = crypto.randomBytes(4).toString("hex").toUpperCase();
    const firId = `FIR-${year}-${suffix}`;
    const existing = await FIRModel.exists({ firId });
    if (!existing) return firId;
  }
  // Extremely unlikely — fall back to timestamp-based ID
  return `FIR-${year}-${Date.now().toString(16).toUpperCase()}`;
}

/**
 * Assemble the canonical FIR metadata object whose JSON is SHA-256 hashed.
 *
 * Field selection is deliberate:
 *   ✓ firId, title, description, location, incidentDate, citizenId
 *       — the core facts of the FIR that must never change
 *   ✓ evidenceRefs (name + IPFS CID of each file at filing time)
 *       — ensures the original evidence is tied to the hash
 *   ✗ status, policeVerifierId, blockchainTxHash, notes, etc.
 *       — these are mutable metadata that legitimately change over time
 *
 * The output is JSON-serialised deterministically and SHA-256 hashed.
 * The same function is called when verifying integrity (GET /api/fir/:id).
 */
function buildCanonicalMetadata(params: {
  firId: string;
  title: string;
  description: string;
  location: string;
  incidentDate: string;
  citizenId: string;
  evidenceRefs: { name: string; cid: string }[];
}) {
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
  // ── Auth check ─────────────────────────────────────────────────────────────
  const auth = await requireSession(["citizen"]);
  if (isAuthError(auth)) return auth;
  const { session } = auth;

  // ── Rate limit: 5 FIRs per hour per citizen ────────────────────────────────
  const rl = rateLimit(`fir:${session.userId}`, 5, 60 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many FIRs submitted. Please wait before submitting another." },
      { status: 429 }
    );
  }

  try {
    await connectDB();

    // ── 1. Parse FormData ────────────────────────────────────────────────────
    const formData = await req.formData();
    const title       = (formData.get("title") as string | null)?.trim();
    const description = (formData.get("description") as string | null)?.trim();
    const location    = (formData.get("location") as string | null)?.trim();
    const incidentDate = (formData.get("incidentDate") as string | null)?.trim();
    const pincode     = (formData.get("pincode") as string | null)?.trim();

    // Extended NCRB I.I.F.-I fields (all optional — backward compatible)
    const district        = (formData.get("district") as string | null)?.trim() || undefined;
    const policeStation   = (formData.get("policeStation") as string | null)?.trim() || undefined;
    const incidentDateTo  = (formData.get("incidentDateTo") as string | null)?.trim() || undefined;
    const incidentTimeFrom = (formData.get("incidentTimeFrom") as string | null)?.trim() || undefined;
    const incidentTimeTo  = (formData.get("incidentTimeTo") as string | null)?.trim() || undefined;
    const typeOfInformation = (formData.get("typeOfInformation") as string | null)?.trim() || undefined;
    const placeAddress    = (formData.get("placeAddress") as string | null)?.trim() || undefined;
    const distanceFromPS  = (formData.get("distanceFromPS") as string | null)?.trim() || undefined;
    const beatNo          = (formData.get("beatNo") as string | null)?.trim() || undefined;
    const delayReason     = (formData.get("delayReason") as string | null)?.trim() || undefined;
    const totalPropertyValueRaw = formData.get("totalPropertyValue");
    const totalPropertyValue = totalPropertyValueRaw ? Number(totalPropertyValueRaw) : undefined;
    const firstInformationContents = (formData.get("firstInformationContents") as string | null)?.trim() || undefined;
    // JSON-encoded sub-arrays: acts, accusedDetails, propertyDetails, complainantDetails
    let acts, accusedDetails, propertyDetails, complainantDetails;
    try { acts = JSON.parse((formData.get("acts") as string) || "null") ?? undefined; } catch { acts = undefined; }
    try { accusedDetails = JSON.parse((formData.get("accusedDetails") as string) || "null") ?? undefined; } catch { accusedDetails = undefined; }
    try { propertyDetails = JSON.parse((formData.get("propertyDetails") as string) || "null") ?? undefined; } catch { propertyDetails = undefined; }
    try { complainantDetails = JSON.parse((formData.get("complainantDetails") as string) || "null") ?? undefined; } catch { complainantDetails = undefined; }

    // Use session identity — never trust client-supplied citizenId
    const citizenId   = session.userId;
    const citizenName = session.name;

    // ── 2. Validate required fields ──────────────────────────────────────────
    if (!title || !description || !location || !incidentDate) {
      return NextResponse.json(
        { error: "Missing required fields: title, description, location, incidentDate" },
        { status: 400 }
      );
    }
    if (!pincode || !/^\d{6}$/.test(pincode)) {
      return NextResponse.json(
        { error: "A valid 6-digit area pincode is required" },
        { status: 400 }
      );
    }

    // ── 3. Validate evidence files ───────────────────────────────────────────
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

    // ── 4. Upload evidence to IPFS ───────────────────────────────────────────
    const evidenceFiles: {
      name: string; type: string; size: number; ipfsCid: string; uploadedAt: Date;
    }[] = [];
    for (const file of nonEmptyFiles) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const cid = await uploadFileToPinata(buffer, file.name, file.type || "application/octet-stream");
      evidenceFiles.push({ name: file.name, type: file.type, size: file.size, ipfsCid: cid, uploadedAt: new Date() });
    }

    // ── 5. Generate collision-safe FIR ID ────────────────────────────────────
    const firId = await generateUniqueFIRId();

    // ── 6. Build canonical metadata + SHA-256 hash ───────────────────────────
    const canonical = buildCanonicalMetadata({
      firId, title, description, location, incidentDate, citizenId,
      evidenceRefs: evidenceFiles.map((f) => ({ name: f.name, cid: f.ipfsCid })),
    });
    const storedHash = crypto.createHash("sha256").update(JSON.stringify(canonical)).digest("hex");

    // ── 7. Upload FIR metadata JSON to IPFS ─────────────────────────────────
    // The storedHash only covers the canonical fields (core FIR facts).
    // Extended NCRB fields are included in the IPFS document for full transparency
    // and archival completeness, but they don't affect the integrity hash.
    const ipfsCid = await uploadJSONToPinata(
      {
        ...canonical,
        storedHash,
        filedAt: new Date().toISOString(),
        // Extended NCRB I.I.F.-I fields stored for archival (not hashed)
        district, policeStation, acts, incidentDateTo, incidentTimeFrom, incidentTimeTo,
        typeOfInformation, placeAddress, distanceFromPS, beatNo,
        complainantDetails, accusedDetails, delayReason, propertyDetails,
        totalPropertyValue, firstInformationContents,
      },
      `${firId}.json`
    );

    // ── 8. Save to MongoDB FIRST (decoupled from blockchain) ─────────────────
    // FIR is created immediately; blockchain registration runs async.
    // This prevents IPFS-uploaded data from being orphaned if the chain is slow.
    const originalEvidenceRefs = evidenceFiles.map((f) => ({ name: f.name, cid: f.ipfsCid }));

    const createdFIR = await FIRModel.create({
      firId, title, description, location, incidentDate, citizenId, citizenName,
      pincode,
      ipfsCid,
      blockchainTxHash: "pending",  // placeholder until async registration completes
      blockNumber: 0,
      storedHash,
      evidenceFiles,
      originalEvidenceRefs,
      status: "pending",
      // Extended NCRB I.I.F.-I fields
      district, policeStation, acts, incidentDateTo, incidentTimeFrom, incidentTimeTo,
      typeOfInformation, placeAddress, distanceFromPS, beatNo,
      complainantDetails, accusedDetails, delayReason, propertyDetails,
      totalPropertyValue, firstInformationContents,
    });

    // ── 9. Register on blockchain (non-blocking) ─────────────────────────────
    // Blockchain failure no longer crashes FIR creation.
    let txHash = "pending";
    let blockNumber = 0;
    registerFIROnChain(firId, ipfsCid, storedHash, "citizen")
      .then(async (result) => {
        txHash = result.txHash;
        blockNumber = result.blockNumber;
        await FIRModel.updateOne(
          { firId },
          { $set: { blockchainTxHash: result.txHash, blockNumber: result.blockNumber } }
        );
      })
      .catch((err) => {
        console.warn(`[POST /api/fir] Blockchain registration failed for ${firId}:`, err.message);
      });

    // ── 10. Audit log ─────────────────────────────────────────────────────────
    logAudit({
      action: "FIR_CREATED",
      firId,
      actorId: citizenId,
      actorName: citizenName,
      actorRole: "citizen",
      toStatus: "pending",
      details: `FIR filed for pincode ${pincode} with ${evidenceFiles.length} evidence file(s). IPFS CID: ${ipfsCid}`,
    }).catch(() => {});

    // ── 11. Real-time push ────────────────────────────────────────────────────
    emitNewFIR({ firId, citizenId, citizenName, title });

    return NextResponse.json(
      { firId, ipfsCid, txHash: createdFIR.blockchainTxHash, blockNumber: createdFIR.blockNumber, storedHash, evidenceCount: evidenceFiles.length },
      { status: 201 }
    );
  } catch (err) {
    console.error("[POST /api/fir] error:", err);
    return NextResponse.json(
      { error: "Failed to submit FIR", details: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// ─── Shared mapper ────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapFIRDoc(doc: any) {
  return {
    ...doc,
    id: doc.firId,
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
    const txHash   = searchParams.get("txHash");
    const status   = searchParams.get("status");
    const location = searchParams.get("location");
    const fromDate = searchParams.get("fromDate");
    const toDate   = searchParams.get("toDate");
    const page  = Math.max(1, parseInt(searchParams.get("page")  || "1",  10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));

    await connectDB();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: Record<string, any> = {};

    // Public txHash lookup — no auth required (used by verify pages)
    if (txHash) {
      query.blockchainTxHash = txHash;
    } else {
      // All other queries require a valid session
      const session = await getSession();
      if (!session) {
        return NextResponse.json({ error: "Authentication required" }, { status: 401 });
      }

      if (session.role === "citizen") {
        // Citizens see only their own FIRs.
        // This is enforced server-side using the verified session — the client
        // cannot spoof another citizen's userId.
        query.citizenId = session.userId;
      } else if (session.role === "police") {
        // Jurisdiction-based filtering: each officer is assigned a 6-digit
        // pincode when their account is created by an admin. FIRs filed for
        // that pincode area are automatically routed to the matching officer.
        // This simulates how Indian police stations have territorial jurisdiction.
        //
        // IMPORTANT: Always fetch the pincode fresh from the DB rather than
        // trusting the session cookie. The cookie is minted at login and may
        // carry a stale pincode if an admin updated the officer's jurisdiction
        // after the last login (the cookie contains a snapshot, not a live ref).
        const officerDoc = await UserModel.findOne({ userId: session.userId }).lean();
        const officerPincode = officerDoc?.pincode;
        if (!officerPincode) {
          return NextResponse.json(
            { error: "Your account has no pincode assigned. Contact admin." },
            { status: 403 }
          );
        }
        query.pincode = officerPincode;
      }
      // admin: no additional filter — sees all FIRs across all pincodes
    }

    if (status) query.status = status;
    if (location) {
      // Escape special regex characters to prevent ReDoS / regex injection.
      // A raw user-supplied string could otherwise craft catastrophic patterns.
      const escaped = location.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      query.location = { $regex: escaped, $options: "i" };
    }
    if (fromDate || toDate) {
      query.filedDate = {};
      if (fromDate) query.filedDate.$gte = new Date(fromDate);
      if (toDate)   query.filedDate.$lte = new Date(toDate + "T23:59:59.999Z");
    }

    const [docs, total] = await Promise.all([
      FIRModel.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      FIRModel.countDocuments(query),
    ]);

    return NextResponse.json({ firs: docs.map(mapFIRDoc), total, page, limit });
  } catch (err) {
    console.error("[GET /api/fir] error:", err);
    return NextResponse.json({ error: "Failed to fetch FIRs" }, { status: 500 });
  }
}
