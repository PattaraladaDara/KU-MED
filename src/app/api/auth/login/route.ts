import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { text } from "@/lib/api-validation";
import { validProfilePhoto } from "@/lib/profile-photo";
import { getSupportContact } from "@/lib/support-contact";
import { createSessionCookie } from "@/lib/auth-session";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const username = text(body.username).toLowerCase(), password = String(body.password ?? "");
    if (!username || !password) return NextResponse.json({ error: "กรุณากรอก Username และ Password" }, { status: 400 });
    const account = await getDb().staffAccount.findUnique({ where: { username } });
    if (!account || !(await verifyPassword(password, account.passwordHash)))
      return NextResponse.json({ error: "Username หรือ Password ไม่ถูกต้อง" }, { status: 401 });
    const statusMessage:Record<string,string>={pending_email:"กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ",pending_review:"คำขอบัญชีอยู่ระหว่างการตรวจสอบ",changes_requested:"คำขอถูกส่งกลับให้แก้ไข กรุณาติดต่อผู้ดูแลระบบ",rejected:"คำขอบัญชีไม่ได้รับการอนุมัติ",suspended:"บัญชีถูกระงับการใช้งาน",expired:"สิทธิ์การใช้งานหมดอายุ"};
    if(account.applicationStatus!=="approved"||!account.active)return NextResponse.json({error:statusMessage[account.applicationStatus]||"บัญชียังไม่พร้อมใช้งาน",applicationStatus:account.applicationStatus,supportContact:getSupportContact()},{status:403});
    const now=new Date();
    if((account.accessStartsAt&&account.accessStartsAt>now)||(account.accessEndsAt&&account.accessEndsAt<now))return NextResponse.json({error:"บัญชีอยู่นอกช่วงเวลาที่ได้รับอนุญาต กรุณาติดต่อผู้ดูแลระบบ",applicationStatus:"expired",supportContact:getSupportContact()},{status:403});
    if(account.licenseExpiresAt&&account.licenseExpiresAt<now)return NextResponse.json({error:"ใบอนุญาตประกอบวิชาชีพหมดอายุ กรุณาติดต่อผู้ดูแลระบบ",applicationStatus:"expired",supportContact:getSupportContact()},{status:403});
    await getDb().staffAccount.update({where:{id:account.id},data:{lastLoginAt:now}});
    const photo = await getDb().applicationMetadata.findUnique({ where: { key: `profile-photo:${account.id}` } });
    const response = NextResponse.json({ account: {
      username: account.username, role: account.role,
      displayName: `${account.firstName} ${account.lastName}`, medicalLicense: account.medicalLicense,
      avatarUrl: validProfilePhoto(photo?.value) ? photo.value : null,
    } });
    response.headers.append("Set-Cookie", createSessionCookie(account.username, account.role));
    return response;
  } catch {
    return NextResponse.json({ error: "ไม่สามารถเข้าสู่ระบบได้ กรุณาลองใหม่" }, { status: 503 });
  }
}
