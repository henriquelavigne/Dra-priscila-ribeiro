import { NextRequest, NextResponse } from "next/server";
import * as autoNoteService from "@/services/auto-note.service";

export async function PATCH(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const note = await autoNoteService.resolveAutoNote(params.id);
    return NextResponse.json(note, { status: 200 });
  } catch (err) {
    if (err instanceof Error && err.message.includes("não encontrada")) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    console.error("[PATCH /api/auto-notes/[id]/resolve]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
