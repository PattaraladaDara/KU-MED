import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PeriodKey = "today" | "week" | "month" | "three-months" | "academic-year" | "year" | "custom";

function bangkokParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find(part => part.type === type)?.value);
  return { year: value("year"), month: value("month"), day: value("day") };
}

function bangkokDate(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month - 1, day, -7));
}

function inputDate(value:string|null){
  if(!value||!/^\d{4}-\d{2}-\d{2}$/.test(value))return null;
  const[year,month,day]=value.split("-").map(Number),date=bangkokDate(year,month,day);
  return Number.isNaN(date.getTime())?null:date;
}

function periodRange(period: PeriodKey,startInput:string|null,endInput:string|null) {
  const now = bangkokParts();
  let start: Date;
  const end=new Date();
  if(period==="custom"){
    const customStart=inputDate(startInput),customEnd=inputDate(endInput);
    if(!customStart||!customEnd||customStart>customEnd)throw new Error("INVALID_RANGE");
    return{start:customStart,end:new Date(customEnd.getTime()+86400000),period};
  }
  if(period==="today")start=bangkokDate(now.year,now.month,now.day);
  else if(period==="week"){const today=bangkokDate(now.year,now.month,now.day),weekday=(today.getUTCDay()+6)%7;start=new Date(today.getTime()-weekday*86400000);}
  else if (period === "three-months") start = bangkokDate(now.year, now.month - 2, 1);
  else if (period === "academic-year") start = bangkokDate(now.month >= 6 ? now.year : now.year - 1, 6, 1);
  else if (period === "year") start = bangkokDate(now.year, 1, 1);
  else start = bangkokDate(now.year, now.month, 1);
  return { start, end, period };
}

function dayKey(value: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit" }).format(value);
}

function increment(map: Map<string, number>, key: string) { map.set(key || "ไม่ระบุ", (map.get(key || "ไม่ระบุ") || 0) + 1); }
function ranked(map: Map<string, number>) { return [...map].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value); }

export async function GET(request: NextRequest) {
  const requested = request.nextUrl.searchParams.get("period") as PeriodKey | null;
  const period: PeriodKey = ["today","week","month", "three-months", "academic-year", "year","custom"].includes(requested || "") ? requested! : "month";
  try {
    const { start, end } = periodRange(period,request.nextUrl.searchParams.get("start"),request.nextUrl.searchParams.get("end"));
    const db = getDb();
    const [totalPatientCount,newPatientCount,treatments,appointments,payments] = await Promise.all([
      db.patient.count(),
      db.patient.count({where:{createdAt:{gte:start,lt:end}}}),
      db.treatmentRecord.findMany({ where: { visitedAt: { gte: start, lt: end } }, select: { patientId:true,visitedAt: true, department: true, visitType: true, diagnosisCode: true, diagnosisName: true, diagnosis: true } }),
      db.appointment.findMany({ where: { scheduledAt: { gte: start, lt: end } }, select: { scheduledAt: true, status: true } }),
      db.payment.findMany({ where: { paidAt: { gte: start, lt: end } }, select: { amountSatang: true, method: true, status: true } }),
    ]);

    const daily = new Map<string, number>(), departments = new Map<string, number>(), visitTypes = new Map<string, number>(), diagnoses = new Map<string, number>(), paymentMethods = new Map<string, number>(),appointmentStatuses=new Map<string,number>();
    const visitTypeLabels:Record<string,string>={walk_in:"เข้ารับการตรวจปกติ",appointment:"เข้ารับบริการตามนัดหมาย",legacy:"ข้อมูลเดิมก่อนระบุแหล่งที่มา"};
    const appointmentStatusLabels:Record<string,string>={scheduled:"รอมาตามนัด",in_progress:"กำลังรับการตรวจ",completed:"ตรวจเสร็จสิ้น",no_show:"ขาดนัดหมาย",cancelled:"ยกเลิกนัดหมาย"};
    for (const treatment of treatments) {
      increment(daily, dayKey(treatment.visitedAt)); increment(departments, treatment.department); increment(visitTypes, visitTypeLabels[treatment.visitType]||treatment.visitType||"ไม่ระบุประเภท");
      increment(diagnoses, treatment.diagnosisCode ? `${treatment.diagnosisCode} ${treatment.diagnosisName || treatment.diagnosis}` : `ยังไม่ระบุรหัส ICD-10 — ${treatment.diagnosisName || treatment.diagnosis || "ไม่ระบุการวินิจฉัย"}`);
    }
    for(const appointment of appointments)increment(appointmentStatuses,appointmentStatusLabels[appointment.status]||appointment.status||"ไม่ระบุสถานะ");
    const paid = payments.filter(payment => payment.status === "paid");
    for (const payment of paid) increment(paymentMethods, payment.method);
    const pending=payments.filter(payment=>payment.status!=="paid");
    const uniquePatientCount=new Set(treatments.map(item=>item.patientId)).size;
    return NextResponse.json({
      period, range: { start: start.toISOString(), end: new Date(end.getTime()-1).toISOString() },
      summary: {totalPatientCount,newPatientCount,uniquePatientCount,visitCount:treatments.length,appointmentCount:appointments.length,paidAmountSatang:paid.reduce((sum,payment)=>sum+payment.amountSatang,0),billedAmountSatang:payments.reduce((sum,payment)=>sum+payment.amountSatang,0),pendingPaymentCount:pending.length},
      dailyVisits: ranked(daily).sort((a, b) => a.label.localeCompare(b.label)), departments: ranked(departments), visitTypes: ranked(visitTypes), diagnoses: ranked(diagnoses).slice(0, 5), paymentMethods: ranked(paymentMethods),appointmentStatuses:ranked(appointmentStatuses),
    });
  } catch(error) {
    if(error instanceof Error&&error.message==="INVALID_RANGE")return NextResponse.json({error:"ช่วงวันที่ไม่ถูกต้อง กรุณาตรวจสอบวันเริ่มต้นและวันสิ้นสุด"},{status:400});
    return NextResponse.json({ error: "ไม่สามารถดึงข้อมูลรายงานจากฐานข้อมูลได้" }, { status: 503 });
  }
}
