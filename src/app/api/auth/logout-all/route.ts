import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { clearSessionCookie, requirePermission } from "@/lib/auth-session";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const auth = requirePermission(request, ["settings:own", "settings:manage"]);
  if (auth.response) return auth.response;

  try {
    await getDb().staffAccount.update({
      where: { username: auth.session!.username },
      data: { sessionVersion: { increment: 1 } },
    });
    const response = NextResponse.json({ ok: true, message: "ออกจากระบบจากทุกอุปกรณ์แล้ว" });
    response.headers.append("Set-Cookie", clearSessionCookie());
    return response;
  } catch {
    return NextResponse.json({ error: "ไม่สามารถออกจากระบบจากทุกอุปกรณ์ได้" }, { status: 503 });
  }
}
