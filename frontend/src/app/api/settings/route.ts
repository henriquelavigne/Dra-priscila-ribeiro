import { NextRequest, NextResponse } from "next/server";
import * as settingsService from "@/services/settings.service";

export async function GET() {
  try {
    const settings = await settingsService.getSettings();
    return NextResponse.json(settings);
  } catch (err) {
    console.error("[GET /api/settings]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();

    // Valida número de telefone se fornecido
    if (body.botPhoneNumber !== undefined && body.botPhoneNumber !== "") {
      const digits = String(body.botPhoneNumber).replace(/\D/g, "");
      if (digits.length < 10 || digits.length > 15) {
        return NextResponse.json(
          { error: "Número inválido. Use DDI + DDD + número (10–15 dígitos)." },
          { status: 400 }
        );
      }
      body.botPhoneNumber = digits;
    }

    const updated = await settingsService.updateSettings(body);
    return NextResponse.json(updated);
  } catch (err) {
    console.error("[PUT /api/settings]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
