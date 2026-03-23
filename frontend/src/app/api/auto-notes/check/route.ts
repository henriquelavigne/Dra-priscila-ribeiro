import { NextResponse } from "next/server";
import * as autoNoteService from "@/services/auto-note.service";

export async function POST() {
  try {
    const result = await autoNoteService.checkAndGenerateAutoNotes();
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    console.error("[POST /api/auto-notes/check]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
