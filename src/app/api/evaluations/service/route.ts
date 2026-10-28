import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { text } from "@/lib/api-validation";
import { requirePermission } from "@/lib/auth-session";

export const runtime = "nodejs";
const connectionId = "service-evaluation";
const unitByRole: Record<string, string> = { doctor: "แพทย์", staff: "เวชระเบียน", nurse: "พยาบาล", pharmacist: "เภสัชกรรม", finance: "การเงิน" };
const metricKeys = new Set(["serviceUnit", "overall", "staff", "speed", "feedback"]);
const average = (values: number[]) => values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length * 10) / 10 : 0;
const score = (value?: string) => { const number = Number(value); return Number.isFinite(number) && number >= 1 && number <= 5 ? Math.round(number) : 0; };
const hash = (value: string) => createHash("sha256").update(value).digest("hex").slice(0, 24);
const errorMessage = (reason: unknown) => reason instanceof Error ? reason.message : "ไม่สามารถอ่านผลประเมินได้";

function csvRows(input: string) {
  const rows: string[][] = []; let row: string[] = [], cell = "", quoted = false;
  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    if (char === '"') { if (quoted && input[index + 1] === '"') { cell += '"'; index += 1; } else quoted = !quoted; }
    else if (char === "," && !quoted) { row.push(cell); cell = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) { if (char === "\r" && input[index + 1] === "\n") index += 1; row.push(cell); if (row.some(Boolean)) rows.push(row); row = []; cell = ""; }
    else cell += char;
  }
  row.push(cell); if (row.some(Boolean)) rows.push(row); return rows;
}
function sheetDetails(value: string) {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" || url.hostname !== "docs.google.com") return null;
    const sheetId = url.pathname.match(/\/spreadsheets\/d\/([\w-]+)/)?.[1];
    if (!sheetId) return null;
    const gid = url.searchParams.get("gid") || url.hash.match(/gid=(\d+)/)?.[1] || "0";
    return { sheetId, csvUrl: `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}` };
  } catch { return null; }
}
function validFormUrl(value: string) { try { const url = new URL(value); return url.protocol === "https:" && url.hostname === "docs.google.com" && url.pathname.startsWith("/forms/"); } catch { return false; } }
async function downloadRows(sheetCsvUrl: string) {
  const response = await fetch(sheetCsvUrl, { signal: AbortSignal.timeout(20_000), cache: "no-store" });
  if (!response.ok) throw new Error(response.status === 401 || response.status === 403 ? "เปิด Google Sheets แล้วตั้งค่าการเข้าถึงเป็น ‘ทุกคนที่มีลิงก์ดูได้’ ก่อน" : "ดาวน์โหลดข้อมูลจาก Google Sheets ไม่สำเร็จ");
  const rows = csvRows(await response.text());
  if (!rows.length) throw new Error("ไม่พบหัวตารางใน Google Sheets");
  return rows;
}
function headerQuestions(headers: string[]) {
  const occurrences = new Map<string, number>();
  return headers.map((rawTitle, columnIndex) => {
    const title = rawTitle.trim() || `คอลัมน์ ${columnIndex + 1}`, occurrence = (occurrences.get(title) || 0) + 1;
    occurrences.set(title, occurrence);
    return { questionId: hash(`${title}::${occurrence}`), title, questionType: `column:${columnIndex}` };
  });
}
async function discover(formUrl: string, sheetUrl: string) {
  if (formUrl && !validFormUrl(formUrl)) throw new Error("ลิงก์ Google Form ไม่ถูกต้อง");
  const sheet = sheetDetails(sheetUrl); if (!sheet) throw new Error("ลิงก์ Google Sheets ไม่ถูกต้อง");
  const rows = await downloadRows(sheet.csvUrl), questions = headerQuestions(rows[0]), now = new Date();
  await getDb().$transaction(async (tx) => {
    await tx.googleFormConnection.upsert({
      where: { id: connectionId },
      create: { id: connectionId, formId: sheet.sheetId, formUrl, sheetCsvUrl: sheet.csvUrl, title: "แบบประเมินการให้บริการ", revisionId: hash(rows[0].join("|")), status: "connected", lastSchemaSyncAt: now },
      update: { formId: sheet.sheetId, formUrl, sheetCsvUrl: sheet.csvUrl, revisionId: hash(rows[0].join("|")), status: "connected", lastSchemaSyncAt: now, lastError: null },
    });
    await tx.googleFormQuestion.updateMany({ where: { connectionId }, data: { active: false } });
    for (const question of questions) await tx.googleFormQuestion.upsert({
      where: { connectionId_questionId: { connectionId, questionId: question.questionId } },
      create: { connectionId, ...question, active: true, lastSeenAt: now },
      update: { title: question.title, questionType: question.questionType, active: true, lastSeenAt: now },
    });
  });
  return questions.length;
}

