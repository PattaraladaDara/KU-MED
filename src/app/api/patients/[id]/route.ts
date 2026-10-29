import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
import { getDb } from "@/lib/db";
import { isUniqueError, optionalText, text } from "@/lib/api-validation";
import { parseBangkokDate, parseBangkokDateTime, THAI_TIME_ZONE } from "@/lib/thai-date";
import { ICD10_ENTRIES } from "@/lib/icd10";
import { addBusinessDays, isWeekday } from "@/lib/business-date";
import { APPOINTMENT_REASONS, APPOINTMENT_ROOMS, isAppointmentTime } from "@/lib/appointment-options";
import { requirePermission } from "@/lib/auth-session";
import { parseMedicationOrderSnapshots } from "@/lib/medication-orders";

export const runtime = "nodejs";

class AppointmentSlotConflict extends Error {}

async function ensureAppointmentSlotAvailable(
  db: Prisma.TransactionClient,
  input: { patientId:string; department:string; clinician:string|null; scheduledAt:Date; excludeId?:string },
) {
  const existing = await db.appointment.findMany({
    where: {
      status: "scheduled",
      scheduledAt: input.scheduledAt,
      ...(input.excludeId ? { id: { not: input.excludeId } } : {}),
      OR: [
        { patientId: input.patientId },
        { department: input.department },
        ...(input.clinician ? [{ clinician: input.clinician }] : []),
      ],
    },
    select: { patientId:true, department:true, clinician:true },
  });
  if (existing.some(item => item.patientId === input.patientId)) throw new AppointmentSlotConflict("ผู้รับบริการมีนัดหมายในช่วงเวลานี้แล้ว");
  if (existing.some(item => item.department === input.department)) throw new AppointmentSlotConflict("ห้องตรวจนี้มีนัดหมายในช่วงเวลาดังกล่าวแล้ว กรุณาเลือกเวลาอื่น");
  if (input.clinician && existing.some(item => item.clinician?.trim().toLocaleLowerCase() === input.clinician!.trim().toLocaleLowerCase())) throw new AppointmentSlotConflict("ผู้ให้บริการมีนัดหมายในช่วงเวลาดังกล่าวแล้ว กรุณาเลือกเวลาอื่น");
}

