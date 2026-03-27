/**
 * POST /api/fir/:id/evidence
 * Add additional evidence files to an existing FIR.
 * Body: multipart/form-data  { files: File[], uploaderRole?: string, uploadedBy?: string, uploadedById?: string }
 *
 * - Citizen uploads  → go into evidenceFiles (supplementary, not part of integrity hash)
 * - Police uploads   → go into policeEvidenceFiles (investigation evidence, not part of hash)
 *
 * Only allowed when FIR status is pending or under-verification.
 */
import { NextResponse } from "next/server";
import crypto from "crypto";
import { connectDB } from "@/lib/db";
import FIRModel from "@/lib/models/FIR";
import { uploadFileToPinata } from "@/lib/ipfs";
import { validateFiles } from "@/lib/file-validation";
import { updateFIRStatusOnChain } from "@/lib/blockchain";
import { requireSession, isAuthError } from "@/lib/api-auth";
import { logAudit } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Ctx) {
  const auth = await requireSession(["citizen", "police"]);
  if (isAuthError(auth)) return auth;
  const { session } = auth;

  // Rate limit: max 20 evidence uploads per hour per user to prevent IPFS spam
  const rl = rateLimit(`evidence:${session.userId}`, 20, 60 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many uploads. Please wait before uploading more evidence." },
      { status: 429 }
    );
  }

  const { id } = await params;
  try {
    await connectDB();
    const fir = await FIRModel.findOne({ firId: id });
    if (!fir) return NextResponse.json({ error: "FIR not found" }, { status: 404 });

    if (fir.status === "verified" || fir.status === "rejected") {
      return NextResponse.json(
        { error: `Cannot add evidence to a ${fir.status} FIR` },
        { status: 400 }
      );
    }

    const formData = await req.formData();
    const files = formData.getAll("files") as File[];
    const nonEmptyFiles = files.filter((f) => f.size > 0);

    if (nonEmptyFiles.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

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

    // Use session role/identity — never trust client-supplied uploaderRole
    const uploaderRole = session.role === "police" ? "police" : "citizen";
    const uploadedBy = session.name;
    const uploadedById = session.userId;
    const isPolice = uploaderRole === "police";

    const added: { name: string; type: string; size: number; ipfsCid: string }[] = [];

    for (const file of nonEmptyFiles) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const cid = await uploadFileToPinata(buffer, file.name, file.type || "application/octet-stream");

      if (isPolice) {
        fir.policeEvidenceFiles.push({
          name: file.name,
          type: file.type,
          size: file.size,
          ipfsCid: cid,
          uploadedAt: new Date(),
          uploadedBy,
          uploadedById,
        });
      } else {
        fir.evidenceFiles.push({
          name: file.name,
          type: file.type,
          size: file.size,
          ipfsCid: cid,
          uploadedAt: new Date(),
        });
      }

      added.push({ name: file.name, type: file.type, size: file.size, ipfsCid: cid });
    }

    await fir.save();

    // ── Audit log ─────────────────────────────────────────────────────────────
    logAudit({
      action: "EVIDENCE_UPLOADED",
      firId: id,
      actorId: uploadedById,
      actorName: uploadedBy,
      actorRole: uploaderRole,
      details: `${added.length} file(s) uploaded via ${uploaderRole} portal: ${added.map((f) => f.name).join(", ")}`,
    }).catch(() => {});

    // ── Anchor police evidence batch on-chain ─────────────────────────────────
    // Compute a SHA-256 fingerprint of the uploaded CIDs and write it on-chain
    // as a StatusUpdated event. This creates an immutable record that this exact
    // batch of evidence existed at this block — auditors can verify CIDs match.
    if (isPolice && added.length > 0) {
      const batchFingerprint = crypto
        .createHash("sha256")
        .update(JSON.stringify(added.map((f) => f.ipfsCid).sort()))
        .digest("hex")
        .slice(0, 32);
      updateFIRStatusOnChain(
        id,
        `evidence-added:${batchFingerprint}`,
        "police"
      ).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      firId: id,
      added,
      uploaderRole,
      totalCitizenEvidence: fir.evidenceFiles.length,
      totalPoliceEvidence: fir.policeEvidenceFiles.length,
    });
  } catch (err) {
    console.error(`[POST /api/fir/${id}/evidence]`, err);
    return NextResponse.json({ error: "Failed to upload evidence" }, { status: 500 });
  }
}
