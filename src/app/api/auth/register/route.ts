import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { text } from "@/lib/api-validation";
import { validProfilePhoto } from "@/lib/profile-photo";
import { createHash, randomInt } from "node:crypto";
import { sendVerificationEmail } from "@/lib/email";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const firstName = text(body.firstName), lastName = text(body.lastName);
    const role = "doctor", medicalLicense = text(body.medicalLicense);
    const email = text(body.email).toLowerCase(), phone = text(body.phone), organization = text(body.organization);
    const licenseExpiresAt = text(body.licenseExpiresAt);
    const username = text(body.username).toLowerCase(), password = String(body.password ?? "");
    const avatarUrl = body.avatarUrl;
    if (avatarUrl && !validProfilePhoto(avatarUrl)) return NextResponse.json({ error: "รูปโปรไฟล์ไม่ถูกต้องหรือมีขนาดใหญ่เกินไป" }, { status: 400 });
    if (!firstName || !lastName || !medicalLicense || !email || !phone || !organization || !username || !password)
      return NextResponse.json({ error: "กรุณากรอกข้อมูลทุกช่อง" }, { status: 400 });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "รูปแบบอีเมลไม่ถูกต้อง" }, { status: 400 });
    if (!/^[0-9+()\-\s]{8,20}$/.test(phone)) return NextResponse.json({ error: "รูปแบบหมายเลขโทรศัพท์ไม่ถูกต้อง" }, { status: 400 });
    if (body.acceptTerms !== true) return NextResponse.json({ error: "กรุณารับรองความถูกต้องของข้อมูลและยอมรับเงื่อนไขการใช้งาน" }, { status: 400 });
    if (!/^[a-z0-9._-]{4,40}$/i.test(username))
      return NextResponse.json({ error: "Username ต้องมี 4–40 ตัว และใช้ตัวอักษรอังกฤษ ตัวเลข จุด ขีดกลาง หรือขีดล่าง" }, { status: 400 });
    if (password.length < 8)
      return NextResponse.json({ error: "Password ต้องมีอย่างน้อย 8 ตัวอักษร" }, { status: 400 });
    const duplicate = await getDb().staffAccount.findFirst({ where: { OR: [{ username }, { medicalLicense }, { email }] }, select: { username: true,medicalLicense:true,email:true } });
    if (duplicate) return NextResponse.json({ error: duplicate.username === username ? "Username นี้ถูกใช้แล้ว" : duplicate.email === email ? "อีเมลนี้ถูกลงทะเบียนแล้ว" : "เลขใบอนุญาตนี้ถูกลงทะเบียนแล้ว" }, { status: 409 });
    const verificationCode=String(randomInt(100000,1000000)),verificationCodeHash=createHash("sha256").update(verificationCode).digest("hex");
    const parsedExpiry=licenseExpiresAt?new Date(`${licenseExpiresAt}T12:00:00+07:00`):null;
    if(parsedExpiry&&Number.isNaN(parsedExpiry.getTime()))return NextResponse.json({error:"วันหมดอายุใบอนุญาตไม่ถูกต้อง"},{status:400});
    const account = await getDb().$transaction(async db => {
    const created = await db.staffAccount.create({ data: {
      firstName,lastName,role,medicalLicense,email,phone,organization,licenseExpiresAt:parsedExpiry,username,passwordHash:await hashPassword(password),active:false,applicationStatus:"pending_email",verificationCodeHash,verificationExpiresAt:new Date(Date.now()+15*60*1000),
    }, select: { id:true,username:true,firstName:true,lastName:true,role:true,medicalLicense:true,email:true,applicationStatus:true } });
    if (validProfilePhoto(avatarUrl)) await db.applicationMetadata.create({ data: { key: `profile-photo:${created.id}`, value: avatarUrl } });
    await db.accountAuditLog.create({data:{accountId:created.id,actorKey:username,action:"registration_submitted",toStatus:"pending_email",note:"ส่งคำขอลงทะเบียนบัญชีแพทย์ภายนอก"}});
    return created;
    });
    const mockEmail=process.env.AUTH_EMAIL_MOCK!=="false";
    if(!mockEmail){
      try{await sendVerificationEmail({...account,email},verificationCode);}
      catch(error){
        await getDb().staffAccount.delete({where:{id:account.id}}).catch(()=>undefined);
        console.error("Unable to send registration OTP",error);
        return NextResponse.json({error:"ไม่สามารถส่งรหัส OTP ไปยังอีเมลได้ กรุณาตรวจสอบการตั้งค่าอีเมลหรือลองใหม่"},{status:503});
      }
    }
    return NextResponse.json({account,demoVerificationCode:mockEmail?verificationCode:undefined,message:mockEmail?"สร้างรหัส OTP สำหรับระบบจำลองแล้ว":"ส่งรหัส OTP ไปยังอีเมลแล้ว"},{status:201});
  } catch(error) {
    console.error("Unable to create account",error);
    return NextResponse.json({ error: "ไม่สามารถสร้างบัญชีได้ กรุณาลองใหม่" }, { status: 503 });
  }
}
