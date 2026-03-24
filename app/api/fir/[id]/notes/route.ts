/**
 * POST /api/fir/:id/notes
 * Add an internal note to an FIR (police / admin only).
 * Body: { text, authorId, authorName, role }
 *
 * GET /api/fir/:id/notes
 * Returns all notes for an FIR.
 */
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import FIRModel from "@/lib/models/FIR";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Ctx) {
  const { id } = await params;
  try {
    const { text, authorId, authorName, role } = await req.json();
    if (!text?.trim() || !authorId || !authorName) {
      return NextResponse.json({ error: "text, authorId and authorName are required" }, { status: 400 });
    }

    await connectDB();
    const fir = await FIRModel.findOne({ firId: id });
    if (!fir) return NextResponse.json({ error: "FIR not found" }, { status: 404 });

    fir.notes.push({ text: text.trim(), authorId, authorName, role: role || "police", createdAt: new Date() });
    await fir.save();

    const note = fir.notes[fir.notes.length - 1];
    return NextResponse.json({
      id: (note as unknown as { _id: { toString(): string } })._id.toString(),
      text: note.text,
      authorId: note.authorId,
      authorName: note.authorName,
      role: note.role,
      createdAt: note.createdAt,
    }, { status: 201 });
  } catch (err) {
    console.error(`[POST /api/fir/${id}/notes]`, err);
    return NextResponse.json({ error: "Failed to add note" }, { status: 500 });
  }
}

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  try {
    await connectDB();
    const fir = await FIRModel.findOne({ firId: id }).select("notes").lean();
    if (!fir) return NextResponse.json({ error: "FIR not found" }, { status: 404 });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const notes = (fir.notes ?? []).map((n: any) => ({
      id: n._id.toString(),
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
