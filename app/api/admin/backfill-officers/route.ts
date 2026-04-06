/**
 * POST /api/admin/backfill-officers
 * Admin-only: for each FIR whose policeVerifierName is unset (or whose
 * policeVerifierId doesn't match the current officer for that pincode),
 * look up the police officer by pincode and write their ID + name into
 * the FIR document.
 *
 * Safe to run multiple times — only updates FIRs that need it.
 */
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import FIRModel from "@/lib/models/FIR";
import UserModel from "@/lib/models/User";
import { requireSession, isAuthError } from "@/lib/api-auth";

export async function POST() {
  const auth = await requireSession(["admin"]);
  if (isAuthError(auth)) return auth;

  try {
    await connectDB();

    // Fetch every FIR that has a pincode but is missing the assigned officer name
    const firs = await FIRModel.find({
      pincode: { $exists: true, $ne: null, $ne: "" },
      $or: [
        { policeVerifierName: { $exists: false } },
        { policeVerifierName: null },
        { policeVerifierName: "" },
      ],
    })
      .select("firId pincode policeVerifierId policeVerifierName")
      .lean();

    if (firs.length === 0) {
      return NextResponse.json({ updated: 0, message: "All FIRs already have an assigned officer." });
    }

    // Collect distinct pincodes so we only query each officer once
    const pincodes = [...new Set(firs.map((f) => f.pincode).filter(Boolean))] as string[];

    const officers = await UserModel.find({ role: "police", pincode: { $in: pincodes } })
      .select("userId name pincode")
      .lean();

    // Map pincode → officer
    const officerByPincode = new Map<string, { userId: string; name: string }>();
    for (const o of officers) {
      if (o.pincode) officerByPincode.set(o.pincode, { userId: o.userId, name: o.name });
    }

    let updated = 0;
    let skipped = 0;

    for (const fir of firs) {
      const officer = fir.pincode ? officerByPincode.get(fir.pincode) : undefined;
      if (!officer) { skipped++; continue; }

      await FIRModel.updateOne(
        { firId: fir.firId },
        { $set: { policeVerifierId: officer.userId, policeVerifierName: officer.name } }
      );
      updated++;
    }

    return NextResponse.json({
      updated,
      skipped,
      message: `Updated ${updated} FIR(s). ${skipped} skipped (no officer found for pincode).`,
    });
  } catch (err) {
    console.error("[POST /api/admin/backfill-officers]", err);
    return NextResponse.json({ error: "Backfill failed" }, { status: 500 });
  }
}
