"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { beginDemoSession, hasDemoSession } from "@/lib/demo-session";
import { BuddhistDateInput } from "@/components/buddhist-date-input";

type Mode = "login" | "register";
type LoginAccount = { username: string; role: string; displayName: string; medicalLicense: string; avatarUrl?:string|null };
type SupportContact={name:string;phone:string;email:string|null;hours:string};

export function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [visible, setVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [supportContact,setSupportContact]=useState<SupportContact|null>(null);
  const [submitting, setSubmitting] = useState(false);
  const usernameRef = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [photoLoading, setPhotoLoading] = useState(false);
  const [verification,setVerification]=useState<{username:string;email:string;demoCode?:string}|null>(null);
  const photoVersion = useRef(0);
  async function choosePhoto(file?: File) {
    const version = ++photoVersion.current;
    setAvatarUrl(""); setError("");
    if (!file) { setPhotoLoading(false); return; }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) { setPhotoLoading(false); setError("เลือกรูป JPG, PNG หรือ WebP ขนาดไม่เกิน 5 MB"); return; }
    setPhotoLoading(true);
    const url = URL.createObjectURL(file);
    try {
      const image = new Image(); image.src = url; await image.decode();
      const canvas = document.createElement("canvas"); canvas.width = canvas.height = 256;
      const context = canvas.getContext("2d"); if (!context) throw new Error();
      const side = Math.min(image.naturalWidth, image.naturalHeight);
      context.fillStyle = "#ffffff"; context.fillRect(0, 0, 256, 256);
      context.drawImage(image, (image.naturalWidth-side)/2, (image.naturalHeight-side)/2, side, side, 0, 0, 256, 256);
      if (version === photoVersion.current) setAvatarUrl(canvas.toDataURL("image/jpeg", .85));
    } catch { if (version === photoVersion.current) setError("ไม่สามารถอ่านรูปนี้ได้ กรุณาเลือกรูปใหม่"); }
    finally { URL.revokeObjectURL(url); if (version === photoVersion.current) setPhotoLoading(false); }
  }

  useEffect(() => { if (hasDemoSession()) router.replace("/dashboard"); }, [router]);

  function changeMode(next: Mode) {
    photoVersion.current++; setPhotoLoading(false); setAvatarUrl("");
    setMode(next); setError(""); setNotice(""); setSupportContact(null); setVisible(false); setConfirmVisible(false);
  }

  async function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    const values = new FormData(event.currentTarget);
    setError(""); setNotice(""); setSupportContact(null); setSubmitting(true);
    try {
      const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        username: String(values.get("username") ?? "").trim(), password: String(values.get("password") ?? ""),
      }) });
      const result = await response.json() as { account?: LoginAccount; error?: string;supportContact?:SupportContact };
      if (!response.ok || !result.account){if(result.supportContact)setSupportContact(result.supportContact);throw new Error(result.error || "ไม่สามารถเข้าสู่ระบบได้");}
      beginDemoSession(result.account);
      router.replace("/dashboard");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "ไม่สามารถเข้าสู่ระบบได้"); }
    finally { setSubmitting(false); }
  }

  async function submitRegistration(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || photoLoading) return;
    const form = event.currentTarget, values = new FormData(form);
    const password = String(values.get("password") ?? "");
    if (password !== String(values.get("confirmPassword") ?? "")) { setError("Password และยืนยัน Password ไม่ตรงกัน"); return; }
    setError(""); setNotice(""); setSubmitting(true);
    try {
      const payload = { ...Object.fromEntries(["firstName","lastName","medicalLicense","licenseExpiresAt","email","phone","organization","username","password"].map(key => [key,String(values.get(key)??"").trim()])),acceptTerms:values.has("acceptTerms"),avatarUrl:avatarUrl||null };
      const response = await fetch("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json() as { account?: { username:string;email:string };demoVerificationCode?:string;error?:string };
      if (!response.ok || !result.account) throw new Error(result.error || "ไม่สามารถสร้างบัญชีได้");
      setVerification({username:result.account.username,email:result.account.email,demoCode:result.demoVerificationCode});form.reset();setAvatarUrl("");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "ไม่สามารถสร้างบัญชีได้"); }
    finally { setSubmitting(false); }
  }

  async function submitVerification(event:FormEvent<HTMLFormElement>){event.preventDefault();if(!verification||submitting)return;const values=new FormData(event.currentTarget);setSubmitting(true);setError("");try{const response=await fetch("/api/auth/verify-email",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username:verification.username,code:String(values.get("code")||"").trim()})});const result=await response.json();if(!response.ok)throw new Error(result.error||"ยืนยันอีเมลไม่สำเร็จ");setVerification(null);changeMode("login");setNotice("ยืนยันอีเมลสำเร็จ คำขออยู่ระหว่างการตรวจสอบของผู้ดูแลระบบ");}catch(caught){setError(caught instanceof Error?caught.message:"ยืนยันอีเมลไม่สำเร็จ");}finally{setSubmitting(false);}}

  async function startKuLogin() {
    setError(""); setNotice("");
    try {
      const response = await fetch("/api/auth/ku?check=1", { cache: "no-store" });
      const result = await response.json() as { configured?: boolean; url?: string; error?: string };
      if (!response.ok || !result.configured || !result.url) throw new Error(result.error || "KU All-Login ยังไม่ถูกตั้งค่า");
      window.location.assign(result.url);
    } catch (caught) { setNotice(caught instanceof Error ? caught.message : "KU All-Login ยังไม่ถูกตั้งค่า"); }
  }

  if(verification)return <form className="login-form email-verification-form" onSubmit={submitVerification}><div className="login-mode-heading"><div><h2>ยืนยันอีเมล</h2><p>กรอกรหัส 6 หลักที่ส่งไปยัง {verification.email}</p></div><button type="button" onClick={()=>setVerification(null)}>กลับ</button></div>{verification.demoCode&&<div className="verification-demo-code"><strong>รหัสสำหรับระบบจำลอง</strong><span>{verification.demoCode}</span><small>เมื่อใช้งานจริง ระบบจะส่งรหัสทางอีเมลและจะไม่แสดงรหัสบนหน้าจอ</small></div>}<div className="login-field"><label htmlFor="verification-code">รหัสยืนยันอีเมล</label><input id="verification-code" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} placeholder="000000" required autoFocus/></div>{error&&<p className="login-error" role="alert">{error}</p>}<button type="submit" className="login-submit" disabled={submitting}>{submitting?"กำลังยืนยัน…":"ยืนยันอีเมล"}</button></form>;

  if (mode === "register") return <form className="login-form registration-account-form" onSubmit={submitRegistration} noValidate>
    <div className="login-mode-heading"><div><h2>ขอลงทะเบียนบัญชีแพทย์ภายนอก</h2><p>สำหรับแพทย์ที่ไม่มีบัญชี KU All-Login โดยคำขอต้องผ่านการตรวจสอบก่อนเปิดใช้งาน</p></div><button type="button" onClick={() => changeMode("login")}>กลับไปเข้าสู่ระบบ</button></div>
    <div className="account-photo-upload"><div className="account-photo-preview">{avatarUrl ? <img src={avatarUrl} alt="ตัวอย่างรูปโปรไฟล์"/> : <span aria-hidden="true">＋</span>}</div><div><label htmlFor="register-photo">รูปโปรไฟล์ (ไม่บังคับ)</label><input id="register-photo" type="file" accept="image/jpeg,image/png,image/webp" disabled={submitting} onChange={event => void choosePhoto(event.target.files?.[0])}/><small>{photoLoading ? "กำลังเตรียมรูป…" : "JPG, PNG หรือ WebP ไม่เกิน 5 MB · ครอปตรงกลางเป็นรูปวงกลม"}</small>{avatarUrl && <button type="button" onClick={() => { void choosePhoto(); const input = document.getElementById("register-photo") as HTMLInputElement; input.value = ""; }}>ลบรูป</button>}</div></div>
    <div className="login-field-grid">
      <div className="login-field"><label htmlFor="register-first-name">ชื่อ</label><input id="register-first-name" name="firstName" autoComplete="given-name" required /></div>
      <div className="login-field"><label htmlFor="register-last-name">นามสกุล</label><input id="register-last-name" name="lastName" autoComplete="family-name" required /></div>
      <div className="login-field"><label>ประเภทผู้ใช้งาน</label><input value="แพทย์ภายนอก" readOnly /></div>
      <div className="login-field"><label htmlFor="register-license">เลขใบอนุญาตประกอบวิชาชีพเวชกรรม</label><input id="register-license" name="medicalLicense" autoComplete="off" required /></div>
      <div className="login-field"><label htmlFor="register-license-expiry">วันหมดอายุใบอนุญาต (ถ้ามี)</label><BuddhistDateInput id="register-license-expiry" name="licenseExpiresAt"/></div>
      <div className="login-field"><label htmlFor="register-organization">หน่วยงาน / สถานพยาบาลต้นสังกัด</label><input id="register-organization" name="organization" required /></div>
      <div className="login-field"><label htmlFor="register-email">อีเมลสำหรับยืนยันตัวตน</label><input id="register-email" name="email" type="email" autoComplete="email" required /></div>
      <div className="login-field"><label htmlFor="register-phone">หมายเลขโทรศัพท์</label><input id="register-phone" name="phone" type="tel" autoComplete="tel" required /></div>
      <div className="login-field full"><label htmlFor="register-username">สร้าง Username</label><input id="register-username" name="username" autoComplete="username" minLength={4} maxLength={40} pattern="[A-Za-z0-9._-]+" required /></div>
      <div className="login-field"><label htmlFor="register-password">สร้าง Password</label><div className="password-field"><input id="register-password" name="password" type={visible ? "text" : "password"} autoComplete="new-password" minLength={8} required /><button type="button" onClick={() => setVisible(!visible)}>{visible ? "ซ่อน" : "แสดง"}</button></div></div>
      <div className="login-field"><label htmlFor="register-confirm-password">ยืนยัน Password</label><div className="password-field"><input id="register-confirm-password" name="confirmPassword" type={confirmVisible ? "text" : "password"} autoComplete="new-password" minLength={8} required /><button type="button" onClick={() => setConfirmVisible(!confirmVisible)}>{confirmVisible ? "ซ่อน" : "แสดง"}</button></div></div>
    </div>
    <label className="registration-consent"><input type="checkbox" name="acceptTerms" required/><span>ข้าพเจ้ารับรองว่าข้อมูลและเลขใบอนุญาตเป็นความจริง และยินยอมให้สถานพยาบาลตรวจสอบข้อมูลเพื่อพิจารณาสิทธิ์เข้าใช้งานระบบ</span></label>
    <p className="password-hint">Password ต้องมีอย่างน้อย 8 ตัวอักษร และระบบจะจัดเก็บในรูปแบบแฮช</p>
    {error && <p className="login-error" role="alert">{error}</p>}
    <button className="login-submit" type="submit" disabled={submitting || photoLoading}>{submitting ? "กำลังส่งคำขอ…" : "ส่งคำขอลงทะเบียน"}</button>
  </form>;

  return <form className="login-form reference-login-form" onSubmit={submitLogin} noValidate>
    <section className="ku-login-section"><div><strong>บุคลากรมหาวิทยาลัยเกษตรศาสตร์</strong><p>เข้าสู่ระบบด้วยบัญชีมหาวิทยาลัยผ่าน KU All-Login</p></div><button type="button" className="login-sso" onClick={startKuLogin}>เข้าสู่ระบบด้วย KU All-Login</button></section>
    <div className="login-divider"><span>หรือเข้าใช้งานด้วย</span></div>
    <div className="login-field"><label htmlFor="username">ชื่อผู้ใช้/รหัสประจำตัว</label><input ref={usernameRef} id="username" name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} placeholder="กรอกชื่อผู้ใช้หรือรหัสประจำตัว" required /></div>
    <div className="login-field"><label htmlFor="password">รหัสผ่าน</label><div className="password-field"><input id="password" name="password" type={visible ? "text" : "password"} autoComplete="current-password" placeholder="กรอกรหัสผ่าน" required /><button type="button" className="login-password-toggle" onClick={() => setVisible(!visible)} aria-label={visible ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.8 5.2A10.4 10.4 0 0 1 12 5c5 0 9 7 9 7a17 17 0 0 1-3 3.8M6.1 6.1C4.2 7.5 3 9.3 2 12c0 0 4 7 10 7a10 10 0 0 0 5-1.5"/></svg></button></div></div>
    {error && <p className="login-error" role="alert">{error}</p>}
    {supportContact&&<aside className="login-support-contact" aria-label="ช่องทางติดต่อเจ้าหน้าที่"><strong>ติดต่อเจ้าหน้าที่เพื่อสอบถามหรือขอทบทวน</strong><span>{supportContact.name}</span><a href={`tel:${supportContact.phone.replace(/[^0-9+]/g,"")}`}>โทร {supportContact.phone}</a>{supportContact.email&&<a href={`mailto:${supportContact.email}`}>อีเมล {supportContact.email}</a>}<small>{supportContact.hours}</small><p>กรุณาแจ้งชื่อผู้ใช้และชื่อ–นามสกุลที่ลงทะเบียน โดยไม่ต้องแจ้งรหัสผ่านหรือรหัส OTP</p></aside>}
    {notice && <p className="sso-notice" role="status">{notice}</p>}
    <button className="login-submit" type="submit" disabled={submitting}>{submitting ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}</button>
    <button className="register-link-button" type="button" onClick={() => changeMode("register")}>แพทย์ภายนอกยังไม่มีบัญชี? ส่งคำขอลงทะเบียน</button>
  </form>;
}