function isSerializationConflict(error:unknown) {
  return typeof error === "object" && error !== null && "code" in error && (error as {code?:unknown}).code === "P2034";
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id:string }> }) {
  const auth = requirePermission(request, "patients:view");
  if (auth.response) return auth.response;
  try {
    const { id } = await params;
    const db=getDb();
    const patient = await db.patient.findUnique({ where:{ id }, include:{
      treatments:{ orderBy:{ visitedAt:"desc" },include:{medicationDispense:true} }, triageAssessments:{orderBy:{assessedAt:"desc"},take:10}, appointments:{ orderBy:{ scheduledAt:"desc" } }, payments:{ orderBy:{ paidAt:"desc" },omit:{slipData:true} }, statusChanges:{orderBy:{changedAt:"desc"},take:20},
    } });
    if (!patient) return NextResponse.json({ error:"ไม่พบข้อมูลผู้ใช้บริการ" },{status:404});
    // Keep the API response aligned with each role's work. Hiding a tab in the
    // client is not an access control boundary.
    const role = auth.session!.role;
    if (role === "pharmacist") {
      const { id: patientId, title, firstName, lastName, studentId, status, allergyNotes } = patient;
      return NextResponse.json({ patient: { id: patientId, title, firstName, lastName, studentId, status, allergyNotes, treatments: [], triageAssessments: [], appointments: [], payments: [], statusChanges: [] } });
    }
    if (role === "finance") {
      const { id: patientId, title, firstName, lastName, studentId, status, faculty, coverage, coverageStatus } = patient;
      return NextResponse.json({ patient: {
        id: patientId, title, firstName, lastName, studentId, status, faculty, coverage, coverageStatus,
        // Finance needs prescription totals to create a bill, not clinical notes.
        treatments: patient.treatments.map(({ id, visitedAt, medicationOrders }) => ({ id, visitedAt, medicationOrders })),
        payments: patient.payments, triageAssessments: [], appointments: [], statusChanges: [],
      } });
    }
    if (role === "staff") {
      return NextResponse.json({ patient: { ...patient, treatments: [], triageAssessments: [], payments: [] } });
    }
    if (role === "doctor") {
      const { id: patientId, title, firstName, lastName, studentId, status, birthDate, gender, bloodGroup, faculty, major, studyYear, phone, email, coverage, coverageStatus, allergyNotes } = patient;
      return NextResponse.json({ patient: {
        id: patientId, title, firstName, lastName, studentId, status, birthDate, gender, bloodGroup, faculty, major, studyYear, phone, email, coverage, coverageStatus, allergyNotes,
        treatments: patient.treatments, triageAssessments: patient.triageAssessments, appointments: patient.appointments, payments: [], statusChanges: [],
      } });
    }
    return NextResponse.json({ patient });
  } catch { return NextResponse.json({ error:"ไม่สามารถโหลดข้อมูลได้" },{status:503}); }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id:string }> }) {
  const body = await request.clone().json().catch(() => ({})) as Record<string, unknown>;
  const kind = text(body.kind);
  const permission = kind === "treatment" ? "clinical:write" : kind === "appointment" ? "appointments:manage" : kind === "payment" ? "payments:manage" : "patients:update";
  const auth = requirePermission(request, permission);
  if (auth.response) return auth.response;
  try {
    const { id } = await params;
    const patient=await getDb().patient.findUnique({where:{id},select:{id:true,coverage:true}});
    if (!patient) return NextResponse.json({error:"ไม่พบข้อมูลผู้ใช้บริการ"},{status:404});
    const actor = kind === "treatment" || kind === "payment" ? await getDb().staffAccount.findUnique({ where: { username: auth.session!.username }, select: { firstName: true, lastName: true } }) : null;
    if ((kind === "treatment" || kind === "payment") && !actor) return NextResponse.json({ error: "ไม่พบบัญชีผู้ปฏิบัติงาน" }, { status: 401 });
    const actorName = actor ? `${actor.firstName} ${actor.lastName}`.trim() || auth.session!.username : null;
    if (kind==="treatment") {
      const department=text(body.department),visitType=text(body.visitType);
      if(!department||!visitType)return NextResponse.json({error:"กรุณากรอกข้อมูลการรักษาให้ครบ"},{status:400});
      if(!["ห้องตรวจ1","ห้องตรวจ2","ห้องตรวจพิเศษ","ห้องตรวจ7 (ห้องหัตการ) ห้องสำหรับทำแผล"].includes(department))return NextResponse.json({error:"กรุณาเลือกห้องตรวจจากรายการที่กำหนด"},{status:400});
      const diagnosisCode=text(body.diagnosisCode).toUpperCase();
      const icd10=diagnosisCode?ICD10_ENTRIES.find((entry)=>entry.code===diagnosisCode):null;
      const customIcd10=diagnosisCode&&!icd10?await getDb().icd10CatalogEntry.findFirst({where:{code:diagnosisCode,active:true}}):null;
      if(diagnosisCode&&!icd10&&!customIcd10)return NextResponse.json({error:"ไม่พบรหัส ICD-10 นี้ในบัญชีกลาง กรุณาเว้นรหัสและกรอกชื่อการวินิจฉัย หรือให้ผู้ดูแลเพิ่มรหัสที่ตรวจสอบแล้ว"},{status:400});
      const diagnosisName=icd10?.description||customIcd10?.description||optionalText(body.diagnosisName,300);
      const triageAssessmentId=text(body.triageAssessmentId);const triage=triageAssessmentId?await getDb().triageAssessment.findFirst({where:{id:triageAssessmentId,patientId:id,treatmentRecord:null}}):await getDb().triageAssessment.findFirst({where:{patientId:id,treatmentRecord:null},orderBy:{assessedAt:"desc"}});
      if(triageAssessmentId&&!triage)return NextResponse.json({error:"ไม่พบข้อมูลคัดกรองที่พร้อมใช้ หรือข้อมูลนี้ถูกเชื่อมกับการตรวจแล้ว"},{status:404});
      const diagnosis=diagnosisName||triage?.chiefComplaint||text(body.chiefComplaint)||"ไม่ระบุการวินิจฉัย";
      let medicationOrders = optionalText(body.medicationOrders);
      if (body.medicationItems !== undefined) {
        let submitted: unknown;
        try { submitted = typeof body.medicationItems === "string" ? JSON.parse(body.medicationItems) : body.medicationItems; } catch { return NextResponse.json({ error: "ข้อมูลรายการยาไม่ถูกต้อง" }, { status: 400 }); }
        if (!Array.isArray(submitted) || submitted.length > 50) return NextResponse.json({ error: "รายการยาต้องเป็นรายการที่ถูกต้องและไม่เกิน 50 รายการ" }, { status: 400 });
        const orderInput = submitted as Record<string, unknown>[];
        if (orderInput.some(item => !item || typeof item.catalogItemId !== "string" || !Number.isFinite(Number(item.quantity)) || Number(item.quantity) <= 0 || Number(item.quantity) > 100000 || !text(item.directions))) return NextResponse.json({ error: "กรุณาระบุยา จำนวน และวิธีใช้ให้ครบถ้วน" }, { status: 400 });
        const catalogIds = orderInput.map(item => String(item.catalogItemId));
        const catalogItems = catalogIds.length ? await getDb().medicationCatalogItem.findMany({ where: { id: { in: catalogIds }, active: true } }) : [];
        if (catalogItems.length !== new Set(catalogIds).size) return NextResponse.json({ error: "มียาที่ไม่อยู่ในบัญชียาหรือถูกปิดใช้งาน กรุณาเลือกรายการใหม่" }, { status: 400 });
        const catalogById = new Map(catalogItems.map(item => [item.id, item]));
        const snapshots = orderInput.map(item => {
          const medication = catalogById.get(String(item.catalogItemId))!;
          const quantity = Number(item.quantity);
          return { catalogItemId: medication.id, code: medication.code, name: medication.name, strength: medication.strength, dosageForm: medication.dosageForm, unit: medication.unit, quantity, directions: text(item.directions) || medication.directions || "", indication: text(item.indication, 500) || medication.indication || "", unitPriceSatang: medication.unitPriceSatang, lineTotalSatang: Math.round(medication.unitPriceSatang * quantity) };
        });
        if (snapshots.some(item => !Number.isSafeInteger(item.lineTotalSatang))) return NextResponse.json({ error: "จำนวนยาสูงเกินกว่าที่ระบบรองรับ" }, { status: 400 });
        medicationOrders = snapshots.length ? JSON.stringify(snapshots) : null;
      }
      const numeric=(value:unknown)=>{const result=Number(value);return Number.isFinite(result)&&String(value).trim()?result:null;};
      const integer=(value:unknown)=>{const result=numeric(value);return result===null?null:Math.round(result);};
      // Use authoritative server time so the service timestamp cannot be edited in the browser.
      const visitedAt=new Date();
      const appointmentId=text(body.appointmentId);const linkedAppointment=appointmentId?await getDb().appointment.findFirst({where:{id:appointmentId,patientId:id,status:{in:["scheduled","no_show"]}}}):null;
      if(appointmentId&&!linkedAppointment)return NextResponse.json({error:"ไม่พบรายการนัดหมายที่รอบันทึกผลการตรวจ"},{status:404});
      const visitDate=new Intl.DateTimeFormat("sv-SE",{year:"numeric",month:"2-digit",day:"2-digit",timeZone:THAI_TIME_ZONE}).format(visitedAt);
      if(linkedAppointment){const appointmentDate=new Intl.DateTimeFormat("sv-SE",{year:"numeric",month:"2-digit",day:"2-digit",timeZone:THAI_TIME_ZONE}).format(linkedAppointment.scheduledAt);const today=new Intl.DateTimeFormat("sv-SE",{year:"numeric",month:"2-digit",day:"2-digit",timeZone:THAI_TIME_ZONE}).format(new Date());if(appointmentDate!==today||visitDate!==appointmentDate)return NextResponse.json({error:"บันทึกการตรวจตามนัดได้เฉพาะในวันนัดหมาย"},{status:400});}
      const record=await getDb().$transaction(async db=>{
        const created=await db.treatmentRecord.create({data:{patientId:id,visitedAt,department,diagnosis,visitType,clinician:auth.session!.role==="nurse"?`พยาบาล ${actorName}`:actorName,createdByUsername:auth.session!.username,createdByName:actorName,createdByRole:auth.session!.role,paymentType:patient.coverage,visitNumber:optionalText(body.visitNumber),temperature:triage?.temperature??numeric(body.temperature),bloodPressure:triage?.bloodPressure??optionalText(body.bloodPressure),pulse:triage?.pulse??integer(body.pulse),oxygenSaturation:triage?.oxygenSaturation??integer(body.oxygenSaturation),weightKg:triage?.weightKg??numeric(body.weightKg),heightCm:triage?.heightCm??numeric(body.heightCm),chiefComplaint:triage?.chiefComplaint??optionalText(body.chiefComplaint),diagnosisCode:diagnosisCode||null,diagnosisName,treatmentPlan:optionalText(body.treatmentPlan),suppliesUsed:optionalText(body.suppliesUsed),medicationOrders,appointmentId:linkedAppointment?.id??null,triageAssessmentId:triage?.id??null,visitSource:linkedAppointment?"appointment":"walk_in",appointmentReason:linkedAppointment?.reason??null,appointmentScheduledAt:linkedAppointment?.scheduledAt??null}});
        if(linkedAppointment)await db.appointment.update({where:{id:linkedAppointment.id},data:{status:"completed"}});
        return created;
      });
      return NextResponse.json({record},{status:201});
    }
    if (kind==="appointment") {
      const scheduledDate=text(body.scheduledDate),scheduledTime=text(body.scheduledTime),department=text(body.department),reason=text(body.reason);
      if(!/^\d{4}-\d{2}-\d{2}$/.test(scheduledDate)||!isWeekday(scheduledDate))return NextResponse.json({error:"วันนัดหมายต้องเป็นวันจันทร์–ศุกร์เท่านั้น"},{status:400});
      const today=new Intl.DateTimeFormat("sv-SE",{year:"numeric",month:"2-digit",day:"2-digit",timeZone:THAI_TIME_ZONE}).format(new Date());
      if(scheduledDate<today)return NextResponse.json({error:"วันที่นัดหมายต้องเป็นวันนี้หรือวันถัดไป"},{status:400});
      if(!isAppointmentTime(scheduledTime))return NextResponse.json({error:"เลือกเวลาได้เฉพาะ 09:00–11:30 น. และ 13:00–15:00 น."},{status:400});
      if(!(APPOINTMENT_ROOMS as readonly string[]).includes(department))return NextResponse.json({error:"กรุณาเลือกห้องตรวจจากรายการที่กำหนด"},{status:400});
      if(!(APPOINTMENT_REASONS as readonly string[]).includes(reason))return NextResponse.json({error:"กรุณาเลือกเหตุผลการนัดหมายจากรายการที่กำหนด"},{status:400});
      const scheduledAt=parseBangkokDateTime(`${scheduledDate}T${scheduledTime}`),endsAt=new Date(scheduledAt.getTime()+30*60000);
      const createdAt=new Date(),createdDate=new Intl.DateTimeFormat("sv-SE",{year:"numeric",month:"2-digit",day:"2-digit",timeZone:THAI_TIME_ZONE}).format(createdAt);
      const serviceDayStart=parseBangkokDateTime(`${createdDate}T00:00`);
      const originTreatment=await getDb().treatmentRecord.findFirst({where:{patientId:id,visitedAt:{gte:serviceDayStart,lte:createdAt}},orderBy:{visitedAt:"desc"},select:{id:true}});
      const clinician=optionalText(body.clinician);
      const record=await getDb().$transaction(async tx=>{
        await ensureAppointmentSlotAvailable(tx,{patientId:id,department,clinician,scheduledAt});
        return tx.appointment.create({data:{patientId:id,scheduledAt,endsAt,department,reason,clinician,notes:optionalText(body.notes),result:null,status:"scheduled",originTreatmentId:originTreatment?.id??null}});
      },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
      return NextResponse.json({record},{status:201});
    }
        if (kind==="payment") {
      const method=text(body.method);
      if(!["เงินสด","โอนเงิน","สิทธิการรักษา"].includes(method))return NextResponse.json({error:"กรุณาเลือกวิธีชำระเงินให้ถูกต้อง"},{status:400});
      const treatmentRecordId=text(body.medicationTreatmentRecordId);
      let medicationTotalSatang=0;
      let medicationDescriptions:string[]=[];
      if(treatmentRecordId){
        const treatment=await getDb().treatmentRecord.findFirst({where:{id:treatmentRecordId,patientId:id}});
        if(!treatment)return NextResponse.json({error:"ไม่พบใบสั่งยาสำหรับผู้ป่วยรายนี้"},{status:404});
        const existingPayment=await getDb().payment.findUnique({where:{treatmentRecordId},select:{id:true}});
        if(existingPayment)return NextResponse.json({error:"ใบสั่งยานี้ถูกนำไปคิดเงินแล้ว"},{status:409});
        const orderedItems=parseMedicationOrderSnapshots(treatment.medicationOrders);
        if(!orderedItems.length)return NextResponse.json({error:"ใบสั่งยานี้ไม่มีข้อมูลราคายาสำหรับคิดเงิน"},{status:400});
        medicationTotalSatang=orderedItems.reduce((sum,item)=>sum+item.lineTotalSatang,0);
        medicationDescriptions=orderedItems.map(item=>`${item.name} ${item.strength} ${item.quantity} ${item.unit} — ${(item.lineTotalSatang/100).toFixed(2)} บาท`);
      }
      let serviceTotalSatang=0;
      const serviceDescriptions:string[]=[];
      if(!Array.isArray(body.serviceItems))return NextResponse.json({error:"กรุณาเลือกค่าบริการจากบัญชีกลางก่อนบันทึก"},{status:400});
      const serviceItems=body.serviceItems as Record<string,unknown>[];
      if(serviceItems.length>30)return NextResponse.json({error:"เพิ่มค่าบริการได้ไม่เกิน 30 รายการ"},{status:400});
      if(serviceItems.some(item=>!item||!text(item.catalogItemId)))return NextResponse.json({error:"ค่าบริการทุกรายการต้องเลือกจากบัญชีกลาง"},{status:400});
      const serviceCatalogIds=serviceItems.map(item=>text(item.catalogItemId));
      const serviceCatalogRows=serviceCatalogIds.length?await getDb().serviceCatalogItem.findMany({where:{id:{in:serviceCatalogIds},active:true}}):[];
      const serviceCatalogById=new Map(serviceCatalogRows.map(item=>[item.id,item]));
      for(const item of serviceItems){
        const catalogId=text(item.catalogItemId),catalogItem=serviceCatalogById.get(catalogId),quantity=Number(item.quantity);
        if(!catalogItem||!Number.isFinite(quantity)||quantity<=0||quantity>100000)return NextResponse.json({error:"ค่าบริการบางรายการถูกปิดหรือจำนวนไม่ถูกต้อง กรุณาโหลดรายการใหม่"},{status:400});
        const itemSatang=Math.round(catalogItem.unitPriceSatang*quantity);
        if(!Number.isSafeInteger(itemSatang))return NextResponse.json({error:"จำนวนค่าบริการสูงเกินกว่าระบบรองรับ"},{status:400});
        serviceTotalSatang+=itemSatang;
        serviceDescriptions.push(`${catalogItem.name} ${quantity} ${catalogItem.unit} — ${(itemSatang/100).toFixed(2)} บาท`);
      }
      const amountSatang=medicationTotalSatang+serviceTotalSatang;
      const description=[...medicationDescriptions,...serviceDescriptions].join("\n");
      if(!amountSatang||!description)return NextResponse.json({error:"ยอดชำระต้องมากกว่าศูนย์"},{status:400});
      const stamp=Date.now(),referenceCode=`PAY-${stamp}-${randomBytes(3).toString("hex").toUpperCase()}`;
      const received=method==="เงินสด"?Number(body.receivedAmount):amountSatang/100;
      if(method==="เงินสด"&&(!Number.isFinite(received)||received<amountSatang/100))return NextResponse.json({error:"จำนวนเงินที่รับมาต้องไม่น้อยกว่ายอดชำระ"},{status:400});
      const receivedSatang=method==="เงินสด"?Math.round(received*100):null;
      const record=await getDb().payment.create({data:{patientId:id,treatmentRecordId:treatmentRecordId||null,description,method,amountSatang,referenceCode,createdByUsername:auth.session!.username,createdByName:actorName,createdByRole:auth.session!.role,receiptNumber:`RC-${new Date().getFullYear()}-${String(stamp).slice(-8)}`,status:method==="โอนเงิน"?"pending":"paid",receivedSatang,changeSatang:receivedSatang===null?null:receivedSatang-amountSatang,qrPayload:method==="โอนเงิน"?text(body.qrPayload)||`KUMED|${referenceCode}|THB|${(amountSatang/100).toFixed(2)}`:null,confirmedAt:method==="โอนเงิน"?null:new Date()}});
      return NextResponse.json({record},{status:201});
    }
return NextResponse.json({error:"ประเภทรายการไม่ถูกต้อง"},{status:400});
  } catch(error) { if(error instanceof AppointmentSlotConflict)return NextResponse.json({error:error.message},{status:409});if(isSerializationConflict(error))return NextResponse.json({error:"มีผู้จองช่วงเวลานี้พร้อมกัน กรุณาโหลดข้อมูลใหม่และเลือกเวลาอื่น"},{status:409});if(isUniqueError(error))return NextResponse.json({error:"ใบสั่งยานี้ถูกนำไปคิดเงินแล้ว"},{status:409}); return NextResponse.json({error:"ไม่สามารถบันทึกรายการได้"},{status:503}); }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id:string }> }) {
  const body = await request.clone().json().catch(() => ({})) as Record<string, unknown>;
  const kind = text(body.kind);
  const permission = kind === "appointment" ? "appointments:manage" : kind === "patient" ? "patients:update" : "clinical:write";
  const auth = requirePermission(request, permission);
  if (auth.response) return auth.response;
  try {
    const {id}=await params;
    if(text(body.kind)==="patient"){
      const required=["citizenId","studentId","title","firstName","lastName","birthDate","gender","faculty","major","studyYear","phone","email","coverage"];
      if(required.some(key=>!text(body[key])))return NextResponse.json({error:"กรุณากรอกข้อมูลที่จำเป็นให้ครบ"},{status:400});
      const citizenId=text(body.citizenId).replace(/\D/g,"");
      if(citizenId.length!==13)return NextResponse.json({error:"เลขประจำตัวประชาชนต้องมี 13 หลัก"},{status:400});
      const birthDate=parseBangkokDate(text(body.birthDate));
      if(Number.isNaN(birthDate.getTime())||birthDate>new Date())return NextResponse.json({error:"วันเกิดไม่ถูกต้อง"},{status:400});
      const patient=await getDb().patient.update({where:{id},data:{citizenId,studentId:text(body.studentId),title:text(body.title),firstName:text(body.firstName),lastName:text(body.lastName),birthDate,gender:text(body.gender),bloodGroup:optionalText(body.bloodGroup),faculty:text(body.faculty),major:text(body.major),studyYear:text(body.studyYear),phone:text(body.phone),email:text(body.email).toLowerCase(),homeAddress:optionalText(body.homeAddress),currentAddress:optionalText(body.currentAddress),coverage:text(body.coverage),allergyNotes:optionalText(body.allergyNotes)}});
      return NextResponse.json({patient});
    }
    if(text(body.kind)==="appointment"){
      const appointmentId=text(body.appointmentId),scheduledDate=text(body.scheduledDate),scheduledTime=text(body.scheduledTime);
      const existing=await getDb().appointment.findFirst({where:{id:appointmentId,patientId:id}});
      if(!existing)return NextResponse.json({error:"ไม่พบรายการนัดหมาย"},{status:404});
      if(existing.status!=="scheduled")return NextResponse.json({error:"เลื่อนได้เฉพาะนัดหมายที่ยังรอรับบริการ"},{status:409});
      if(!/^\d{4}-\d{2}-\d{2}$/.test(scheduledDate)||!isWeekday(scheduledDate))return NextResponse.json({error:"วันนัดหมายต้องเป็นวันจันทร์–ศุกร์เท่านั้น"},{status:400});
      if(!isAppointmentTime(scheduledTime))return NextResponse.json({error:"เลือกเวลาได้เฉพาะ 09:00–11:30 น. และ 13:00–15:00 น."},{status:400});
      const originalDate=new Intl.DateTimeFormat("sv-SE",{year:"numeric",month:"2-digit",day:"2-digit",timeZone:THAI_TIME_ZONE}).format(existing.scheduledAt);
      if(scheduledDate<originalDate&&scheduledDate<addBusinessDays(originalDate,-3))return NextResponse.json({error:"การเลื่อนนัดให้เร็วขึ้นทำได้ไม่เกิน 3 วันทำการ"},{status:400});
      const scheduledAt=parseBangkokDateTime(`${scheduledDate}T${scheduledTime}`);
      const duration=existing.endsAt?Math.max(0,existing.endsAt.getTime()-existing.scheduledAt.getTime()):0;
      const endsAt=duration?new Date(scheduledAt.getTime()+duration):null;
      const appointment=await getDb().$transaction(async tx=>{
        await ensureAppointmentSlotAvailable(tx,{patientId:id,department:existing.department,clinician:existing.clinician,scheduledAt,excludeId:appointmentId});
        return tx.appointment.update({where:{id:appointmentId},data:{scheduledAt,endsAt}});
      },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
      return NextResponse.json({appointment});
    }
    const recordId=text(body.recordId);
    const existing=await getDb().treatmentRecord.findFirst({where:{id:recordId,patientId:id},select:{id:true}});
    if(!existing)return NextResponse.json({error:"ไม่พบประวัติการรักษา"},{status:404});
    const department=text(body.department),visitType=text(body.visitType);
    if(!department||!visitType)return NextResponse.json({error:"กรุณากรอกข้อมูลการรักษาให้ครบ"},{status:400});
    if(!["ห้องตรวจ1","ห้องตรวจ2","ห้องตรวจพิเศษ","ห้องตรวจ7 (ห้องหัตการ) ห้องสำหรับทำแผล"].includes(department))return NextResponse.json({error:"กรุณาเลือกห้องตรวจจากรายการที่กำหนด"},{status:400});
    const diagnosisCode=text(body.diagnosisCode).toUpperCase();const icd10=diagnosisCode?ICD10_ENTRIES.find(entry=>entry.code===diagnosisCode):null;
    const customIcd10=diagnosisCode&&!icd10?await getDb().icd10CatalogEntry.findFirst({where:{code:diagnosisCode,active:true}}):null;
    if(diagnosisCode&&!icd10&&!customIcd10)return NextResponse.json({error:"ไม่พบรหัส ICD-10 นี้ในบัญชีกลาง กรุณาเว้นรหัสและกรอกชื่อการวินิจฉัย หรือให้ผู้ดูแลเพิ่มรหัสที่ตรวจสอบแล้ว"},{status:400});
    const diagnosisName=icd10?.description||customIcd10?.description||optionalText(body.diagnosisName,300);
    const diagnosis=diagnosisName||text(body.chiefComplaint)||"ไม่ระบุการวินิจฉัย";
    const visitedAt=parseBangkokDateTime(text(body.visitedAt));
    if(Number.isNaN(visitedAt.getTime()))return NextResponse.json({error:"วันที่เข้ารับบริการไม่ถูกต้อง"},{status:400});
    const record=await getDb().treatmentRecord.update({where:{id:recordId},data:{visitedAt,department,diagnosis,visitType,visitNumber:optionalText(body.visitNumber),clinician:optionalText(body.clinician),chiefComplaint:optionalText(body.chiefComplaint),diagnosisCode:diagnosisCode||null,diagnosisName,treatmentPlan:optionalText(body.treatmentPlan),suppliesUsed:optionalText(body.suppliesUsed),...(body.medicationOrders!==undefined?{medicationOrders:optionalText(body.medicationOrders)}:{})}});
    return NextResponse.json({record});
  } catch(error) {
    if(error instanceof AppointmentSlotConflict)return NextResponse.json({error:error.message},{status:409});
    if(isSerializationConflict(error))return NextResponse.json({error:"มีผู้จองช่วงเวลานี้พร้อมกัน กรุณาโหลดข้อมูลใหม่และเลือกเวลาอื่น"},{status:409});
    if(isUniqueError(error))return NextResponse.json({error:"เลขประชาชน รหัสนิสิต หรืออีเมลนี้มีในระบบแล้ว"},{status:409});
    return NextResponse.json({error:"ไม่สามารถแก้ไขข้อมูลได้"},{status:503});
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id:string }> }) {
  try {
    const {id}=await params;const body=await request.json() as Record<string,unknown>;const recordId=text(body.recordId);
    const deleted=await getDb().treatmentRecord.deleteMany({where:{id:recordId,patientId:id}});
    if(!deleted.count)return NextResponse.json({error:"ไม่พบประวัติการรักษา"},{status:404});
    return NextResponse.json({deleted:true});
  } catch { return NextResponse.json({error:"ไม่สามารถลบประวัติการรักษาได้"},{status:503}); }
}
