import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getAuthSession } from "@/lib/auth-session";
import { can } from "@/lib/access-control";

export const runtime = "nodejs";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string; certificateId: string }> }) {
  const session = getAuthSession(request);
  if (!session) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบใหม่" }, { status: 401 });
  if (!can(session.role, "documents:print") && !can(session.role, "certificates:issue")) return NextResponse.json({ error: "บัญชีนี้ไม่มีสิทธิ์ดำเนินการ" }, { status: 403 });
  try {
    const { id, certificateId } = await params;
    const body = await request.json() as { action?: string };
    const existing = await getDb().medicalCertificate.findFirst({ where: { id: certificateId, patientId: id } });
    if (!existing) return NextResponse.json({ error: "ไม่พบใบรับรองแพทย์" }, { status: 404 });
    if (existing.status === "cancelled") return NextResponse.json({ error: "ใบรับรองฉบับนี้ถูกยกเลิกแล้ว" }, { status: 409 });

    if (body.action === "print") {
      const certificate = await getDb().medicalCertificate.update({
        where: { id: certificateId }, data: { printCount: { increment: 1 }, lastPrintedAt: new Date() },
      });
      return NextResponse.json({ certificate, isCopy: existing.printCount > 0 });
    }
    if (body.action === "deliver") {
      if (!can(session.role, "certificates:issue")) return NextResponse.json({ error: "บัญชีนี้ไม่มีสิทธิ์บันทึกการส่งมอบใบรับรองแพทย์" }, { status: 403 });
      const certificate = await getDb().medicalCertificate.update({
        where: { id: certificateId }, data: { status: "delivered", deliveredAt: existing.deliveredAt || new Date() },
      });
      return NextResponse.json({ certificate });
    }
    return NextResponse.json({ error: "คำสั่งไม่ถูกต้อง" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "ไม่สามารถบันทึกประวัติใบรับรองแพทย์ได้" }, { status: 503 });
  }
}
