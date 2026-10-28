import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requirePermission } from "@/lib/auth-session";
import { text } from "@/lib/api-validation";
import { parseBangkokDateTime, THAI_TIME_ZONE } from "@/lib/thai-date";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const auth = requirePermission(request, "appointments:manage");
  if (auth.response) return auth.response;

  try {
    const body = await request.json().catch(() => ({}));
    const patientId = text(body.patientId);
    if (!patientId) return NextResponse.json({ error: "กรุณาระบุผู้ป่วย" }, { status: 400 });

    const now = new Date();
    const today = new Intl.DateTimeFormat("sv-SE", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: THAI_TIME_ZONE }).format(now);
    const todayCutoff = parseBangkokDateTime(`${today}T15:30`);
    const cutoff = now >= todayCutoff ? todayCutoff : new Date(todayCutoff.getTime() - 24 * 60 * 60 * 1000);
    const result = await getDb().appointment.updateMany({
      where: { patientId, status: "scheduled", scheduledAt: { lt: cutoff } },
      data: { status: "no_show" },
    });
    return NextResponse.json({ updatedCount: result.count, cutoff });
  } catch {
    return NextResponse.json({ error: "ไม่สามารถสรุปสถานะนัดที่ขาดได้" }, { status: 503 });
  }
}
