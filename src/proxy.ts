import { NextRequest, NextResponse } from "next/server";
import { can } from "@/lib/access-control";
import { getAuthSession } from "@/lib/auth-session";
import { getDb } from "@/lib/db";

const publicRoutes = new Set([
  "/api/health",
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/verify-email",
  "/api/auth/ku",
  "/api/auth/logout",
  "/api/auth/session",
]);

function requiredPermissions(path: string, method: string): string[] | null {
  if (path === "/api/dashboard" && method === "GET") return ["dashboard:view"];
  if (path === "/api/reports" && method === "GET") return ["reports:view"];
  if (path === "/api/finance") return method === "GET" ? ["finance:manage", "reports:view"] : ["finance:manage"];
  if (path === "/api/appointments/mark-no-shows" && method === "POST") return ["appointments:manage"];
  if (path === "/api/auth/logout-all" && method === "POST") return ["settings:own", "settings:manage"];
  if (path === "/api/service-catalog" && method === "GET") return ["service-catalog:use", "service-catalog:manage"];
  if (path === "/api/service-catalog" && method === "POST") return ["service-catalog:manage"];
  if (/^\/api\/service-catalog\/[^/]+$/.test(path)) return ["service-catalog:manage"];
  if (path === "/api/admin/accounts") return ["accounts:manage"];
  if (path === "/api/settings") return ["settings:own", "settings:manage"];
  if (path === "/api/evaluations" && method === "POST") return ["evaluations:submit"];
  if (path === "/api/evaluations/system" && method === "POST") return ["evaluations:submit"];
  if (path === "/api/evaluations/service") return method === "GET" ? ["evaluations:view"] : ["evaluations:manage"];
  if (path === "/api/medications" && method === "GET") return ["medications:catalog:use", "medications:catalog:manage"];
  if (path === "/api/medications" && method === "POST") return ["medications:catalog:manage"];
  if (/^\/api\/medications\/[^/]+$/.test(path)) return ["medications:catalog:manage"];
  if (path === "/api/patients" && method === "GET") return ["patients:view"];
  if (path === "/api/patients" && method === "POST") return ["patients:register"];
  if (path === "/api/student-lookup" || path.startsWith("/api/student-lookup/")) return ["patients:register"];
  if (path === "/api/citizen-card/read") return ["patients:register"];
  if (/^\/api\/patients\/[^/]+$/.test(path)) {
    if (method === "GET") return ["patients:view"];
    if (method === "POST" || method === "PATCH") return ["clinical:write", "appointments:manage", "payments:manage", "patients:update"];
    if (method === "DELETE") return ["clinical:delete"];
  }
  if (/^\/api\/patients\/[^/]+\/status$/.test(path)) return ["patients:update"];
  if (/^\/api\/patients\/[^/]+\/triage$/.test(path)) return method === "GET" ? ["intake:view", "clinical:view"] : ["intake:write"];
  if (/^\/api\/patients\/[^/]+\/medications$/.test(path)) return method === "GET" ? ["medications:view"] : ["medications:manage"];
  if (/^\/api\/patients\/[^/]+\/certificates$/.test(path)) return method === "GET" ? ["documents:print", "clinical:view"] : ["certificates:issue"];
  if (/^\/api\/patients\/[^/]+\/certificates\/[^/]+$/.test(path)) return ["documents:print"];
  if (/^\/api\/patients\/[^/]+\/payments\/[^/]+\/receipt$/.test(path)) return ["payments:view"];
  if (/^\/api\/patients\/[^/]+\/payments\/[^/]+\/slip$/.test(path)) return method === "GET" ? ["payments:view"] : ["payments:manage"];
  return null;
}

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (publicRoutes.has(path)) return NextResponse.next();
  const session = getAuthSession(request);
  if (!session) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบใหม่" }, { status: 401 });
  try {
    const account = await getDb().staffAccount.findUnique({ where: { username: session.username }, select: { role: true, active: true, applicationStatus: true, accessStartsAt: true, accessEndsAt: true, licenseExpiresAt: true, sessionVersion: true } });
    const now = new Date();
    if (!account || !account.active || account.applicationStatus !== "approved" || account.role !== session.role || account.sessionVersion !== session.sessionVersion || (account.accessStartsAt && account.accessStartsAt > now) || (account.accessEndsAt && account.accessEndsAt < now) || (account.licenseExpiresAt && account.licenseExpiresAt < now)) {
      return NextResponse.json({ error: "บัญชีนี้ไม่มีสิทธิ์ใช้งานหรือสิทธิ์หมดอายุแล้ว กรุณาเข้าสู่ระบบใหม่" }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: "ตรวจสอบสิทธิ์ไม่สำเร็จ กรุณาลองใหม่" }, { status: 503 });
  }
  const permissions = requiredPermissions(path, request.method);
  if (!permissions || !permissions.some((permission) => can(session.role, permission))) {
    return NextResponse.json({ error: "บัญชีนี้ไม่มีสิทธิ์ดำเนินการ" }, { status: 403 });
  }
  return NextResponse.next();
}

export const config = { matcher: ["/api/:path*"] };
