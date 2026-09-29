import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { isUniqueError, optionalText, text } from "@/lib/api-validation";
import { parseBangkokDate, parseBangkokDateTime, THAI_TIME_ZONE } from "@/lib/thai-date";
import { ICD10_ENTRIES } from "@/lib/icd10";
import { addBusinessDays, isClinicTime, isWeekday } from "@/lib/business-date";

export const runtime = "nodejs";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id:string }> }) {
  try {
    const { id } = await params;
    const patient = await getDb().patient.findUnique({ where:{ id }, include:{
      treatments:{ orderBy:{ visitedAt:"desc" } }, appointments:{ orderBy:{ scheduledAt:"desc" } }, payments:{ orderBy:{ paidAt:"desc" },omit:{slipData:true} },
    } });
    if (!patient) return NextResponse.json({ error:"ไม่พบข้อมูลผู้ใช้บริการ" },{status:404});
    return NextResponse.json({ patient });
  } catch { return NextResponse.json({ error:"ไม่สามารถโหลดข้อมูลได้" },{status:503}); }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id:string }> }) {
  try {
    const { id } = await params; const body = await request.json() as Record<string,unknown>; const kind=text(body.kind);
    const patient=await getDb().patient.findUnique({where:{id},select:{id:true,coverage:true}});
    if (!patient) return NextResponse.json({error:"ไม่พบข้อมูลผู้ใช้บริการ"},{status:404});
    if (kind==="treatment") {
      const department=text(body.department),visitType=text(body.visitType);
      if(!department||!visitType)return NextResponse.json({error:"กรุณากรอกข้อมูลการรักษาให้ครบ"},{status:400});
      if(!["ห้องตรวจ1","ห้องตรวจ2","ห้องตรวจพิเศษ","ห้องตรวจ7 (ห้องหัตการ) ห้องสำหรับทำแผล"].includes(department))return NextResponse.json({error:"กรุณาเลือกห้องตรวจจากรายการที่กำหนด"},{status:400});
      const diagnosisCode=text(body.diagnosisCode).toUpperCase();
      const icd10=diagnosisCode?ICD10_ENTRIES.find((entry)=>entry.code===diagnosisCode):null;
      if(diagnosisCode&&!icd10)return NextResponse.json({error:"กรุณาเลือกรหัส ICD-10 จากรายการที่มีในระบบ"},{status:400});
      const diagnosis=icd10?.description||text(body.chiefComplaint)||"ไม่ระบุการวินิจฉัย";
      const numeric=(value:unknown)=>{const result=Number(value);return Number.isFinite(result)&&String(value).trim()?result:null;};
      const integer=(value:unknown)=>{const result=numeric(value);return result===null?null:Math.round(result);};
      const visitedAtText=text(body.visitedAt);const visitedAt=visitedAtText?parseBangkokDateTime(visitedAtText):new Date();
      const record=await getDb().treatmentRecord.create({data:{patientId:id,visitedAt,department,diagnosis,visitType,clinician:optionalText(body.clinician),paymentType:patient.coverage,visitNumber:optionalText(body.visitNumber),temperature:numeric(body.temperature),bloodPressure:optionalText(body.bloodPressure),pulse:integer(body.pulse),oxygenSaturation:integer(body.oxygenSaturation),weightKg:numeric(body.weightKg),heightCm:numeric(body.heightCm),chiefComplaint:optionalText(body.chiefComplaint),diagnosisCode:diagnosisCode||null,diagnosisName:icd10?.description??null,treatmentPlan:optionalText(body.treatmentPlan),medicationOrders:optionalText(body.medicationOrders)}});
      return NextResponse.json({record},{status:201});
    }
    if (kind==="appointment") {
      const scheduledAt=parseBangkokDateTime(text(body.scheduledAt)),department=text(body.department),reason=text(body.reason);
      if(Number.isNaN(scheduledAt.getTime())||!department||!reason)return NextResponse.json({error:"กรุณากรอกข้อมูลการนัดหมายให้ครบ"},{status:400});
      const endsAtText=text(body.endsAt);const endsAt=endsAtText?parseBangkokDateTime(endsAtText):null;
      const record=await getDb().appointment.create({data:{patientId:id,scheduledAt,endsAt:endsAt&&!Number.isNaN(endsAt.getTime())?endsAt:null,department,reason,clinician:optionalText(body.clinician),notes:optionalText(body.notes),result:optionalText(body.result),status:text(body.status)||"scheduled"}});
      return NextResponse.json({record},{status:201});
    }
    if (kind==="payment") {
      const amount=Number(body.amount),description=text(body.description),method=text(body.method);
      if(!Number.isFinite(amount)||amount<0||!description||!["เงินสด","โอนเงิน","สิทธิการรักษา"].includes(method))return NextResponse.json({error:"กรุณากรอกข้อมูลการชำระเงินให้ถูกต้อง"},{status:400});
      const amountSatang=Math.round(amount*100),stamp=Date.now(),referenceCode=`PAY-${stamp}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;
      const received=method==="เงินสด"?Number(body.receivedAmount):amount;
      if(method==="เงินสด"&&(!Number.isFinite(received)||received<amount))return NextResponse.json({error:"จำนวนเงินที่รับมาต้องไม่น้อยกว่ายอดชำระ"},{status:400});
      const receivedSatang=method==="เงินสด"?Math.round(received*100):null;
      const record=await getDb().payment.create({data:{patientId:id,description,method,amountSatang,referenceCode,receiptNumber:`RC-${new Date().getFullYear()}-${String(stamp).slice(-8)}`,status:method==="โอนเงิน"?"pending":"paid",receivedSatang,changeSatang:receivedSatang===null?null:receivedSatang-amountSatang,qrPayload:method==="โอนเงิน"?text(body.qrPayload)||`KUMED|${referenceCode}|THB|${amount.toFixed(2)}`:null,confirmedAt:method==="โอนเงิน"?null:new Date()}});
      return NextResponse.json({record},{status:201});
    }
    return NextResponse.json({error:"ประเภทรายการไม่ถูกต้อง"},{status:400});
  } catch { return NextResponse.json({error:"ไม่สามารถบันทึกรายการได้"},{status:503}); }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id:string }> }) {
  try {
    const {id}=await params;const body=await request.json() as Record<string,unknown>;
    if(text(body.kind)==="patient"){
      const required=["citizenId","studentId","status","title","firstName","lastName","birthDate","gender","faculty","major","studyYear","phone","email","coverage","coverageStatus"];
      if(required.some(key=>!text(body[key])))return NextResponse.json({error:"กรุณากรอกข้อมูลที่จำเป็นให้ครบ"},{status:400});
      const citizenId=text(body.citizenId).replace(/\D/g,"");
      if(citizenId.length!==13)return NextResponse.json({error:"เลขประจำตัวประชาชนต้องมี 13 หลัก"},{status:400});
      const birthDate=parseBangkokDate(text(body.birthDate));
      if(Number.isNaN(birthDate.getTime())||birthDate>new Date())return NextResponse.json({error:"วันเกิดไม่ถูกต้อง"},{status:400});
      const patient=await getDb().patient.update({where:{id},data:{citizenId,studentId:text(body.studentId),status:text(body.status),title:text(body.title),firstName:text(body.firstName),lastName:text(body.lastName),birthDate,gender:text(body.gender),bloodGroup:optionalText(body.bloodGroup),faculty:text(body.faculty),major:text(body.major),studyYear:text(body.studyYear),phone:text(body.phone),email:text(body.email).toLowerCase(),homeAddress:optionalText(body.homeAddress),currentAddress:optionalText(body.currentAddress),coverage:text(body.coverage),coverageStatus:text(body.coverageStatus),allergyNotes:optionalText(body.allergyNotes)}});
      return NextResponse.json({patient});
    }
    if(text(body.kind)==="appointment"){
      const appointmentId=text(body.appointmentId),scheduledDate=text(body.scheduledDate),scheduledTime=text(body.scheduledTime);
      const existing=await getDb().appointment.findFirst({where:{id:appointmentId,patientId:id}});
      if(!existing)return NextResponse.json({error:"ไม่พบรายการนัดหมาย"},{status:404});
      if(!/^\d{4}-\d{2}-\d{2}$/.test(scheduledDate)||!isWeekday(scheduledDate))return NextResponse.json({error:"วันนัดหมายต้องเป็นวันจันทร์–ศุกร์เท่านั้น"},{status:400});
      if(!isClinicTime(scheduledTime))return NextResponse.json({error:"เวลานัดหมายต้องอยู่ระหว่าง 09:00–15:00 น."},{status:400});
      const originalDate=new Intl.DateTimeFormat("sv-SE",{year:"numeric",month:"2-digit",day:"2-digit",timeZone:THAI_TIME_ZONE}).format(existing.scheduledAt);
      if(scheduledDate<originalDate&&scheduledDate<addBusinessDays(originalDate,-3))return NextResponse.json({error:"การเลื่อนนัดให้เร็วขึ้นทำได้ไม่เกิน 3 วันทำการ"},{status:400});
      const scheduledAt=parseBangkokDateTime(`${scheduledDate}T${scheduledTime}`);
      const duration=existing.endsAt?Math.max(0,existing.endsAt.getTime()-existing.scheduledAt.getTime()):0;
      const endsAt=duration?new Date(scheduledAt.getTime()+duration):null;
      const appointment=await getDb().appointment.update({where:{id:appointmentId},data:{scheduledAt,endsAt}});
      return NextResponse.json({appointment});
    }
    const recordId=text(body.recordId);
    const existing=await getDb().treatmentRecord.findFirst({where:{id:recordId,patientId:id},select:{id:true}});
    if(!existing)return NextResponse.json({error:"ไม่พบประวัติการรักษา"},{status:404});
    const department=text(body.department),visitType=text(body.visitType);
    if(!department||!visitType)return NextResponse.json({error:"กรุณากรอกข้อมูลการรักษาให้ครบ"},{status:400});
    if(!["ห้องตรวจ1","ห้องตรวจ2","ห้องตรวจพิเศษ","ห้องตรวจ7 (ห้องหัตการ) ห้องสำหรับทำแผล"].includes(department))return NextResponse.json({error:"กรุณาเลือกห้องตรวจจากรายการที่กำหนด"},{status:400});
    const diagnosisCode=text(body.diagnosisCode).toUpperCase();const icd10=diagnosisCode?ICD10_ENTRIES.find(entry=>entry.code===diagnosisCode):null;
    if(diagnosisCode&&!icd10)return NextResponse.json({error:"กรุณาเลือกรหัส ICD-10 จากรายการที่มีในระบบ"},{status:400});
    const diagnosis=icd10?.description||text(body.chiefComplaint)||"ไม่ระบุการวินิจฉัย";
    const visitedAt=parseBangkokDateTime(text(body.visitedAt));
    if(Number.isNaN(visitedAt.getTime()))return NextResponse.json({error:"วันที่เข้ารับบริการไม่ถูกต้อง"},{status:400});
    const record=await getDb().treatmentRecord.update({where:{id:recordId},data:{visitedAt,department,diagnosis,visitType,visitNumber:optionalText(body.visitNumber),clinician:optionalText(body.clinician),chiefComplaint:optionalText(body.chiefComplaint),diagnosisCode:diagnosisCode||null,diagnosisName:icd10?.description??null,treatmentPlan:optionalText(body.treatmentPlan),medicationOrders:optionalText(body.medicationOrders)}});
    return NextResponse.json({record});
  } catch(error) {
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
