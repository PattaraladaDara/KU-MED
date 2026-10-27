import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requirePermission } from "@/lib/auth-session";
import { text } from "@/lib/api-validation";

export const runtime = "nodejs";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { response } = requirePermission(request, "service-catalog:manage");
  if (response) return response;
  try {
    const { id } = await params;
    const body = await request.json() as Record<string, unknown>;
    const name = text(body.name), category = text(body.category), unit = text(body.unit), price = Number(body.unitPrice);
    const code = text(body.code).toUpperCase().replace(/[^A-Z0-9-]/g, "");
    if (!code || !name || !category || !unit || !Number.isFinite(price) || price < 0 || price > 1000000 || typeof body.active !== "boolean") return NextResponse.json({ error: "กรุณากรอกข้อมูลค่าบริการและสถานะให้ถูกต้อง" }, { status: 400 });
    const item = await getDb().serviceCatalogItem.update({ where: { id }, data: { code, name, category, unit, unitPriceSatang: Math.round(price * 100), active: body.active } });
    return NextResponse.json({ item });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") return NextResponse.json({ error: "รหัสค่าบริการนี้มีอยู่แล้ว" }, { status: 409 });
    if (error && typeof error === "object" && "code" in error && error.code === "P2025") return NextResponse.json({ error: "ไม่พบค่าบริการ" }, { status: 404 });
    return NextResponse.json({ error: "แก้ไขค่าบริการไม่สำเร็จ" }, { status: 503 });
  }
}
