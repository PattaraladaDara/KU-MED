import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { isUniqueError, optionalText, text } from "@/lib/api-validation";
import { parseBangkokDate } from "@/lib/thai-date";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const query = text(request.nextUrl.searchParams.get("q"), 100);
  if (query.length === 1) return NextResponse.json({ error: "กรุณากรอกคำค้นหาอย่างน้อย 2 ตัวอักษร" }, { status: 400 });
  try {
    const patients = await getDb().patient.findMany({
      where: query ? { OR: [
        { firstName: { contains: query, mode: "insensitive" } },
        { lastName: { contains: query, mode: "insensitive" } },
        { studentId: { contains: query, mode: "insensitive" } },
        { citizenId: { contains: query, mode: "insensitive" } },
      ] } : undefined,
      include: { treatments: { orderBy: { visitedAt: "desc" }, take: 10 } },
      orderBy: { updatedAt: "desc" }, take: 20,
    });
    return NextResponse.json({ patients });
  } catch {
    return NextResponse.json({ error: "ไม่สามารถเชื่อมต่อฐานข้อมูลได้" }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const required = ["citizenId", "studentId", "status", "title", "firstName", "lastName", "birthDate", "gender", "faculty", "major", "studyYear", "phone", "email", "coverage", "coverageStatus"];
    if (required.some(key => !text(body[key]))) return NextResponse.json({ error: "กรุณากรอกข้อมูลที่จำเป็นให้ครบ" }, { status: 400 });
    const birthDate = parseBangkokDate(text(body.birthDate));
    if (Number.isNaN(birthDate.getTime()) || birthDate > new Date()) return NextResponse.json({ error: "วันเกิดไม่ถูกต้อง" }, { status: 400 });
    const citizenId = text(body.citizenId).replace(/\D/g, "");
    if (citizenId.length !== 13) return NextResponse.json({ error: "เลขประจำตัวประชาชนต้องมี 13 หลัก" }, { status: 400 });
    const patient = await getDb().patient.create({ data: {
      citizenId, studentId: text(body.studentId), status: text(body.status), title: text(body.title),
      firstName: text(body.firstName), lastName: text(body.lastName), birthDate, gender: text(body.gender),
      bloodGroup: optionalText(body.bloodGroup), faculty: text(body.faculty), major: text(body.major),
      studyYear: text(body.studyYear), phone: text(body.phone), email: text(body.email).toLowerCase(),
      homeAddress: optionalText(body.homeAddress), currentAddress: optionalText(body.currentAddress),
      coverage: text(body.coverage), coverageStatus: text(body.coverageStatus), allergyNotes: optionalText(body.allergyNotes),
    } });
    return NextResponse.json({ patient }, { status: 201 });
  } catch (error) {
    if (isUniqueError(error)) return NextResponse.json({ error: "เลขประชาชน รหัสนิสิต หรืออีเมลนี้มีในระบบแล้ว" }, { status: 409 });
    return NextResponse.json({ error: "ไม่สามารถบันทึกข้อมูลได้" }, { status: 503 });
  }
}
