import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requirePermission } from "@/lib/auth-session";
import { ICD10_ENTRIES } from "@/lib/icd10";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { response } = requirePermission(request, ["clinical:view", "clinical:write"]);
  if (response) return response;
  try {
    const additional = await getDb().icd10CatalogEntry.findMany({ where: { active: true }, orderBy: { code: "asc" } });
    const entries = [...ICD10_ENTRIES, ...additional.filter(item => !ICD10_ENTRIES.some(builtin => builtin.code === item.code))];
    return NextResponse.json({ entries });
  } catch {
    return NextResponse.json({ error: "ไม่สามารถโหลดรายการ ICD-10 ได้" }, { status: 503 });
  }
}
