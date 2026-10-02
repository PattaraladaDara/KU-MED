import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const loginUrl = process.env.KU_ALLLOGIN_URL?.trim();
  if (!loginUrl) return NextResponse.json({
    configured: false,
    error: "KU All-Login ยังไม่ถูกตั้งค่า กรุณาใส่ KU_ALLLOGIN_URL ในไฟล์ .env",
  }, { status: 503 });
  if (request.nextUrl.searchParams.get("check") === "1") return NextResponse.json({ configured: true, url: loginUrl });
  return NextResponse.redirect(loginUrl);
}
