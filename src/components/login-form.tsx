"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { beginDemoSession, hasDemoSession } from "@/lib/demo-session";

type Mode = "login" | "register";
type LoginAccount = { username: string; role: string; displayName: string; medicalLicense: string };

export function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [visible, setVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const usernameRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (hasDemoSession()) router.replace("/dashboard"); }, [router]);

  function changeMode(next: Mode) {
    setMode(next); setError(""); setNotice(""); setVisible(false); setConfirmVisible(false);
  }

  async function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    const values = new FormData(event.currentTarget);
    setError(""); setNotice(""); setSubmitting(true);
    try {
      const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        username: String(values.get("username") ?? "").trim(), password: String(values.get("password") ?? ""),
      }) });
      const result = await response.json() as { account?: LoginAccount; error?: string };
      if (!response.ok || !result.account) throw new Error(result.error || "ไม่สามารถเข้าสู่ระบบได้");
      beginDemoSession(result.account);
      router.replace("/dashboard");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "ไม่สามารถเข้าสู่ระบบได้"); }
    finally { setSubmitting(false); }
  }

  async function submitRegistration(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    const form = event.currentTarget, values = new FormData(form);
    const password = String(values.get("password") ?? "");
    if (password !== String(values.get("confirmPassword") ?? "")) { setError("Password และยืนยัน Password ไม่ตรงกัน"); return; }
    setError(""); setNotice(""); setSubmitting(true);
    try {
      const payload = Object.fromEntries(["firstName", "lastName", "role", "medicalLicense", "username", "password"].map(key => [key, String(values.get(key) ?? "").trim()]));
      const response = await fetch("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json() as { account?: { username: string }; error?: string };
      if (!response.ok || !result.account) throw new Error(result.error || "ไม่สามารถสร้างบัญชีได้");
      form.reset(); changeMode("login"); setNotice(`สร้างบัญชี ${result.account.username} สำเร็จ กรุณาเข้าสู่ระบบ`);
      window.setTimeout(() => usernameRef.current?.focus(), 0);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "ไม่สามารถสร้างบัญชีได้"); }
    finally { setSubmitting(false); }
  }

  async function startKuLogin() {
    setError(""); setNotice("");
    try {
      const response = await fetch("/api/auth/ku?check=1", { cache: "no-store" });
      const result = await response.json() as { configured?: boolean; url?: string; error?: string };
      if (!response.ok || !result.configured || !result.url) throw new Error(result.error || "KU All-Login ยังไม่ถูกตั้งค่า");
      window.location.assign(result.url);
    } catch (caught) { setNotice(caught instanceof Error ? caught.message : "KU All-Login ยังไม่ถูกตั้งค่า"); }
  }

  if (mode === "register") return <form className="login-form registration-account-form" onSubmit={submitRegistration} noValidate>
    <div className="login-mode-heading"><div><h2>ลงทะเบียนผู้ใช้นอกระบบ</h2><p>สำหรับแพทย์หรือผู้ปฏิบัติงานที่ไม่มีบัญชี KU All-Login</p></div><button type="button" onClick={() => changeMode("login")}>กลับไปเข้าสู่ระบบ</button></div>
    <div className="login-field-grid">
      <div className="login-field"><label htmlFor="register-first-name">ชื่อ</label><input id="register-first-name" name="firstName" autoComplete="given-name" required /></div>
      <div className="login-field"><label htmlFor="register-last-name">นามสกุล</label><input id="register-last-name" name="lastName" autoComplete="family-name" required /></div>
      <div className="login-field"><label htmlFor="register-role">ประเภทผู้ใช้งาน</label><select id="register-role" name="role" defaultValue="doctor" required><option value="doctor">แพทย์</option><option value="staff">บุคลากร</option></select></div>
      <div className="login-field"><label htmlFor="register-license">เลขใบอนุญาตประกอบวิชาชีพ</label><input id="register-license" name="medicalLicense" autoComplete="off" required /></div>
      <div className="login-field full"><label htmlFor="register-username">สร้าง Username</label><input id="register-username" name="username" autoComplete="username" minLength={4} maxLength={40} pattern="[A-Za-z0-9._-]+" required /></div>
      <div className="login-field"><label htmlFor="register-password">สร้าง Password</label><div className="password-field"><input id="register-password" name="password" type={visible ? "text" : "password"} autoComplete="new-password" minLength={8} required /><button type="button" onClick={() => setVisible(!visible)}>{visible ? "ซ่อน" : "แสดง"}</button></div></div>
      <div className="login-field"><label htmlFor="register-confirm-password">ยืนยัน Password</label><div className="password-field"><input id="register-confirm-password" name="confirmPassword" type={confirmVisible ? "text" : "password"} autoComplete="new-password" minLength={8} required /><button type="button" onClick={() => setConfirmVisible(!confirmVisible)}>{confirmVisible ? "ซ่อน" : "แสดง"}</button></div></div>
    </div>
    <p className="password-hint">Password ต้องมีอย่างน้อย 8 ตัวอักษร และระบบจะจัดเก็บในรูปแบบแฮช</p>
    {error && <p className="login-error" role="alert">{error}</p>}
    <button className="login-submit" type="submit" disabled={submitting}>{submitting ? "กำลังสร้างบัญชี…" : "ลงทะเบียน"}</button>
  </form>;

  return <form className="login-form" onSubmit={submitLogin} noValidate>
    <section className="ku-login-section"><div><strong>บุคลากรมหาวิทยาลัยเกษตรศาสตร์</strong><p>เข้าสู่ระบบด้วยบัญชีมหาวิทยาลัยผ่าน KU All-Login</p></div><button type="button" className="login-sso" onClick={startKuLogin}>เข้าสู่ระบบด้วย KU All-Login</button></section>
    <div className="login-divider"><span>ผู้ใช้นอกระบบ</span></div>
    <div className="login-field"><label htmlFor="username">Username</label><input ref={usernameRef} id="username" name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} placeholder="กรอก Username" required /></div>
    <div className="login-field"><label htmlFor="password">Password</label><div className="password-field"><input id="password" name="password" type={visible ? "text" : "password"} autoComplete="current-password" placeholder="กรอก Password" required /><button type="button" onClick={() => setVisible(!visible)}>{visible ? "ซ่อน" : "แสดง"}</button></div></div>
    {error && <p className="login-error" role="alert">{error}</p>}
    {notice && <p className="sso-notice" role="status">{notice}</p>}
    <button className="login-submit" type="submit" disabled={submitting}>{submitting ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}</button>
    <button className="register-link-button" type="button" onClick={() => changeMode("register")}>ยังไม่มีบัญชี? ลงทะเบียนผู้ใช้นอกระบบ</button>
  </form>;
}
