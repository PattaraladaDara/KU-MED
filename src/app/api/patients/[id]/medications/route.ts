import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requirePermission } from "@/lib/auth-session";
import { optionalText, text } from "@/lib/api-validation";
import { parseMedicationOrderSnapshots } from "@/lib/medication-orders";

export const runtime = "nodejs";
const statuses = new Set(["pending", "dispensed", "unable"]);

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { response } = requirePermission(request, ["medications:view", "medications:manage"]);
  if (response) return response;
  try {
    const { id } = await params;
    const records = await getDb().treatmentRecord.findMany({
      where: { patientId: id, medicationOrders: { not: null } },
      select: { id: true, visitedAt: true, clinician: true, diagnosis: true, diagnosisCode: true, diagnosisName: true, medicationOrders: true, medicationOrderAudit: true, medicationDispense: true, medicationPayment: { select: { id: true } } },
      orderBy: { visitedAt: "desc" },
    });
    return NextResponse.json({ records });
  } catch {
    return NextResponse.json({ error: "ไม่สามารถโหลดรายการยาได้" }, { status: 503 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, response } = requirePermission(request, "medications:manage");
  if (response) return response;
  try {
    const { id } = await params;
    const body = await request.json() as Record<string, unknown>;
    const treatmentRecordId = text(body.treatmentRecordId);
    const action = text(body.action);
    const status = text(body.status);
    if (!treatmentRecordId) return NextResponse.json({ error: "ไม่พบเลขที่ใบสั่งยา" }, { status: 400 });
    const db = getDb();
    const [record, actor] = await Promise.all([
      db.treatmentRecord.findFirst({ where: { id: treatmentRecordId, patientId: id, medicationOrders: { not: null } }, select: { id: true, medicationOrders: true, medicationOrderAudit: true, medicationDispense: { select: { status: true } }, medicationPayment: { select: { id: true } } } }),
      db.staffAccount.findUnique({ where: { username: session!.username }, select: { firstName: true, lastName: true } }),
    ]);
    if (!record) return NextResponse.json({ error: "ไม่พบใบสั่งยาของผู้ป่วยรายนี้" }, { status: 404 });
    if (!actor) return NextResponse.json({ error: "ไม่พบบัญชีผู้ปฏิบัติงาน" }, { status: 401 });
    const pharmacistName = `${actor.firstName} ${actor.lastName}`.trim() || session!.username;
    if (action === "correct-order") {
      if (record.medicationDispense?.status === "dispensed") return NextResponse.json({ error: "รายการนี้จ่ายยาแล้ว จึงแก้ไขใบสั่งย้อนหลังไม่ได้ กรุณาติดต่อแพทย์และผู้ดูแลเพื่อบันทึกการแก้ไขอย่างเป็นทางการ" }, { status: 409 });
      if (record.medicationPayment) return NextResponse.json({ error: "รายการยานี้ถูกคิดเงินแล้ว จึงแก้ไขเพื่อป้องกันยอดใบเสร็จไม่ตรงกับยา กรุณาประสานการเงินก่อน" }, { status: 409 });
      const correctionNote = text(body.correctionNote).trim();
      const submitted = Array.isArray(body.items) ? body.items as Record<string, unknown>[] : [];
      if (!correctionNote || correctionNote.length > 500 || submitted.length > 30) return NextResponse.json({ error: "กรุณาระบุเหตุผลการแก้ไขและรายการยาไม่เกิน 30 รายการ" }, { status: 400 });
      const ids = submitted.map(item => text(item.catalogItemId));
      if (ids.some(item => !item)) return NextResponse.json({ error: "กรุณาเลือกยาจากบัญชียากลางทุกรายการ" }, { status: 400 });
      const priorOrderIds = new Set(parseMedicationOrderSnapshots(record.medicationOrders).map(item => item.catalogItemId));
      const catalog = await db.medicationCatalogItem.findMany({ where: { id: { in: ids } } });
      const byId = new Map(catalog.map(item => [item.id, item]));
      const normalized = [];
      for (const item of submitted) {
        const catalogItem = byId.get(text(item.catalogItemId));
        const quantity = Number(item.quantity);
        const indication = text(item.indication).trim();
        const directions = text(item.directions).trim();
        if (!catalogItem || (!catalogItem.active && !priorOrderIds.has(catalogItem.id)) || !Number.isFinite(quantity) || quantity <= 0 || quantity > 100000 || !indication || indication.length > 500 || !directions || directions.length > 1000) return NextResponse.json({ error: "ตรวจสอบชื่อยา จำนวน สรรพคุณ และคำแนะนำให้ครบถ้วน" }, { status: 400 });
        const lineTotalSatang = Math.round(catalogItem.unitPriceSatang * quantity);
        if (!Number.isSafeInteger(lineTotalSatang)) return NextResponse.json({ error: "ยอดค่ายาสูงเกินกว่าที่ระบบรองรับ" }, { status: 400 });
        normalized.push({ catalogItemId: catalogItem.id, code: catalogItem.code, name: catalogItem.name, strength: catalogItem.strength, dosageForm: catalogItem.dosageForm, unit: catalogItem.unit, quantity, indication, directions, unitPriceSatang: catalogItem.unitPriceSatang, lineTotalSatang });
      }
      const audit = record.medicationOrderAudit ? JSON.parse(record.medicationOrderAudit) as unknown[] : [];
      const revision = { changedAt: new Date().toISOString(), changedBy: pharmacistName, username: session!.username, role: session!.role, reason: correctionNote, before: parseMedicationOrderSnapshots(record.medicationOrders), after: normalized };
      const updated = await db.treatmentRecord.update({ where: { id: treatmentRecordId }, data: { medicationOrders: normalized.length ? JSON.stringify(normalized) : null, medicationOrderAudit: JSON.stringify([...audit, revision].slice(-20)) } });
      return NextResponse.json({ record: updated });
    }
    if (!statuses.has(status)) return NextResponse.json({ error: "กรุณาเลือกสถานะการจ่ายยาให้ถูกต้อง" }, { status: 400 });
    const dispense = await db.medicationDispense.upsert({
      where: { treatmentRecordId },
      create: { treatmentRecordId, status, notes: optionalText(body.notes), pharmacistUsername: session!.username, pharmacistName, operatorRole: session!.role, dispensedAt: status === "dispensed" ? new Date() : null },
      update: { status, notes: optionalText(body.notes), pharmacistUsername: session!.username, pharmacistName, operatorRole: session!.role, dispensedAt: status === "dispensed" ? new Date() : null },
    });
    return NextResponse.json({ dispense });
  } catch {
    return NextResponse.json({ error: "ไม่สามารถอัปเดตสถานะการจ่ายยาได้" }, { status: 503 });
  }
}
