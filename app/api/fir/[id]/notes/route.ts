/**
 * GET  /api/fir/:id/notes  — Fetch internal notes for an FIR (police / admin).
 * POST /api/fir/:id/notes  — Add a new internal note (police / admin only).
 *
 * Notes are police-internal investigation remarks. They are NOT visible to the
 * citizen who filed the FIR.
 */
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import FIRModel from "@/lib/models/FIR";
import { requireSession, isAuthError } from "@/lib/api-auth";

type Ctx = { params: Promise<{ id: string }> };

// ── POST /api/fir/:id/notes ───────────────────────────────────────────────────

export async function POST(req: Request, { params }: Ctx) {
  // Only police officers and admins can add investigation notes
  const auth = await requireSession(["police", "admin"]);
  if (isAuthError(auth)) return auth;
  const { session } = auth;

  const { id } = await params;
  try {
    const { text } = await req.json();
    if (!text?.trim()) {
      return NextResponse.json({ error: "Note text is required" }, { status: 400 });
    }

    await connectDB();
    const fir = await FIRModel.findOne({ firId: id });
    if (!fir) return NextResponse.json({ error: "FIR not found" }, { status: 404 });

    // Use server-side session identity — never trust client-supplied author fields
    fir.notes.push({
      text: text.trim(),
      authorId: session.userId,
      authorName: session.name,
      role: session.role,
      createdAt: new Date(),
    });
    await fir.save();

    const note = fir.notes[fir.notes.length - 1];
    return NextResponse.json(
      {
        id: (note as unknown as { _id: { toString(): string } })._id.toString(),
        text: note.text,
        authorId: note.authorId,
        authorName: note.authorName,
        role: note.role,
        createdAt: note.createdAt,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error(`[POST /api/fir/${id}/notes]`, err);
    return NextResponse.json({ error: "Failed to add note" }, { status: 500 });
  }
}

// ── GET /api/fir/:id/notes ────────────────────────────────────────────────────

export async function GET(_req: Request, { params }: Ctx) {
  // Notes are internal — require police or admin session to read them
  const auth = await requireSession(["police", "admin"]);
  if (isAuthError(auth)) return auth;

  const { id } = await params;
  try {
    await connectDB();
    const fir = await FIRModel.findOne({ firId: id }).select("notes").lean();
    if (!fir) return NextResponse.json({ error: "FIR not found" }, { status: 404 });

    const notes = (fir.notes ?? []).map((n) => ({
      id: (n as unknown as { _id: { toString(): string } })._id.toString(),
      text: n.text,
      authorId: n.authorId,
      authorName: n.authorName,
      role: n.role,
      createdAt: n.createdAt,
    }));

    return NextResponse.json({ notes });
  } catch (err) {
    console.error(`[GET /api/fir/${id}/notes]`, err);
    return NextResponse.json({ error: "Failed to fetch notes" }, { status: 500 });
  }
}
