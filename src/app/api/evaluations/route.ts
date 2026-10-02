import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { optionalText, score, text } from "@/lib/api-validation";
import { commonCriteria, doctorCriteria, staffCriteria } from "@/lib/evaluation-criteria";
import { parseBangkokDate } from "@/lib/thai-date";

export const runtime = "nodejs";

function readScores(source: unknown, criteria: readonly (readonly [string, string])[]) {
  if (!source || typeof source !== "object" || Array.isArray(source)) return null;
  const input = source as Record<string, unknown>, values: Record<string, number> = {};
  for (const [key] of criteria) { const value = score(input[key]); if (!value) return null; values[key] = value; }
  return values;
}
function average(values: Record<string, number>) { return Math.round(Object.values(values).reduce((sum, value) => sum + value, 0) / Object.keys(values).length); }

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const assessedRole = text(body.assessedRole), assessmentType = text(body.assessmentType);
    if (!new Set(["doctor", "staff"]).has(assessedRole) || !new Set(["self", "peer", "supervisor"]).has(assessmentType))
      return NextResponse.json({ error: "ประเภทการประเมินหรือบทบาทไม่ถูกต้อง" }, { status: 400 });
    const commonScores = readScores(body.commonScores, commonCriteria), roleScores = readScores(body.roleScores, assessedRole === "doctor" ? doctorCriteria : staffCriteria);
    const assessedName = text(body.assessedName), assessedUserKey = text(body.assessedUserKey), evaluatorKey = text(body.evaluatorKey), evaluationRound = text(body.evaluationRound);
    const developmentGoals = optionalText(body.developmentGoals), actionPlan = optionalText(body.actionPlan);
    if (!commonScores || !roleScores) return NextResponse.json({ error: "กรุณาให้คะแนนทุกหัวข้อระหว่าง 1–5" }, { status: 400 });
    if (!assessedName || !assessedUserKey || !evaluatorKey || !evaluationRound || !developmentGoals || !actionPlan)
      return NextResponse.json({ error: "กรุณากรอกข้อมูลผู้รับการประเมิน เป้าหมาย และแผนพัฒนาให้ครบ" }, { status: 400 });
    const reviewDateText = text(body.reviewDate), reviewDate = reviewDateText ? parseBangkokDate(reviewDateText) : null;
    if (reviewDate && Number.isNaN(reviewDate.getTime())) return NextResponse.json({ error: "วันที่ติดตามผลไม่ถูกต้อง" }, { status: 400 });
    const evaluation = await getDb().evaluation.create({ data: {
      employeeCode: assessedUserKey, employeeName: assessedName, evaluationRound,
      qualityScore: average(roleScores), responsibilityScore: average(commonScores), serviceScore: average({ teamwork: commonScores.teamwork, communication: commonScores.communication }),
      assessmentType, assessedUserKey, assessedName, assessedRole, commonScores, roleScores,
      strengths: optionalText(body.strengths), developmentGoals, supportNeeded: optionalText(body.supportNeeded), actionPlan, reviewDate,
      feedback: optionalText(body.feedback), evaluatorKey, anonymous: false, followupStatus: "action_planned",
    } });
    return NextResponse.json({ evaluation: { id: evaluation.id, createdAt: evaluation.createdAt }, message: "บันทึกแบบประเมินและแผนพัฒนาเรียบร้อยแล้ว" }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "ไม่สามารถบันทึกแบบประเมินได้" }, { status: 503 });
  }
}
