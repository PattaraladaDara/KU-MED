import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { isUniqueError, text } from "@/lib/api-validation";
import { getAuthSession, requirePermission } from "@/lib/auth-session";

export const runtime = "nodejs";

const fallbackAdmin = "demo-admin";
const label = (role:string) => ({admin:"ผู้ดูแลระบบหลัก",doctor:"แพทย์",staff:"เจ้าหน้าที่เวชระเบียน",nurse:"พยาบาล",pharmacist:"เภสัชกร",finance:"เจ้าหน้าที่การเงิน",executive:"ผู้บริหารสถานพยาบาล"}[role]||role);
const isKuManagedEmail = (email:string) => {
  const domain=email.trim().toLowerCase().split("@").at(-1)||"";
  return domain==="ku.th"||domain.endsWith(".ku.th");
};
const isKuAllLogin = (authProvider:string,email:string) => authProvider!=="local"||isKuManagedEmail(email);

export async function GET(request:NextRequest) {
  const auth = requirePermission(request, ["settings:own", "settings:manage"]);
  if (auth.response) return auth.response;
  try {
    const userKey = auth.session!.username;
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
    const authProvider=account?.authProvider||"local",emailLocked=isKuAllLogin(authProvider,settings.email);
    return NextResponse.json({settings,policy:{authProvider,emailLocked,canEditEmail:!emailLocked,canEditPhone:true}});
  } catch {
    return NextResponse.json({error:"ไม่สามารถโหลดการตั้งค่าได้"},{status:503});
  }
}

export async function PUT(request:NextRequest) {
  const auth = requirePermission(request, ["settings:own", "settings:manage"]);
  if (auth.response) return auth.response;
  try {
    const body = await request.json() as Record<string,unknown>;
    const session = getAuthSession(request)!;
    const userKey = session.username;
    const db = getDb();
    const account = userKey === fallbackAdmin ? null : await db.staffAccount.findUnique({where:{username:userKey}});
    const stored = await db.userSettings.findUnique({where:{userKey}});
    const existingEmail = account?.email || stored?.email || "";
    const authProvider=account?.authProvider||"local",canEditEmail=!isKuAllLogin(authProvider,existingEmail);
    const requestedEmail = text(body.email).toLowerCase();
    const requestedPhone = text(body.phone);
    if (canEditEmail && !requestedEmail) return NextResponse.json({error:"กรุณากรอกอีเมล"},{status:400});
    if (canEditEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(requestedEmail)) {
      return NextResponse.json({error:"รูปแบบอีเมลไม่ถูกต้อง"},{status:400});
    }
    if (!requestedPhone) return NextResponse.json({error:"กรุณากรอกหมายเลขโทรศัพท์"},{status:400});
    const displayName = account ? `${account.firstName} ${account.lastName}` : stored?.displayName || "ผู้ดูแลระบบหลัก";
    const role = label(account?.role || "admin");
    const email = canEditEmail ? requestedEmail : existingEmail;
    const phone = requestedPhone;
    const settingsData = {displayName,role,email,phone,notifyAnnouncements:stored?.notifyAnnouncements ?? true,notifyMonthlyReports:stored?.notifyMonthlyReports ?? true,notifySecurity:stored?.notifySecurity ?? true};
    const settings = await db.$transaction(async tx => {
      if (account) await tx.staffAccount.update({where:{id:account.id},data:{...(canEditEmail?{email}:{}),phone}});
      return tx.userSettings.upsert({where:{userKey},create:{userKey,...settingsData},update:settingsData});
    });
    return NextResponse.json({settings});
  } catch (error) {
    if (isUniqueError(error)) return NextResponse.json({error:"อีเมลนี้ถูกใช้กับบัญชีอื่นแล้ว"},{status:409});
    return NextResponse.json({error:"ไม่สามารถบันทึกการตั้งค่าได้"},{status:503});
  }
}
