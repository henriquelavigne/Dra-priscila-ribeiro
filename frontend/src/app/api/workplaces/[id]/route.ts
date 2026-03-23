import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import * as workplaceService from "@/services/workplace.service";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const workplace = await workplaceService.getWorkplace(params.id);
    return NextResponse.json(workplace, { status: 200 });
  } catch (err) {
    if (err instanceof Error && err.message.includes("não encontrado")) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    console.error("[GET /api/workplaces/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const workplace = await workplaceService.updateWorkplace(params.id, body);
    return NextResponse.json(workplace, { status: 200 });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: err.issues },
        { status: 400 }
      );
    }
    if (err instanceof Error && err.message.includes("não encontrado")) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    if (err instanceof Error && err.message.includes("já está em uso")) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    console.error("[PUT /api/workplaces/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const affectedShifts = await workplaceService.deactivateWorkplace(params.id);
    return NextResponse.json({ success: true, affectedShifts }, { status: 200 });
  } catch (err) {
    if (err instanceof Error && err.message.includes("não encontrado")) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    console.error("[DELETE /api/workplaces/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
