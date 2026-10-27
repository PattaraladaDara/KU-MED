import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { optionalText, text } from "@/lib/api-validation";
import { requirePermission } from "@/lib/auth-session";

export const runtime = "nodejs";
type Params = { params: Promise<{ id: string; paymentId: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const { response } = requirePermission(request, "payments:view");
  if (response) return response;
  const { id, paymentId } = await params;
  const payment = await getDb().payment.findFirst({ where: { id: paymentId, patientId: id }, select: { slipData: true, slipMimeType: true, slipFileName: true } });
  if (!payment?.slipData) return NextResponse.json({ error: "ไม่พบไฟล์สลิป" }, { status: 404 });
  return new NextResponse(new Uint8Array(payment.slipData), { headers: { "Content-Type": payment.slipMimeType || "application/octet-stream", "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(payment.slipFileName || "payment-slip")}`, "Cache-Control": "private, no-store" } });
}

export async function POST(request: NextRequest, { params }: Params) {
  const { response } = requirePermission(request, "payments:manage");
  if (response) return response;
  try {
    const { id, paymentId } = await params;
    const payment = await getDb().payment.findFirst({ where: { id: paymentId, patientId: id }, select: { id: true } });
    if (!payment) return NextResponse.json({ error: "ไม่พบรายการชำระเงิน" }, { status: 404 });
    const form = await request.formData(); const file = form.get("slip");
    if (!(file instanceof File) || file.size === 0) return NextResponse.json({ error: "กรุณาเลือกไฟล์สลิป" }, { status: 400 });
    if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: "ไฟล์สลิปต้องมีขนาดไม่เกิน 5 MB" }, { status: 400 });
    const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!allowed.includes(file.type)) return NextResponse.json({ error: "รองรับไฟล์ JPG, PNG, WEBP หรือ PDF เท่านั้น" }, { status: 400 });
    await getDb().payment.update({ where: { id: payment.id }, data: { slipFileName: file.name.slice(0, 180), slipMimeType: file.type, slipData: Buffer.from(await file.arrayBuffer()), status: "review", confirmedAt: null, reviewedByUsername: null, reviewedByName: null, reviewedByRole: null, reviewNote: null } });
    return NextResponse.json({ saved: true });
  } catch { return NextResponse.json({ error: "ไม่สามารถบันทึกสลิปได้" }, { status: 503 }); }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { session, response } = requirePermission(request, "payments:manage");
  if (response) return response;
  try {
    const { id, paymentId } = await params;
    const body = await request.json() as Record<string, unknown>;
    const decision = text(body.decision);
    if (!["paid", "rejected"].includes(decision)) return NextResponse.json({ error: "ข้อมูลการตรวจสอบไม่ครบถ้วน" }, { status: 400 });
    const payment = await getDb().payment.findFirst({ where: { id: paymentId, patientId: id, method: "โอนเงิน", slipFileName: { not: null } } });
    if (!payment) return NextResponse.json({ error: "ไม่พบหลักฐานการชำระเงิน" }, { status: 404 });
    const actor = await getDb().staffAccount.findUnique({ where: { username: session!.username }, select: { firstName: true, lastName: true } });
    if (!actor) return NextResponse.json({ error: "ไม่พบบัญชีผู้ปฏิบัติงาน" }, { status: 401 });
    const reviewedByName = `${actor.firstName} ${actor.lastName}`.trim() || session!.username;
    const updated = await getDb().payment.update({ where: { id: payment.id }, data: { status: decision, confirmedAt: decision === "paid" ? new Date() : null, reviewedByUsername: session!.username, reviewedByName, reviewedByRole: session!.role, reviewNote: optionalText(body.reviewNote) } });
    return NextResponse.json({ payment: updated });
  } catch { return NextResponse.json({ error: "ไม่สามารถบันทึกผลการตรวจสอบได้" }, { status: 503 }); }
}
