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

/** GET — diagnostic only, no writes. Returns unassigned FIR count and unmatched pincodes. */
export async function GET() {
  const auth = await requireSession(["admin"]);
  if (isAuthError(auth)) return auth;

  try {
    await connectDB();

    const firs = await FIRModel.find({
      pincode: { $exists: true, $nin: [null, ""] },
      $or: [
        { policeVerifierName: { $exists: false } },
        { policeVerifierName: null },
        { policeVerifierName: "" },
      ],
    })
      .select("firId pincode")
      .lean();

    const pincodes = [...new Set(firs.map((f) => f.pincode).filter(Boolean))] as string[];
    const officers = await UserModel.find({ role: "police", pincode: { $in: pincodes } })
      .select("userId name pincode")
      .lean();

    const officerPincodes = new Set(officers.map((o) => o.pincode).filter(Boolean));
    const unmatched = pincodes.filter((p) => !officerPincodes.has(p));

    return NextResponse.json({
      unassignedFIRs: firs.length,
      firPincodes: pincodes,
      officersFound: officers.map((o) => ({ name: o.name, pincode: o.pincode })),
      unmatchedPincodes: unmatched,
    });
  } catch (err) {
    console.error("[GET /api/admin/backfill-officers]", err);
    return NextResponse.json({ error: "Diagnostic failed" }, { status: 500 });
  }
}

export async function POST() {
  const auth = await requireSession(["admin"]);
  if (isAuthError(auth)) return auth;

  try {
    await connectDB();

    // Fetch every FIR that has a pincode but is missing the assigned officer name
    const firs = await FIRModel.find({
      pincode: { $exists: true, $nin: [null, ""] },
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
    const unmatchedPincodes = new Set<string>();

    for (const fir of firs) {
      const officer = fir.pincode ? officerByPincode.get(fir.pincode) : undefined;
      if (!officer) {
        if (fir.pincode) unmatchedPincodes.add(fir.pincode);
        continue;
      }

      await FIRModel.updateOne(
        { firId: fir.firId },
        { $set: { policeVerifierId: officer.userId, policeVerifierName: officer.name } }
      );
      updated++;
    }

    const unmatched = [...unmatchedPincodes];
    return NextResponse.json({
      updated,
      skipped: unmatched.length > 0 ? firs.length - updated : 0,
      unmatchedPincodes: unmatched,
      message: updated > 0
        ? `Updated ${updated} FIR(s) with assigned officers.${unmatched.length > 0 ? ` No officer found for pincodes: ${unmatched.join(", ")} — assign an officer to these pincodes in User Management.` : ""}`
        : unmatched.length > 0
          ? `No officers found for pincodes: ${unmatched.join(", ")}. Go to User Management and ensure police officers have these pincodes assigned.`
          : "All FIRs already have an assigned officer.",
    });
  } catch (err) {
    console.error("[POST /api/admin/backfill-officers]", err);
    return NextResponse.json({ error: "Backfill failed" }, { status: 500 });
  }
}
