import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getAuthSession, clearSessionCookie } from "@/lib/auth-session";
import { validProfilePhoto } from "@/lib/profile-photo";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const session = getAuthSession(request);
  if (!session) return NextResponse.json({ error: "ไม่พบเซสชัน" }, { status: 401 });
  try {
    const account = await getDb().staffAccount.findUnique({ where: { username: session.username }, select: { username: true, role: true, active: true, applicationStatus: true, firstName: true, lastName: true, medicalLicense: true, accessStartsAt: true, accessEndsAt: true, licenseExpiresAt: true, sessionVersion: true } });
    const now = new Date();
    if (!account || !account.active || account.applicationStatus !== "approved" || account.role !== session.role || account.sessionVersion !== session.sessionVersion || (account.accessStartsAt && account.accessStartsAt > now) || (account.accessEndsAt && account.accessEndsAt < now) || (account.licenseExpiresAt && account.licenseExpiresAt < now)) {
      const response = NextResponse.json({ error: "บัญชีนี้ไม่มีสิทธิ์ใช้งานหรือสิทธิ์หมดอายุแล้ว" }, { status: 403 });
      response.headers.append("Set-Cookie", clearSessionCookie());
      return response;
    }
    const photo = await getDb().applicationMetadata.findUnique({ where: { key: `profile-photo:${account.username}` }, select: { value: true } });
    return NextResponse.json({ account: { username: account.username, role: account.role, displayName: `${account.firstName} ${account.lastName}`, medicalLicense: account.medicalLicense, avatarUrl: validProfilePhoto(photo?.value) ? photo.value : null } });
  } catch {
    return NextResponse.json({ error: "ไม่สามารถตรวจสอบเซสชันได้" }, { status: 503 });
  }
}
