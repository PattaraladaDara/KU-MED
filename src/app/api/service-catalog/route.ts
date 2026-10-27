import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requirePermission } from "@/lib/auth-session";
import { text } from "@/lib/api-validation";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { session, response } = requirePermission(request, ["service-catalog:use", "service-catalog:manage"]);
  if (response) return response;
  try {
    const includeInactive = session!.role === "finance" && request.nextUrl.searchParams.get("includeInactive") === "1";
    const items = await getDb().serviceCatalogItem.findMany({ where: includeInactive ? {} : { active: true }, orderBy: [{ active: "desc" }, { category: "asc" }, { name: "asc" }] });
    return NextResponse.json({ items });
  } catch { return NextResponse.json({ error: "ไม่สามารถโหลดบัญชีค่าบริการได้" }, { status: 503 }); }
}

export async function POST(request: NextRequest) {
  const { response } = requirePermission(request, "service-catalog:manage");
  if (response) return response;
  try {
    const body = await request.json() as Record<string, unknown>;
    const name = text(body.name), category = text(body.category), unit = text(body.unit), price = Number(body.unitPrice);
    if (!name || !category || !unit || !Number.isFinite(price) || price < 0 || price > 1000000) return NextResponse.json({ error: "กรุณากรอกรายการ หมวด หน่วย และราคาให้ถูกต้อง" }, { status: 400 });
    const code = text(body.code).toUpperCase().replace(/[^A-Z0-9-]/g, "") || `SVC-${Date.now()}`;
    const item = await getDb().serviceCatalogItem.create({ data: { code, name, category, unit, unitPriceSatang: Math.round(price * 100) } });
    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") return NextResponse.json({ error: "รหัสค่าบริการนี้มีอยู่แล้ว" }, { status: 409 });
    return NextResponse.json({ error: "เพิ่มค่าบริการไม่สำเร็จ" }, { status: 503 });
  }
}
