import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requirePermission } from "@/lib/auth-session";
import { can } from "@/lib/access-control";

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

const evaluationUnitByRole:Record<string,string>={doctor:"แพทย์",staff:"เวชระเบียน",nurse:"พยาบาล",pharmacist:"เภสัชกรรม",finance:"การเงิน"};

export async function GET(request:NextRequest) {
  const auth = requirePermission(request, "dashboard:view");
  if (auth.response) return auth.response;
  try {
    const db = getDb(), today = bangkokDayRange(), weekStart = new Date(today.start.getTime() - 6 * 86400000);
    const [newPatients, treatments, appointments, payments, weekTreatments, pendingTriages, pendingMedications] = await Promise.all([
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
        select: { id: true, patientId: true, paidAt: true, description: true, amountSatang: true, method: true, status: true, patient: { select: { firstName: true, lastName: true } } },
      }),
      db.treatmentRecord.findMany({ where: { visitedAt: { gte: weekStart, lt: today.end } }, select: { visitedAt: true } }),
      db.triageAssessment.findMany({
        where: { treatmentRecord: null },
        select: { id: true, patientId: true, assessedAt: true, chiefComplaint: true, patient: { select: { firstName: true, lastName: true } } },
        orderBy: { assessedAt: "desc" }, take: 20,
      }),
      db.treatmentRecord.findMany({
        where: { medicationOrders: { not: null }, OR: [{ medicationDispense: null }, { medicationDispense: { is: { status: { not: "dispensed" } } } }] },
        select: { id: true, patientId: true, visitedAt: true, medicationOrders: true, patient: { select: { firstName: true, lastName: true } }, medicationDispense: { select: { status: true } } },
        orderBy: { visitedAt: "desc" }, take: 20,
      }),
    ]);

    const yesterday={start:new Date(today.start.getTime()-86400000),end:today.start};
    const [bangkokYear,bangkokMonth]=dateKey(new Date()).split("-").map(Number),fiscalYear=bangkokMonth>=10?bangkokYear+1:bangkokYear;
    const fiscalStart=new Date(Date.UTC(fiscalYear-1,9,1)-7*3600000),fiscalEnd=new Date(Date.UTC(fiscalYear,9,1)-7*3600000);
    const [previousVisits,previousNewPatients,previousAppointments,previousPayments,kpiTreatments,dispensedToday,budgets,expenses]=await Promise.all([
      db.treatmentRecord.count({where:{visitedAt:{gte:yesterday.start,lt:yesterday.end}}}),
      db.patient.count({where:{createdAt:{gte:yesterday.start,lt:yesterday.end}}}),
      db.appointment.count({where:{scheduledAt:{gte:yesterday.start,lt:yesterday.end}}}),
      db.payment.findMany({where:{paidAt:{gte:yesterday.start,lt:yesterday.end},status:"paid"},select:{amountSatang:true}}),
      db.treatmentRecord.findMany({where:{visitedAt:{gte:today.start,lt:today.end},triageAssessmentId:{not:null}},select:{visitedAt:true,triageAssessment:{select:{assessedAt:true}}}}),
      db.medicationDispense.findMany({where:{dispensedAt:{gte:today.start,lt:today.end},status:"dispensed"},select:{dispensedAt:true,treatmentRecord:{select:{visitedAt:true}}}}),
      db.financialBudget.findMany({where:{fiscalYear},select:{allocatedSatang:true}}),
      db.financialExpense.findMany({where:{expenseDate:{gte:fiscalStart,lt:fiscalEnd},status:{in:["approved","paid"]}},select:{amountSatang:true}}),
    ]);

    const treatedPatients = new Set(treatments.map(item => item.patientId));
    const queue = appointments.map(item => {
      const completed = item.status === "completed" || treatedPatients.has(item.patientId);
      const started = item.status === "in_progress";
      return {
        id: item.id, patientId: item.patientId, time: item.scheduledAt.toISOString(), department: item.department,
        clinician: item.clinician, reason: item.reason, studentId: item.patient.studentId,
        patientName: maskName(item.patient.firstName, item.patient.lastName),
        status: completed ? "completed" : item.status === "no_show" ? "no_show" : started ? "in_progress" : "waiting",
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
    const average=(values:number[])=>values.length?Math.round(values.reduce((sum,value)=>sum+value,0)/values.length):null;
    const triageWaitMinutes=average(kpiTreatments.flatMap(item=>item.triageAssessment?[Math.max(0,(item.visitedAt.getTime()-item.triageAssessment.assessedAt.getTime())/60000)]:[]));
    const dispenseMinutes=average(dispensedToday.flatMap(item=>item.dispensedAt?[Math.max(0,(item.dispensedAt.getTime()-item.treatmentRecord.visitedAt.getTime())/60000)]:[]));
    const allocatedSatang=budgets.reduce((sum,item)=>sum+item.allocatedSatang,0),committedSatang=expenses.reduce((sum,item)=>sum+item.amountSatang,0);
    const dashboardRole=auth.session!.role,serviceUnit=evaluationUnitByRole[dashboardRole];
    const canViewPatients=can(dashboardRole,"patients:view");
    const[systemEvaluations,serviceEvaluations]=await Promise.all([
      db.evaluation.findMany({where:{assessmentType:"system"},select:{serviceScore:true}}),
      db.evaluation.findMany({where:{assessmentType:"service",...(dashboardRole!=="admin"&&dashboardRole!=="executive"&&serviceUnit?{serviceUnit}:{})},select:{qualityScore:true,responsibilityScore:true,serviceScore:true}}),
    ]);
    const decimalAverage=(values:number[])=>values.length?Math.round(values.reduce((sum,value)=>sum+value,0)/values.length*10)/10:0;

    return NextResponse.json({
      updatedAt: new Date().toISOString(),
      summary: {
        visits: treatments.length, newPatients, appointments: appointments.length,
        completed: treatedPatients.size,
        waiting: queue.filter(item => item.status === "waiting").length,
      },
      queue: canViewPatients ? queue : [], rooms: [...rooms].map(([name, value]) => ({ name, ...value })), trend,
      pendingTriages: canViewPatients ? pendingTriages.map(item => ({
        id: item.id, patientId: item.patientId, assessedAt: item.assessedAt.toISOString(),
        patientName: maskName(item.patient.firstName, item.patient.lastName), chiefComplaint: item.chiefComplaint,
      })) : [],
      pendingMedications: canViewPatients ? pendingMedications.map(item => ({
        id: item.id, patientId: item.patientId, orderedAt: item.visitedAt.toISOString(),
        patientName: maskName(item.patient.firstName, item.patient.lastName), status: item.medicationDispense?.status ?? "pending",
      })) : [],
      pendingPayments: canViewPatients ? payments.filter(item=>item.method==="โอนเงิน"&&item.status!=="paid").map(item=>({
        id:item.id,patientId:item.patientId,createdAt:item.paidAt.toISOString(),patientName:maskName(item.patient.firstName,item.patient.lastName),description:item.description,status:item.status,
      })) : [],
      finance: {
        totalSatang: paid.reduce((sum, item) => sum + item.amountSatang, 0),
        cashSatang: moneyByMethod("เงินสด"), transferSatang: moneyByMethod("โอนเงิน"),
        coverageCount: paid.filter(item => item.method === "สิทธิการรักษา").length, pendingTransfers,
      },
      executive:{
        previous:{visits:previousVisits,newPatients:previousNewPatients,appointments:previousAppointments,revenueSatang:previousPayments.reduce((sum,item)=>sum+item.amountSatang,0)},
        quality:{averageTriageWaitMinutes:triageWaitMinutes,averageDispenseMinutes:dispenseMinutes,noShowRate:appointments.length?Math.round(appointments.filter(item=>item.status==="no_show").length/appointments.length*100):0},
        budget:{fiscalYear,allocatedSatang,committedSatang,remainingSatang:allocatedSatang-committedSatang,utilizationPercent:allocatedSatang?Math.round(committedSatang/allocatedSatang*100):0},
      },
      evaluations:{
        system:{responses:systemEvaluations.length,average:decimalAverage(systemEvaluations.map(item=>item.serviceScore))},
        service:{responses:serviceEvaluations.length,overall:decimalAverage(serviceEvaluations.map(item=>item.qualityScore)),staff:decimalAverage(serviceEvaluations.map(item=>item.responsibilityScore)),speed:decimalAverage(serviceEvaluations.map(item=>item.serviceScore))},
      },
    });
  } catch {
    return NextResponse.json({ error: "ไม่สามารถดึงข้อมูลแดชบอร์ดจากฐานข้อมูลได้" }, { status: 503 });
  }
}
