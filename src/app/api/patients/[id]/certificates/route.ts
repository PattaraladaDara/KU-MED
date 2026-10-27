import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requirePermission } from "@/lib/auth-session";
import { isWeekday } from "@/lib/business-date";
import { parseBangkokDate, THAI_TIME_ZONE } from "@/lib/thai-date";

export const runtime = "nodejs";

const bangkokDate = (date: Date) => new Intl.DateTimeFormat("sv-SE", {
  year: "numeric", month: "2-digit", day: "2-digit", timeZone: THAI_TIME_ZONE,
}).format(date);

function restDayCount(start: string, end: string) {
  if (!start || !end || end < start) return 0;
  let total = 0;
  const cursor = new Date(`${start}T12:00:00Z`);
  const last = new Date(`${end}T12:00:00Z`);
  while (cursor <= last) {
    const day = cursor.getUTCDay();
    if (day !== 0 && day !== 6) total += 1;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return total;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const treatmentRecordId = request.nextUrl.searchParams.get("treatmentRecordId") || undefined;
    const certificates = await getDb().medicalCertificate.findMany({
      where: { patientId: id, ...(treatmentRecordId ? { treatmentRecordId } : {}) },
      orderBy: { issuedAt: "desc" },
    });
    return NextResponse.json({ certificates });
  } catch {
    return NextResponse.json({ error: "ไม่สามารถโหลดทะเบียนใบรับรองแพทย์ได้" }, { status: 503 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, response } = requirePermission(request, "certificates:issue");
  if (response) return response;
  if (session!.role !== "doctor") return NextResponse.json({ error: "เฉพาะแพทย์เท่านั้นที่ออกใบรับรองแพทย์ได้" }, { status: 403 });
  try {
    const { id } = await params;
    const body = await request.json() as Record<string, unknown>;
    const treatmentRecordId = String(body.treatmentRecordId || "").trim();
    const restEndDate = String(body.restEndDate || "").trim();
    const issuerUsername = String(body.issuerUsername || "").trim();
    if (!treatmentRecordId || !/^\d{4}-\d{2}-\d{2}$/.test(restEndDate) || !issuerUsername || issuerUsername !== session!.username) {
      return NextResponse.json({ error: "ข้อมูลสำหรับออกใบรับรองแพทย์ไม่ครบถ้วน" }, { status: 400 });
    }

    const db = getDb();
    const [patient, record, doctor, existing] = await Promise.all([
      db.patient.findUnique({ where: { id } }),
      db.treatmentRecord.findFirst({ where: { id: treatmentRecordId, patientId: id } }),
      db.staffAccount.findUnique({ where: { username: issuerUsername } }),
      db.medicalCertificate.findFirst({
        where: { patientId: id, treatmentRecordId, status: { in: ["issued", "delivered"] } },
        orderBy: { issuedAt: "desc" },
      }),
    ]);
    if (!patient || !record) return NextResponse.json({ error: "ไม่พบข้อมูลผู้ป่วยหรือประวัติการตรวจ" }, { status: 404 });
    if (existing) return NextResponse.json({ error: "รายการตรวจนี้ออกใบรับรองแพทย์แล้ว", certificate: existing }, { status: 409 });
    if (!doctor || !doctor.active || doctor.role !== "doctor" || !doctor.medicalLicense) {
      return NextResponse.json({ error: "เฉพาะแพทย์ที่เข้าสู่ระบบและมีเลขที่ใบอนุญาตเท่านั้นที่ออกใบรับรองได้" }, { status: 403 });
    }

    const today = bangkokDate(new Date());
    const examinedDate = bangkokDate(record.visitedAt);
    if (examinedDate !== today) {
      return NextResponse.json({ error: "ออกใบรับรองแพทย์ได้เฉพาะวันที่เข้ารับการตรวจ ไม่สามารถออกย้อนหลังได้" }, { status: 400 });
    }
    if (restEndDate < examinedDate || !isWeekday(restEndDate)) {
      return NextResponse.json({ error: "วันสุดท้ายที่สมควรพักต้องไม่ก่อนวันตรวจและต้องเป็นวันจันทร์–ศุกร์" }, { status: 400 });
    }
    const restDays = restDayCount(examinedDate, restEndDate);
    if (restDays < 1) return NextResponse.json({ error: "จำนวนวันพักไม่ถูกต้อง" }, { status: 400 });

    const issuedAt = new Date();
    const doctorName = `นพ./พญ. ${doctor.firstName} ${doctor.lastName}`;
    const patientName = `${patient.title}${patient.firstName} ${patient.lastName}`;
    const symptom = record.chiefComplaint || record.diagnosisName || record.diagnosis;
    const diagnosis = `${record.diagnosisCode ? `${record.diagnosisCode} — ` : ""}${record.diagnosisName || record.diagnosis}`;
    const medicalOpinion = record.treatmentPlan || "สมควรพักรักษาตัวและปฏิบัติตามคำแนะนำของแพทย์";

    const certificate = await db.$transaction(async (tx) => {
      const year = Number(today.slice(0, 4)) + 543;
      const sequence = await tx.certificateSequence.upsert({
        where: { buddhistYear: year },
        create: { buddhistYear: year, nextNumber: 1 },
        update: { nextNumber: { increment: 1 } },
      });
      const certificateNumber = `MC-${year}-${String(sequence.nextNumber).padStart(6, "0")}`;
      const snapshot = {
        certificateNumber, templateVersion: "illness-v1", issuedAt: issuedAt.toISOString(),
        examinedDate, restEndDate, restDays, doctorName, medicalLicense: doctor.medicalLicense,
        patientName, birthDate: patient.birthDate.toISOString(), citizenId: patient.citizenId,
        studentId: patient.studentId, symptom, diagnosis, medicalOpinion,
      };
      const documentHash = createHash("sha256").update(JSON.stringify(snapshot)).digest("hex");
      return tx.medicalCertificate.create({ data: {
        certificateNumber, patientId: id, treatmentRecordId, doctorId: doctor.id,
        examinedAt: record.visitedAt, issuedAt, restStartDate: parseBangkokDate(examinedDate),
        restEndDate: parseBangkokDate(restEndDate), restDays, doctorName,
        medicalLicense: doctor.medicalLicense, patientName, citizenId: patient.citizenId,
        studentId: patient.studentId, symptom, diagnosis, medicalOpinion,
        templateVersion: "illness-v1", contentSnapshot: snapshot, documentHash,
      } });
    });
    return NextResponse.json({ certificate }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "ไม่สามารถออกใบรับรองแพทย์ได้" }, { status: 503 });
  }
}
