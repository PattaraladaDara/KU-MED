import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { text } from "@/lib/api-validation";
import { validProfilePhoto } from "@/lib/profile-photo";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const firstName = text(body.firstName), lastName = text(body.lastName);
    const role = text(body.role), medicalLicense = text(body.medicalLicense);
    const username = text(body.username).toLowerCase(), password = String(body.password ?? "");
    const avatarUrl = body.avatarUrl;
    if (avatarUrl && !validProfilePhoto(avatarUrl)) return NextResponse.json({ error: "รูปโปรไฟล์ไม่ถูกต้องหรือมีขนาดใหญ่เกินไป" }, { status: 400 });
    if (!firstName || !lastName || !role || !medicalLicense || !username || !password)
      return NextResponse.json({ error: "กรุณากรอกข้อมูลทุกช่อง" }, { status: 400 });
    if (!new Set(["doctor", "staff"]).has(role)) return NextResponse.json({ error: "ประเภทผู้ใช้งานไม่ถูกต้อง" }, { status: 400 });
    if (!/^[a-z0-9._-]{4,40}$/i.test(username))
      return NextResponse.json({ error: "Username ต้องมี 4–40 ตัว และใช้ตัวอักษรอังกฤษ ตัวเลข จุด ขีดกลาง หรือขีดล่าง" }, { status: 400 });
    if (password.length < 8)
      return NextResponse.json({ error: "Password ต้องมีอย่างน้อย 8 ตัวอักษร" }, { status: 400 });
    const duplicate = await getDb().staffAccount.findFirst({ where: { OR: [{ username }, { medicalLicense }] }, select: { username: true } });
    if (duplicate) return NextResponse.json({ error: duplicate.username === username ? "Username นี้ถูกใช้แล้ว" : "เลขใบอนุญาตนี้ถูกลงทะเบียนแล้ว" }, { status: 409 });
    const account = await getDb().$transaction(async db => {
    const created = await db.staffAccount.create({ data: {
      firstName, lastName, role, medicalLicense, username, passwordHash: await hashPassword(password),
    }, select: { id: true, username: true, firstName: true, lastName: true, role: true, medicalLicense: true } });
    if (validProfilePhoto(avatarUrl)) await db.applicationMetadata.create({ data: { key: `profile-photo:${created.id}`, value: avatarUrl } });
    return created;
    });
    return NextResponse.json({ account }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "ไม่สามารถสร้างบัญชีได้ กรุณาลองใหม่" }, { status: 503 });
  }
}
