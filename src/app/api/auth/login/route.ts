import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { text } from "@/lib/api-validation";
import { validProfilePhoto } from "@/lib/profile-photo";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const username = text(body.username).toLowerCase(), password = String(body.password ?? "");
    if (!username || !password) return NextResponse.json({ error: "กรุณากรอก Username และ Password" }, { status: 400 });
    const account = await getDb().staffAccount.findUnique({ where: { username } });
    if (!account || !account.active || !(await verifyPassword(password, account.passwordHash)))
      return NextResponse.json({ error: "Username หรือ Password ไม่ถูกต้อง" }, { status: 401 });
    const photo = await getDb().applicationMetadata.findUnique({ where: { key: `profile-photo:${account.id}` } });
    return NextResponse.json({ account: {
      username: account.username, role: account.role,
      displayName: `${account.firstName} ${account.lastName}`, medicalLicense: account.medicalLicense,
      avatarUrl: validProfilePhoto(photo?.value) ? photo.value : null,
    } });
  } catch {
    return NextResponse.json({ error: "ไม่สามารถเข้าสู่ระบบได้ กรุณาลองใหม่" }, { status: 503 });
  }
}
