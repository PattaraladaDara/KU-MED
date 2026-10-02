import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const timeZone = "Asia/Bangkok";
const dateFormatter = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" });
const dateKey = (value: Date) => dateFormatter.format(value);

function bangkokDayRange(value = new Date()) {
  const [year, month, day] = dateKey(value).split("-").map(Number);
  const start = new Date(Date.UTC(year, month - 1, day) - 7 * 60 * 60 * 1000);
  return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
}

function maskName(firstName: string, lastName: string) {
  const surname = lastName ? `${lastName.slice(0, 1)}${"•".repeat(Math.min(5, Math.max(2, lastName.length - 1)))}` : "";
  return `${firstName} ${surname}`.trim();
}

export async function GET() {
  try {
    const db = getDb(), today = bangkokDayRange(), weekStart = new Date(today.start.getTime() - 6 * 86400000);
    const [newPatients, treatments, appointments, payments, weekTreatments] = await Promise.all([
      db.patient.count({ where: { createdAt: { gte: today.start, lt: today.end } } }),
      db.treatmentRecord.findMany({
        where: { visitedAt: { gte: today.start, lt: today.end } },
        select: { id: true, patientId: true, visitedAt: true, department: true, visitType: true }, orderBy: { visitedAt: "desc" },
      }),
      db.appointment.findMany({
        where: { scheduledAt: { gte: today.start, lt: today.end } },
        select: { id: true, patientId: true, scheduledAt: true, department: true, clinician: true, reason: true, status: true, patient: { select: { firstName: true, lastName: true, studentId: true } } },
        orderBy: { scheduledAt: "asc" },
      }),
      db.payment.findMany({
        where: { paidAt: { gte: today.start, lt: today.end } },
        select: { amountSatang: true, method: true, status: true },
      }),
      db.treatmentRecord.findMany({ where: { visitedAt: { gte: weekStart, lt: today.end } }, select: { visitedAt: true } }),
    ]);

    const treatedPatients = new Set(treatments.map(item => item.patientId));
    const queue = appointments.map(item => {
      const completed = item.status === "completed" || treatedPatients.has(item.patientId);
      const started = item.status === "in_progress";
      return {
        id: item.id, patientId: item.patientId, time: item.scheduledAt.toISOString(), department: item.department,
        clinician: item.clinician, reason: item.reason, studentId: item.patient.studentId,
        patientName: maskName(item.patient.firstName, item.patient.lastName),
        status: completed ? "completed" : started ? "in_progress" : "waiting",
      };
    });
    const paid = payments.filter(item => item.status === "paid");
    const pendingTransfers = payments.filter(item => item.method === "โอนเงิน" && item.status !== "paid").length;
    const moneyByMethod = (method: string) => paid.filter(item => item.method === method).reduce((sum, item) => sum + item.amountSatang, 0);

    const rooms = new Map<string, { visits: number; waiting: number; inProgress: number }>();
    for (const name of ["ห้องตรวจ1", "ห้องตรวจ2", "ห้องตรวจพิเศษ", "ห้องตรวจ7 (ห้องหัตการ) ห้องสำหรับทำแผล"]) rooms.set(name, { visits: 0, waiting: 0, inProgress: 0 });
    for (const item of treatments) { const room = rooms.get(item.department) ?? { visits: 0, waiting: 0, inProgress: 0 }; room.visits++; rooms.set(item.department, room); }
    for (const item of queue) { const room = rooms.get(item.department) ?? { visits: 0, waiting: 0, inProgress: 0 }; if (item.status === "waiting") room.waiting++; if (item.status === "in_progress") room.inProgress++; rooms.set(item.department, room); }

    const trend = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(weekStart.getTime() + index * 86400000), key = dateKey(date);
      return { date: date.toISOString(), count: weekTreatments.filter(item => dateKey(item.visitedAt) === key).length };
    });

    return NextResponse.json({
      updatedAt: new Date().toISOString(),
      summary: {
        visits: treatments.length, newPatients, appointments: appointments.length,
        completed: treatedPatients.size,
        waiting: queue.filter(item => item.status === "waiting").length,
      },
      queue, rooms: [...rooms].map(([name, value]) => ({ name, ...value })), trend,
      finance: {
        totalSatang: paid.reduce((sum, item) => sum + item.amountSatang, 0),
        cashSatang: moneyByMethod("เงินสด"), transferSatang: moneyByMethod("โอนเงิน"),
        coverageCount: paid.filter(item => item.method === "สิทธิการรักษา").length, pendingTransfers,
      },
    });
  } catch {
    return NextResponse.json({ error: "ไม่สามารถดึงข้อมูลแดชบอร์ดจากฐานข้อมูลได้" }, { status: 503 });
  }
}
