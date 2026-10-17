import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { isUniqueError, text } from "@/lib/api-validation";

export const runtime = "nodejs";

const fallbackAdmin = "demo-admin";
const label = (role:string) => ({admin:"ผู้ดูแลระบบหลัก",doctor:"แพทย์",staff:"เจ้าหน้าที่เวชระเบียน",nurse:"พยาบาล",pharmacist:"เภสัชกร",finance:"เจ้าหน้าที่การเงิน",executive:"ผู้บริหารสถานพยาบาล"}[role]||role);
const canEditContact = (account:{role:string;authProvider:string}|null) => account?.role === "doctor" && account.authProvider === "local";

export async function GET(request:NextRequest) {
  try {
    const userKey = text(request.nextUrl.searchParams.get("userKey")) || fallbackAdmin;
    const db = getDb();
    const account = userKey === fallbackAdmin ? null : await db.staffAccount.findUnique({where:{username:userKey}});
    const role = account?.role || "admin";
    const stored = await db.userSettings.findUnique({where:{userKey}});
    const settings = {
      userKey,
      displayName: account ? `${account.firstName} ${account.lastName}` : stored?.displayName || "ผู้ดูแลระบบหลัก",
      role: label(role),
      email: account?.email || stored?.email || "",
      phone: account?.phone || stored?.phone || "",
      notifyAnnouncements: stored?.notifyAnnouncements ?? true,
      notifyMonthlyReports: stored?.notifyMonthlyReports ?? true,
      notifySecurity: stored?.notifySecurity ?? true,
    };
    return NextResponse.json({settings,policy:{authProvider:account?.authProvider || "local",canEditContact:canEditContact(account)}});
  } catch {
    return NextResponse.json({error:"ไม่สามารถโหลดการตั้งค่าได้"},{status:503});
  }
}

export async function PUT(request:NextRequest) {
  try {
    const body = await request.json() as Record<string,unknown>;
    const userKey = text(body.userKey) || fallbackAdmin;
    const db = getDb();
    const account = userKey === fallbackAdmin ? null : await db.staffAccount.findUnique({where:{username:userKey}});
    const stored = await db.userSettings.findUnique({where:{userKey}});
    const contactEditable = canEditContact(account);
    const requestedEmail = text(body.email).toLowerCase();
    const requestedPhone = text(body.phone);
    if (contactEditable && (!requestedEmail || !requestedPhone)) {
      return NextResponse.json({error:"กรุณากรอกอีเมลและหมายเลขโทรศัพท์"},{status:400});
    }
    const displayName = account ? `${account.firstName} ${account.lastName}` : stored?.displayName || "ผู้ดูแลระบบหลัก";
    const role = label(account?.role || "admin");
    const email = contactEditable ? requestedEmail : account?.email || stored?.email || "";
    const phone = contactEditable ? requestedPhone : account?.phone || stored?.phone || "";
    const settingsData = {displayName,role,email,phone,notifyAnnouncements:body.notifyAnnouncements === true,notifyMonthlyReports:body.notifyMonthlyReports === true,notifySecurity:body.notifySecurity === true};
    const settings = await db.$transaction(async tx => {
      if (account && contactEditable) await tx.staffAccount.update({where:{id:account.id},data:{email,phone}});
      return tx.userSettings.upsert({where:{userKey},create:{userKey,...settingsData},update:settingsData});
    });
    return NextResponse.json({settings});
  } catch (error) {
    if (isUniqueError(error)) return NextResponse.json({error:"อีเมลนี้ถูกใช้กับบัญชีอื่นแล้ว"},{status:409});
    return NextResponse.json({error:"ไม่สามารถบันทึกการตั้งค่าได้"},{status:503});
  }
}