export async function GET(request: NextRequest) {
  const auth = requirePermission(request, ["evaluations:view", "evaluations:manage"]);
  if (auth.response) return auth.response;
  try {
    const role = auth.session!.role, unit = unitByRole[role];
    const where = { assessmentType: "service", ...(role !== "admin" && role !== "executive" && unit ? { serviceUnit: unit } : {}) };
    const [items, connection] = await Promise.all([
      getDb().evaluation.findMany({ where, orderBy: { createdAt: "desc" }, take: 500 }),
      getDb().googleFormConnection.findUnique({ where: { id: connectionId }, include: { questions: { orderBy: [{ active: "desc" }, { firstSeenAt: "asc" }] } } }),
    ]);
    return NextResponse.json({
      role, canManage: role === "admin",
      config: connection ? { formUrl: connection.formUrl, sheetUrl: connection.sheetCsvUrl, formId: connection.formId, title: connection.title || "", status: connection.status, lastSchemaSyncAt: connection.lastSchemaSyncAt, lastResponseSyncAt: connection.lastResponseSyncAt, lastError: connection.lastError } : { formUrl: "", sheetUrl: "", formId: "", title: "", status: "not_connected", lastSchemaSyncAt: null, lastResponseSyncAt: null, lastError: null },
      questions: connection?.questions.map((question) => ({ questionId: question.questionId, title: question.title, questionType: question.questionType, metricKey: question.metricKey || "", active: question.active })) || [],
      summary: { responses: items.length, overall: average(items.map((item) => item.qualityScore)), staff: average(items.map((item) => item.responsibilityScore)), speed: average(items.map((item) => item.serviceScore)) },
      units: Object.entries(items.reduce<Record<string, number>>((all, item) => { all[item.serviceUnit || "ไม่ระบุ"] = (all[item.serviceUnit || "ไม่ระบุ"] || 0) + 1; return all; }, {})).map(([label, value]) => ({ label, value })),
      comments: items.filter((item) => item.feedback).slice(0, 20).map((item) => ({ id: item.id, unit: item.serviceUnit, feedback: item.feedback, createdAt: item.createdAt })),
    });
  } catch (reason) { return NextResponse.json({ error: errorMessage(reason) }, { status: 503 }); }
}

export async function PUT(request: NextRequest) {
  const auth = requirePermission(request, "evaluations:manage");
  if (auth.response) return auth.response;
  try {
    const body = await request.json() as Record<string, unknown>;
    const mappings = Array.isArray(body.mappings) ? body.mappings : [], selected = new Set<string>();
    for (const entry of mappings) {
      if (!entry || typeof entry !== "object") continue;
      const value = entry as Record<string, unknown>, questionId = text(value.questionId), metricKey = text(value.metricKey);
      if (metricKey && (!metricKeys.has(metricKey) || selected.has(metricKey))) return NextResponse.json({ error: "ตัวชี้วัดแต่ละรายการเลือกได้เพียงหนึ่งคอลัมน์" }, { status: 400 });
      if (metricKey) selected.add(metricKey);
      await getDb().googleFormQuestion.updateMany({ where: { connectionId, questionId }, data: { metricKey: metricKey || null } });
    }
    return NextResponse.json({ message: "บันทึกการจับคู่ข้อมูลแล้ว" });
  } catch (reason) { return NextResponse.json({ error: errorMessage(reason) }, { status: 503 }); }
}

