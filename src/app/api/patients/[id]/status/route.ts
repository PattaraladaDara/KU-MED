import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requirePermission } from "@/lib/auth-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const patientStatuses = new Set(["นิสิตปัจจุบัน", "อาจารย์", "บุคลากร", "บุคคลภายนอก"]);
const coverageStatuses = new Set(["ใช้งานได้", "รอตรวจสอบ"]);

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, response } = requirePermission(request, "patients:update");
  if (response) return response;

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "ข้อมูลสถานะไม่ถูกต้อง" }, { status: 400 });
  }

  const hasPatientStatus = Object.prototype.hasOwnProperty.call(body, "status");
  const hasCoverageStatus = Object.prototype.hasOwnProperty.call(body, "coverageStatus");
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  if ((!hasPatientStatus && !hasCoverageStatus) || !reason || reason.length > 500) {
    return NextResponse.json({ error: "กรุณาเลือกสถานะและระบุเหตุผลการแก้ไข (ไม่เกิน 500 ตัวอักษร)" }, { status: 400 });
  }
  if ((hasPatientStatus && typeof body.status !== "string") || (hasCoverageStatus && typeof body.coverageStatus !== "string")) {
    return NextResponse.json({ error: "รูปแบบสถานะไม่ถูกต้อง" }, { status: 400 });
  }

  try {
    const { id } = await params;
    const db = getDb();
    const [patient, actor] = await Promise.all([
      db.patient.findUnique({ where: { id }, select: { id: true, status: true, coverageStatus: true } }),
      db.staffAccount.findUnique({ where: { username: session!.username }, select: { firstName: true, lastName: true } }),
    ]);
    if (!patient) return NextResponse.json({ error: "ไม่พบข้อมูลผู้ใช้บริการ" }, { status: 404 });
    if (!actor) return NextResponse.json({ error: "ไม่พบบัญชีผู้ปฏิบัติงาน" }, { status: 401 });

    const nextStatus = hasPatientStatus ? (body.status as string).trim() : patient.status;
    const nextCoverageStatus = hasCoverageStatus ? (body.coverageStatus as string).trim() : patient.coverageStatus;
    if (hasPatientStatus && nextStatus !== patient.status && !patientStatuses.has(nextStatus)) {
      return NextResponse.json({ error: "สถานภาพผู้รับบริการไม่อยู่ในรายการที่อนุญาต" }, { status: 400 });
    }
    if (hasCoverageStatus && nextCoverageStatus !== patient.coverageStatus && !coverageStatuses.has(nextCoverageStatus)) {
      return NextResponse.json({ error: "สถานะสิทธิไม่อยู่ในรายการที่อนุญาต" }, { status: 400 });
    }

    const changes = [
      ...(nextStatus !== patient.status ? [{ field: "status", oldValue: patient.status, newValue: nextStatus }] : []),
      ...(nextCoverageStatus !== patient.coverageStatus ? [{ field: "coverageStatus", oldValue: patient.coverageStatus, newValue: nextCoverageStatus }] : []),
    ];
    if (!changes.length) return NextResponse.json({ error: "สถานะเหมือนกับข้อมูลปัจจุบัน ไม่มีรายการให้บันทึก" }, { status: 400 });

    const changedByName = (actor.firstName + " " + actor.lastName).trim() || session!.username;
    const updatedPatient = await db.$transaction(async (transaction) => {
      const updated = await transaction.patient.update({
        where: { id },
        data: { status: nextStatus, coverageStatus: nextCoverageStatus },
      });
      for (const change of changes) {
        await transaction.patientStatusChange.create({
          data: {
            patientId: id,
            ...change,
            reason,
            changedByUsername: session!.username,
            changedByName,
          },
        });
      }
      return updated;
    });

    return NextResponse.json({ patient: updatedPatient, changes });
  } catch {
    return NextResponse.json({ error: "ไม่สามารถแก้ไขสถานะผู้รับบริการได้" }, { status: 503 });
  }
}