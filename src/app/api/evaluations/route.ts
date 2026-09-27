import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { optionalText, score, text } from "@/lib/api-validation";

export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const qualityScore = score(body.qualityScore), responsibilityScore = score(body.responsibilityScore), serviceScore = score(body.serviceScore);
    if (!qualityScore || !responsibilityScore || !serviceScore) return NextResponse.json({ error: "กรุณาให้คะแนนทุกหัวข้อระหว่าง 1–5" }, { status: 400 });
    const evaluation = await getDb().evaluation.create({ data: {
      employeeCode: "KU-MED-001", employeeName: "สุพิตตา ชัยงาม", evaluationRound: "1/2569",
      qualityScore, responsibilityScore, serviceScore, feedback: optionalText(body.feedback), evaluatorKey: text(body.evaluatorKey) || "demo-admin",
    } });
    return NextResponse.json({ evaluation }, { status: 201 });
  } catch { return NextResponse.json({ error: "ไม่สามารถบันทึกแบบประเมินได้" }, { status: 503 }); }
}
