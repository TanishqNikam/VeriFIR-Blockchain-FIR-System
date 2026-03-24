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
import { connectDB } from "@/lib/db";
import FIRModel from "@/lib/models/FIR";
import { uploadFileToPinata } from "@/lib/ipfs";
import { validateFiles } from "@/lib/file-validation";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Ctx) {
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

    const uploaderRole = (formData.get("uploaderRole") as string | null) ?? "citizen";
    const uploadedBy = (formData.get("uploadedBy") as string | null) ?? "";
    const uploadedById = (formData.get("uploadedById") as string | null) ?? "";
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
