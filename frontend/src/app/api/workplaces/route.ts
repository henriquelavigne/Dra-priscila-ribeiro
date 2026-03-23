import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import * as workplaceService from "@/services/workplace.service";

export async function GET(req: NextRequest) {
  try {
    const activeOnly = req.nextUrl.searchParams.get("activeOnly") === "true";
    const workplaces = await workplaceService.listWorkplaces(activeOnly || undefined);
    return NextResponse.json(workplaces, { status: 200 });
  } catch (err) {
    console.error("[GET /api/workplaces]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const workplace = await workplaceService.createWorkplace(body);
    return NextResponse.json(workplace, { status: 201 });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: err.issues },
        { status: 400 }
      );
    }
    if (err instanceof Error && err.message.includes("já está em uso")) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    console.error("[POST /api/workplaces]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
