import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PeriodKey = "month" | "three-months" | "academic-year" | "year";

function bangkokParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find(part => part.type === type)?.value);
  return { year: value("year"), month: value("month"), day: value("day") };
}

function bangkokDate(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month - 1, day, -7));
}

function periodRange(period: PeriodKey) {
  const now = bangkokParts();
  let start: Date;
  if (period === "three-months") start = bangkokDate(now.year, now.month - 2, 1);
  else if (period === "academic-year") start = bangkokDate(now.month >= 6 ? now.year : now.year - 1, 6, 1);
  else if (period === "year") start = bangkokDate(now.year, 1, 1);
  else start = bangkokDate(now.year, now.month, 1);
  return { start, end: new Date(), period };
}

function dayKey(value: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit" }).format(value);
}

function increment(map: Map<string, number>, key: string) { map.set(key || "ไม่ระบุ", (map.get(key || "ไม่ระบุ") || 0) + 1); }
function ranked(map: Map<string, number>) { return [...map].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value); }

export async function GET(request: NextRequest) {
  const requested = request.nextUrl.searchParams.get("period") as PeriodKey | null;
  const period: PeriodKey = ["month", "three-months", "academic-year", "year"].includes(requested || "") ? requested! : "month";
  const { start, end } = periodRange(period);
  try {
    const db = getDb();
    const [patientCount, treatments, appointments, payments] = await Promise.all([
      db.patient.count(),
      db.treatmentRecord.findMany({ where: { visitedAt: { gte: start, lte: end } }, select: { visitedAt: true, department: true, visitType: true, diagnosisCode: true, diagnosisName: true, diagnosis: true } }),
      db.appointment.findMany({ where: { scheduledAt: { gte: start, lte: end } }, select: { scheduledAt: true, status: true } }),
      db.payment.findMany({ where: { paidAt: { gte: start, lte: end } }, select: { amountSatang: true, method: true, status: true } }),
    ]);

    const daily = new Map<string, number>(), departments = new Map<string, number>(), visitTypes = new Map<string, number>(), diagnoses = new Map<string, number>(), paymentMethods = new Map<string, number>();
    for (const treatment of treatments) {
      increment(daily, dayKey(treatment.visitedAt)); increment(departments, treatment.department); increment(visitTypes, treatment.visitType);
      increment(diagnoses, treatment.diagnosisCode ? `${treatment.diagnosisCode} ${treatment.diagnosisName || treatment.diagnosis}` : treatment.diagnosisName || treatment.diagnosis);
    }
    for (const payment of payments) increment(paymentMethods, payment.method);
    const paid = payments.filter(payment => payment.status === "paid");
    return NextResponse.json({
      period, range: { start: start.toISOString(), end: end.toISOString() },
      summary: { patientCount, visitCount: treatments.length, appointmentCount: appointments.length, paidAmountSatang: paid.reduce((sum, payment) => sum + payment.amountSatang, 0) },
      dailyVisits: ranked(daily).sort((a, b) => a.label.localeCompare(b.label)), departments: ranked(departments), visitTypes: ranked(visitTypes), diagnoses: ranked(diagnoses).slice(0, 5), paymentMethods: ranked(paymentMethods),
    });
  } catch {
    return NextResponse.json({ error: "ไม่สามารถดึงข้อมูลรายงานจากฐานข้อมูลได้" }, { status: 503 });
  }
}
