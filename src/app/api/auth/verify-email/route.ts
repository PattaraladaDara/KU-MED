import { NextRequest,NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { getDb } from "@/lib/db";
import { text } from "@/lib/api-validation";

export const runtime="nodejs";

export async function POST(request:NextRequest){
  try{
    const body=await request.json() as Record<string,unknown>,username=text(body.username).toLowerCase(),code=text(body.code);
    if(!username||!/^[0-9]{6}$/.test(code))return NextResponse.json({error:"กรุณากรอกรหัสยืนยัน 6 หลัก"},{status:400});
    const db=getDb(),account=await db.staffAccount.findUnique({where:{username}});
    if(!account)return NextResponse.json({error:"ไม่พบบัญชีที่ต้องการยืนยัน"},{status:404});
    if(account.emailVerifiedAt)return NextResponse.json({account:{username:account.username,applicationStatus:account.applicationStatus}});
    const hash=createHash("sha256").update(code).digest("hex");
    if(!account.verificationCodeHash||account.verificationCodeHash!==hash||!account.verificationExpiresAt||account.verificationExpiresAt<new Date())return NextResponse.json({error:"รหัสยืนยันไม่ถูกต้องหรือหมดอายุแล้ว"},{status:400});
    const updated=await db.$transaction(async tx=>{const result=await tx.staffAccount.update({where:{id:account.id},data:{emailVerifiedAt:new Date(),verificationCodeHash:null,verificationExpiresAt:null,applicationStatus:"pending_review"},select:{username:true,email:true,applicationStatus:true}});await tx.accountAuditLog.create({data:{accountId:account.id,actorKey:account.username,action:"email_verified",fromStatus:account.applicationStatus,toStatus:"pending_review"}});return result;});
    return NextResponse.json({account:updated,message:"ยืนยันอีเมลสำเร็จ คำขอถูกส่งให้ผู้ดูแลระบบตรวจสอบแล้ว"});
  }catch{return NextResponse.json({error:"ไม่สามารถยืนยันอีเมลได้ กรุณาลองใหม่"},{status:503});}
}
