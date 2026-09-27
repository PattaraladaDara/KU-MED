import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { text } from "@/lib/api-validation";

export const runtime = "nodejs";
const userKey = "demo-admin";

export async function GET() {
  try { return NextResponse.json({ settings: await getDb().userSettings.findUnique({ where: { userKey } }) }); }
  catch { return NextResponse.json({ error: "ไม่สามารถโหลดการตั้งค่าได้" }, { status: 503 }); }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const displayName = text(body.displayName), email = text(body.email).toLowerCase(), phone = text(body.phone);
    if (!displayName || !email || !phone) return NextResponse.json({ error: "กรุณากรอกชื่อ อีเมล และหมายเลขโทรศัพท์" }, { status: 400 });
    const settings = await getDb().userSettings.upsert({ where: { userKey }, create: {
      userKey, displayName, role: "ผู้ดูแลระบบ", email, phone,
      notifyAnnouncements: body.notifyAnnouncements === true, notifyMonthlyReports: body.notifyMonthlyReports === true, notifySecurity: body.notifySecurity === true,
    }, update: {
      displayName, email, phone, notifyAnnouncements: body.notifyAnnouncements === true,
      notifyMonthlyReports: body.notifyMonthlyReports === true, notifySecurity: body.notifySecurity === true,
    } });
    return NextResponse.json({ settings });
  } catch { return NextResponse.json({ error: "ไม่สามารถบันทึกการตั้งค่าได้" }, { status: 503 }); }
}
