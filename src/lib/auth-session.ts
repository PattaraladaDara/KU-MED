import { createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { can, type SystemRole } from "@/lib/access-control";

const COOKIE_NAME = "ku_med_session";
const SESSION_TTL_SECONDS = 60 * 60 * 8;
const validRoles = new Set<SystemRole>(["admin", "doctor", "staff", "nurse", "pharmacist", "finance", "executive"]);

export type AuthSession = { username: string; role: SystemRole; expiresAt: number; sessionVersion: number };

function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) throw new Error("SESSION_SECRET must contain at least 32 characters");
  return value;
}

function sign(value: string) {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

export function createSessionCookie(username: string, role: string, sessionVersion = 0) {
  if (!validRoles.has(role as SystemRole)) throw new Error("Invalid account role");
  const payload = Buffer.from(JSON.stringify({ username, role, sessionVersion, expiresAt: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS })).toString("base64url");
  const token = `${payload}.${sign(payload)}`;
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_TTL_SECONDS}${secure}`;
}

export function clearSessionCookie() {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}

export function getAuthSession(request: NextRequest): AuthSession | null {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra) return null;
  try {
    const expected = Buffer.from(sign(payload));
    const received = Buffer.from(signature);
    if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Partial<AuthSession>;
    if (typeof parsed.username !== "string" || !parsed.username || typeof parsed.expiresAt !== "number" || parsed.expiresAt <= Math.floor(Date.now() / 1000) || !validRoles.has(parsed.role as SystemRole)) return null;
    const sessionVersion = typeof parsed.sessionVersion === "number" ? parsed.sessionVersion : 0;
    return { username: parsed.username, role: parsed.role as SystemRole, sessionVersion, expiresAt: parsed.expiresAt };
  } catch {
    return null;
  }
}

export function requirePermission(request: NextRequest, permission: string | readonly string[]) {
  const session = getAuthSession(request);
  if (!session) return { session: null, response: NextResponse.json({ error: "กรุณาเข้าสู่ระบบใหม่" }, { status: 401 }) };
  const permissions = Array.isArray(permission) ? permission : [permission];
  if (!permissions.some((item) => can(session.role, item))) return { session, response: NextResponse.json({ error: "บัญชีนี้ไม่มีสิทธิ์ดำเนินการ" }, { status: 403 }) };
  return { session, response: null };
}
