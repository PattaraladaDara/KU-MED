import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { optionalText, score } from "@/lib/api-validation";
import { getAuthSession } from "@/lib/auth-session";

export const runtime="nodejs";
const keys=["easeOfUse","speed","clarity","reliability","overall"] as const;
export async function POST(request:NextRequest){
  try{
    const session=getAuthSession(request);
    if(!session)return NextResponse.json({error:"กรุณาเข้าสู่ระบบใหม่"},{status:401});
    const body=await request.json() as Record<string,unknown>;
    const account=await getDb().staffAccount.findUnique({where:{username:session.username},select:{firstName:true,lastName:true}});
    const evaluatorKey=session.username,evaluatorName=account?`${account.firstName} ${account.lastName}`:session.username,role=session.role;
    const scores=Object.fromEntries(keys.map(key=>[key,score((body.scores as Record<string,unknown>|undefined)?.[key])])) as Record<string,number|null>;
    if(Object.values(scores).some(value=>!value))return NextResponse.json({error:"กรุณาให้คะแนนทุกหัวข้อ"},{status:400});
    const values=Object.values(scores) as number[],average=Math.round(values.reduce((sum,value)=>sum+value,0)/values.length);
    const created=await getDb().evaluation.create({data:{employeeCode:evaluatorKey,employeeName:evaluatorName,evaluationRound:new Intl.DateTimeFormat("th-TH",{month:"long",year:"numeric",timeZone:"Asia/Bangkok"}).format(new Date()),qualityScore:scores.reliability!,responsibilityScore:scores.clarity!,serviceScore:average,feedback:optionalText(body.feedback),evaluatorKey,systemScores:scores,assessmentType:"system",assessedUserKey:evaluatorKey,assessedName:evaluatorName,assessedRole:role,anonymous:false,followupStatus:"received"}});
    return NextResponse.json({id:created.id,message:"บันทึกการประเมินระบบเรียบร้อยแล้ว"},{status:201});
  }catch{return NextResponse.json({error:"ไม่สามารถบันทึกการประเมินระบบได้"},{status:503});}
}
