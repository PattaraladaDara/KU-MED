import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { optionalText, text } from "@/lib/api-validation";

export const runtime = "nodejs";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id:string }> }) {
  try {
    const { id } = await params;
    const patient = await getDb().patient.findUnique({ where:{ id }, include:{
      treatments:{ orderBy:{ visitedAt:"desc" } }, appointments:{ orderBy:{ scheduledAt:"desc" } }, payments:{ orderBy:{ paidAt:"desc" } },
    } });
    if (!patient) return NextResponse.json({ error:"ไม่พบข้อมูลผู้ใช้บริการ" },{status:404});
    return NextResponse.json({ patient });
  } catch { return NextResponse.json({ error:"ไม่สามารถโหลดข้อมูลได้" },{status:503}); }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id:string }> }) {
  try {
    const { id } = await params; const body = await request.json() as Record<string,unknown>; const kind=text(body.kind);
    if (!await getDb().patient.findUnique({where:{id},select:{id:true}})) return NextResponse.json({error:"ไม่พบข้อมูลผู้ใช้บริการ"},{status:404});
    if (kind==="treatment") {
      const department=text(body.department),diagnosis=text(body.diagnosis),visitType=text(body.visitType);
      if(!department||!diagnosis||!visitType)return NextResponse.json({error:"กรุณากรอกข้อมูลการรักษาให้ครบ"},{status:400});
      const numeric=(value:unknown)=>{const result=Number(value);return Number.isFinite(result)&&String(value).trim()?result:null;};
      const integer=(value:unknown)=>{const result=numeric(value);return result===null?null:Math.round(result);};
      const record=await getDb().treatmentRecord.create({data:{patientId:id,visitedAt:new Date(text(body.visitedAt)||Date.now()),department,diagnosis,visitType,clinician:optionalText(body.clinician),paymentType:optionalText(body.paymentType),visitNumber:optionalText(body.visitNumber),temperature:numeric(body.temperature),bloodPressure:optionalText(body.bloodPressure),pulse:integer(body.pulse),oxygenSaturation:integer(body.oxygenSaturation),weightKg:numeric(body.weightKg),heightCm:numeric(body.heightCm),chiefComplaint:optionalText(body.chiefComplaint),diagnosisCode:optionalText(body.diagnosisCode),diagnosisName:optionalText(body.diagnosisName),treatmentPlan:optionalText(body.treatmentPlan),medicationOrders:optionalText(body.medicationOrders)}});
      return NextResponse.json({record},{status:201});
    }
    if (kind==="appointment") {
      const scheduledAt=new Date(text(body.scheduledAt)),department=text(body.department),reason=text(body.reason);
      if(Number.isNaN(scheduledAt.getTime())||!department||!reason)return NextResponse.json({error:"กรุณากรอกข้อมูลการนัดหมายให้ครบ"},{status:400});
      const endsAtText=text(body.endsAt);const endsAt=endsAtText?new Date(endsAtText):null;
      const record=await getDb().appointment.create({data:{patientId:id,scheduledAt,endsAt:endsAt&&!Number.isNaN(endsAt.getTime())?endsAt:null,department,reason,clinician:optionalText(body.clinician),notes:optionalText(body.notes),result:optionalText(body.result),status:text(body.status)||"scheduled"}});
      return NextResponse.json({record},{status:201});
    }
    if (kind==="payment") {
      const amount=Number(body.amount),description=text(body.description),method=text(body.method);
      if(!Number.isFinite(amount)||amount<0||!description||!method)return NextResponse.json({error:"กรุณากรอกข้อมูลการชำระเงินให้ถูกต้อง"},{status:400});
      const record=await getDb().payment.create({data:{patientId:id,description,method,amountSatang:Math.round(amount*100),referenceCode:`PAY-${Date.now()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`,status:"paid"}});
      return NextResponse.json({record},{status:201});
    }
    return NextResponse.json({error:"ประเภทรายการไม่ถูกต้อง"},{status:400});
  } catch { return NextResponse.json({error:"ไม่สามารถบันทึกรายการได้"},{status:503}); }
}
