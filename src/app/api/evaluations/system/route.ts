import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { optionalText, score, text } from "@/lib/api-validation";

export const runtime="nodejs";
const keys=["easeOfUse","speed","clarity","reliability","overall"] as const;
export async function POST(request:NextRequest){
  try{
    const body=await request.json() as Record<string,unknown>;
    const evaluatorKey=text(body.evaluatorKey),evaluatorName=text(body.evaluatorName),role=text(body.role);
    const scores=Object.fromEntries(keys.map(key=>[key,score((body.scores as Record<string,unknown>|undefined)?.[key])])) as Record<string,number|null>;
    if(!evaluatorKey||!evaluatorName||!role||Object.values(scores).some(value=>!value))return NextResponse.json({error:"กรุณาให้คะแนนทุกหัวข้อ"},{status:400});
    const values=Object.values(scores) as number[],average=Math.round(values.reduce((sum,value)=>sum+value,0)/values.length);
    const created=await getDb().evaluation.create({data:{employeeCode:evaluatorKey,employeeName:evaluatorName,evaluationRound:new Intl.DateTimeFormat("th-TH",{month:"long",year:"numeric",timeZone:"Asia/Bangkok"}).format(new Date()),qualityScore:scores.reliability!,responsibilityScore:scores.clarity!,serviceScore:average,feedback:optionalText(body.feedback),evaluatorKey,systemScores:scores,assessmentType:"system",assessedUserKey:evaluatorKey,assessedName:evaluatorName,assessedRole:role,anonymous:false,followupStatus:"received"}});
    return NextResponse.json({id:created.id,message:"บันทึกการประเมินระบบเรียบร้อยแล้ว"},{status:201});
  }catch{return NextResponse.json({error:"ไม่สามารถบันทึกการประเมินระบบได้"},{status:503});}
}
