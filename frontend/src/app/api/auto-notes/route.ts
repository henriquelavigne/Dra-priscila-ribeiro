import { NextRequest, NextResponse } from "next/server";
import * as autoNoteService from "@/services/auto-note.service";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const status = (searchParams.get("status") ?? "active") as
      | "active"
      | "resolved"
      | "all";

    const groups = await autoNoteService.listAutoNotesGroupedByWorkplace(status);
    return NextResponse.json(groups, { status: 200 });
  } catch (err) {
    console.error("[GET /api/auto-notes]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
