import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requirePermission } from "@/lib/auth-session";
import { text } from "@/lib/api-validation";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { session, response } = requirePermission(request, ["medications:catalog:use", "medications:catalog:manage"]);
  if (response) return response;
  try {
    const includeInactive = session!.role === "pharmacist" && request.nextUrl.searchParams.get("includeInactive") === "1";
    const items = await getDb().medicationCatalogItem.findMany({ where: includeInactive ? {} : { active: true }, orderBy: [{ active: "desc" }, { name: "asc" }, { strength: "asc" }] });
    return NextResponse.json({ items });
  } catch { return NextResponse.json({ error: "ไม่สามารถโหลดบัญชียาได้" }, { status: 503 }); }
}

export async function POST(request: NextRequest) {
  const { response } = requirePermission(request, "medications:catalog:manage");
  if (response) return response;
  try {
    const body = await request.json() as Record<string, unknown>;
    const name = text(body.name), strength = text(body.strength), dosageForm = text(body.dosageForm), unit = text(body.unit);
    const price = Number(body.unitPrice);
    if (!name || !strength || !dosageForm || !unit || !Number.isFinite(price) || price < 0 || price > 1000000) return NextResponse.json({ error: "กรุณากรอกชื่อยา ขนาด รูปแบบ หน่วย และราคาต่อหน่วยให้ถูกต้อง" }, { status: 400 });
    const requestedCode = text(body.code).toUpperCase().replace(/[^A-Z0-9-]/g, "");
    const code = requestedCode || `MED-${Date.now()}`;
    const item = await getDb().medicationCatalogItem.create({ data: { code, name, strength, dosageForm, unit, unitPriceSatang: Math.round(price * 100), indication: text(body.indication, 500) || null, directions: text(body.directions, 1000) || null } });
    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") return NextResponse.json({ error: "รหัสยานี้มีอยู่แล้ว" }, { status: 409 });
    return NextResponse.json({ error: "ไม่สามารถเพิ่มยาในบัญชีกลางได้" }, { status: 503 });
  }
}