export async function POST(request: NextRequest) {
  const auth = requirePermission(request, "evaluations:manage");
  if (auth.response) return auth.response;
  try {
    const body = await request.json() as Record<string, unknown>, action = text(body.action) || "sync";
    if (action === "connect") { const count = await discover(text(body.formUrl), text(body.sheetUrl)); return NextResponse.json({ message: `เชื่อมต่อสำเร็จ พบข้อมูล ${count} คอลัมน์` }); }
    const connection = await getDb().googleFormConnection.findUnique({ where: { id: connectionId } });
    if (!connection) return NextResponse.json({ error: "กรุณาเชื่อมต่อ Google Sheets ก่อน" }, { status: 400 });
    if (action === "refresh-schema") { const count = await discover(connection.formUrl, connection.sheetCsvUrl); return NextResponse.json({ message: `ตรวจสอบแล้ว พบข้อมูลที่ใช้งาน ${count} คอลัมน์` }); }
    await discover(connection.formUrl, connection.sheetCsvUrl);
    const [questions, rows] = await Promise.all([getDb().googleFormQuestion.findMany({ where: { connectionId, active: true, metricKey: { not: null } } }), downloadRows(connection.sheetCsvUrl)]);
    const mapped = Object.fromEntries(questions.map((question) => [question.metricKey as string, Number(question.questionType.replace("column:", ""))]));
    if (!Number.isInteger(mapped.overall)) return NextResponse.json({ error: "กรุณาจับคู่ ‘ความพึงพอใจโดยรวม’ ก่อนนำเข้า" }, { status: 400 });
    const allQuestions = headerQuestions(rows[0]); let imported = 0, updated = 0;
    await getDb().$transaction(async (tx) => {
      for (const [rowIndex, row] of rows.slice(1).entries()) {
        if (!row.some((value) => value.trim())) continue;
        const value = (key: string) => Number.isInteger(mapped[key]) ? (row[mapped[key]] || "").trim() : "", overall = score(value("overall"));
        if (!overall) continue;
        const timestamp = row[0]?.trim() || "no-time", responseId = `sheet-${hash(`${connection.formId}:${timestamp}:${rowIndex}`)}`;
        const existing = await tx.evaluation.findUnique({ where: { externalResponseId: responseId }, select: { id: true } });
        const sourceAnswers = Object.fromEntries(allQuestions.map((question, index) => [question.questionId, [row[index] || ""]]));
        const parsedTime = new Date(timestamp), submittedAt = Number.isNaN(parsedTime.getTime()) ? new Date() : parsedTime;
        const data = { employeeCode: responseId, employeeName: "ผู้ใช้บริการ", evaluationRound: "Google Forms", qualityScore: overall, responsibilityScore: score(value("staff")) || overall, serviceScore: score(value("speed")) || overall, feedback: value("feedback") || null, evaluatorKey: "google_forms", serviceUnit: value("serviceUnit") || "ไม่ระบุหน่วยงาน", assessmentType: "service", anonymous: true, followupStatus: "received", externalFormId: connection.formId, externalResponseId: responseId, sourceAnswers, sourceSubmittedAt: submittedAt, createdAt: submittedAt };
        await tx.evaluation.upsert({ where: { externalResponseId: responseId }, create: data, update: data }); if (existing) updated += 1; else imported += 1;
      }
      await tx.googleFormConnection.update({ where: { id: connectionId }, data: { status: "connected", lastResponseSyncAt: new Date(), lastError: null } });
    });
    return NextResponse.json({ message: `ซิงก์สำเร็จ เพิ่ม ${imported} รายการ อัปเดต ${updated} รายการ` });
  } catch (reason) {
    const error = errorMessage(reason); await getDb().googleFormConnection.updateMany({ where: { id: connectionId }, data: { status: "error", lastError: error } }).catch(() => undefined);
    return NextResponse.json({ error }, { status: 503 });
  }
}
