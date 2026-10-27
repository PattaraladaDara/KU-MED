import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requirePermission } from "@/lib/auth-session";
import { text } from "@/lib/api-validation";

export const runtime = "nodejs";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { response } = requirePermission(request, "medications:catalog:manage");
  if (response) return response;
  try {
    const { id } = await params;
    const body = await request.json() as Record<string, unknown>;
    const name = text(body.name), strength = text(body.strength), dosageForm = text(body.dosageForm), unit = text(body.unit);
    const price = Number(body.unitPrice);
    if (!name || !strength || !dosageForm || !unit || !Number.isFinite(price) || price < 0 || price > 1000000 || typeof body.active !== "boolean") return NextResponse.json({ error: "กรุณากรอกข้อมูลยาและสถานะให้ถูกต้อง" }, { status: 400 });
    const code = text(body.code).toUpperCase().replace(/[^A-Z0-9-]/g, "");
    if (!code) return NextResponse.json({ error: "กรุณาระบุรหัสยา" }, { status: 400 });
    const item = await getDb().medicationCatalogItem.update({ where: { id }, data: { code, name, strength, dosageForm, unit, unitPriceSatang: Math.round(price * 100), indication: text(body.indication, 500) || null, directions: text(body.directions, 1000) || null, active: body.active } });
    return NextResponse.json({ item });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") return NextResponse.json({ error: "รหัสยานี้มีอยู่แล้ว" }, { status: 409 });
    if (error && typeof error === "object" && "code" in error && error.code === "P2025") return NextResponse.json({ error: "ไม่พบรายการยา" }, { status: 404 });
    return NextResponse.json({ error: "ไม่สามารถแก้ไขบัญชียาได้" }, { status: 503 });
  }
}
