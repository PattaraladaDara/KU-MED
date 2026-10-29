import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requirePermission } from "@/lib/auth-session";
import { text } from "@/lib/api-validation";
import { ICD10_ENTRIES } from "@/lib/icd10";

export const runtime = "nodejs";
const isValidCode = (code: string) => /^[A-Z][A-Z0-9](?:\.[A-Z0-9]{1,4})?$/.test(code);

async function adminAccess(request: NextRequest) {
  const auth = requirePermission(request, "accounts:manage");
  if (auth.response) return { session: null, response: auth.response };
  const actor = await getDb().staffAccount.findUnique({ where: { username: auth.session!.username }, select: { role: true, active: true, applicationStatus: true } });
  if (actor?.role !== "admin" || !actor.active || actor.applicationStatus !== "approved") return { session: null, response: NextResponse.json({ error: "เฉพาะผู้ดูแลระบบหลักที่ใช้งานได้เท่านั้น" }, { status: 403 }) };
  return { session: auth.session, response: null };
}

export async function GET(request: NextRequest) {
  const { session, response } = requirePermission(request, ["clinical:view", "clinical:write"]);
  if (response) return response;
  try {
    const includeInactive = session!.role === "admin" && request.nextUrl.searchParams.get("includeInactive") === "1";
    const additional = await getDb().icd10CatalogEntry.findMany({ where: includeInactive ? {} : { active: true }, orderBy: [{ active: "desc" }, { code: "asc" }] });
    const entries = [...ICD10_ENTRIES, ...additional.filter(item => !ICD10_ENTRIES.some(builtin => builtin.code === item.code))];
    return NextResponse.json({ entries, managed: additional });
  } catch {
    return NextResponse.json({ error: "ไม่สามารถโหลดรายการ ICD-10 ได้" }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await adminAccess(request);
    if (auth.response) return auth.response;
    const body = await request.json() as Record<string, unknown>;
    const code = text(body.code, 12).toUpperCase();
    const description = text(body.description, 300);
    if (!isValidCode(code) || !description) return NextResponse.json({ error: "กรุณาระบุรหัส ICD-10 และชื่อโรคให้ถูกต้อง" }, { status: 400 });
    if (ICD10_ENTRIES.some(item => item.code === code)) return NextResponse.json({ error: "รหัสนี้มีอยู่ในรายการมาตรฐานแล้ว" }, { status: 409 });
    const entry = await getDb().icd10CatalogEntry.create({ data: { code, description, createdBy: auth.session!.username } });
    return NextResponse.json({ entry }, { status: 201 });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") return NextResponse.json({ error: "รหัส ICD-10 นี้มีอยู่แล้ว" }, { status: 409 });
    return NextResponse.json({ error: "ไม่สามารถเพิ่มรหัส ICD-10 ได้" }, { status: 503 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await adminAccess(request);
    if (auth.response) return auth.response;
    const body = await request.json() as Record<string, unknown>;
    const id = text(body.id), code = text(body.code, 12).toUpperCase(), description = text(body.description, 300);
    if (!id || !isValidCode(code) || !description || typeof body.active !== "boolean") return NextResponse.json({ error: "ข้อมูลรหัสโรคไม่ถูกต้อง" }, { status: 400 });
    if (ICD10_ENTRIES.some(item => item.code === code)) return NextResponse.json({ error: "รหัสนี้มีอยู่ในรายการมาตรฐานแล้ว" }, { status: 409 });
    const entry = await getDb().icd10CatalogEntry.update({ where: { id }, data: { code, description, active: body.active } });
    return NextResponse.json({ entry });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") return NextResponse.json({ error: "รหัส ICD-10 นี้มีอยู่แล้ว" }, { status: 409 });
    return NextResponse.json({ error: "ไม่สามารถแก้ไขรายการ ICD-10 ได้" }, { status: 503 });
  }
}
