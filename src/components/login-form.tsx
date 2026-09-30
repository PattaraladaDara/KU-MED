"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { beginDemoSession, hasDemoSession } from "@/lib/demo-session";

export function LoginForm() {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [ssoNotice, setSsoNotice] = useState(false);
  const usernameRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const roleRef = useRef<HTMLSelectElement>(null);

  useEffect(() => { if (hasDemoSession()) router.replace("/"); }, [router]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setError("");
    const values = new FormData(event.currentTarget);
    const username = String(values.get("username") ?? "").trim();
    const password = String(values.get("password") ?? "");
    const role = String(values.get("role") ?? "");
    if (!username) { setError("กรุณากรอกชื่อผู้ใช้"); usernameRef.current?.focus(); return; }
    if (!password) { setError("กรุณากรอกรหัสผ่าน"); passwordRef.current?.focus(); return; }
    if (!role) { setError("กรุณาเลือกตำแหน่ง/แผนกปฏิบัติงาน"); roleRef.current?.focus(); return; }
    if (username !== "demo" || password !== "demo1234") {
      setError("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง กรุณาใช้บัญชีตัวอย่างที่ระบุด้านล่าง");
      passwordRef.current?.focus();
      return;
    }
    try {
      const doctor=role==="doctor";
      beginDemoSession({username,role,displayName:doctor?(process.env.NEXT_PUBLIC_DEMO_DOCTOR_NAME||"แพทย์ผู้ตรวจ"):"ผู้ดูแลระบบ",medicalLicense:doctor?(process.env.NEXT_PUBLIC_DEMO_MEDICAL_LICENSE||""):""});
      setSubmitting(true);
      if (passwordRef.current) passwordRef.current.value = "";
      router.replace("/");
    } catch {
      setError("เบราว์เซอร์ไม่สามารถเก็บสถานะการทดลองใช้งานได้ กรุณาอนุญาตการจัดเก็บข้อมูลเว็บไซต์แล้วลองใหม่");
    }
  }

  return <form className="login-form" onSubmit={submit} noValidate>
    <div className="login-field"><label htmlFor="username">ชื่อผู้ใช้/รหัสประจำตัว</label><input ref={usernameRef} id="username" name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} placeholder="กรอกชื่อผู้ใช้หรือรหัสประจำตัว" required aria-describedby={error ? "login-error" : undefined} aria-invalid={!!error} onChange={() => setError("")} /></div>
    <div className="login-field"><label htmlFor="password">รหัสผ่าน</label><div className="password-field"><input ref={passwordRef} id="password" name="password" type={visible ? "text" : "password"} autoComplete="current-password" placeholder="กรอกรหัสผ่าน" required aria-describedby={error ? "login-error" : undefined} aria-invalid={!!error} onChange={() => setError("")} /><button type="button" aria-label={visible ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"} aria-pressed={visible} onClick={() => setVisible(!visible)}>{visible ? "ซ่อน" : "แสดง"}</button></div></div>
    <div className="login-field"><label htmlFor="role">ตำแหน่ง/แผนกปฏิบัติงาน</label><select ref={roleRef} id="role" name="role" defaultValue="" required aria-describedby={error ? "login-error" : undefined} onChange={() => setError("")}><option value="" disabled>เลือกแผนกหรือตำแหน่ง</option><option value="admin">ผู้ดูแลระบบ</option><option value="doctor">แพทย์</option></select></div>
    {error && <p id="login-error" className="login-error" role="alert">{error}</p>}
    <button className="login-submit" type="submit" disabled={submitting}>{submitting ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}</button>
    <div className="login-divider"><span>หรือเข้าใช้งานด้วย</span></div>
    <button type="button" className="login-sso" onClick={() => setSsoNotice(true)}>เข้าสู่ระบบด้วย KU All-Login (@ku.th)</button>
    {ssoNotice && <p className="sso-notice" role="status">KU All-Login ยังไม่เชื่อมต่อในเวอร์ชันทดลอง กรุณาใช้บัญชีตัวอย่างด้านล่าง</p>}
  </form>;
}
