import type { Metadata } from "next";
import { LoginForm } from "@/components/login-form";

export const metadata: Metadata = { title: "เข้าสู่ระบบ | KU-MED" };

export default function LoginPage() {
  return <main className="login-page">
    <aside className="login-intro">
      <div className="login-intro-copy"><h2>ระบบบริหารจัดการภายในสถานพยาบาล</h2><p>ระบบบริหารจัดการสถานพยาบาล มหาวิทยาลัยเกษตรศาสตร์ วิทยาเขตกำแพงแสน</p></div>
      <div className="login-university"><strong>มหาวิทยาลัยเกษตรศาสตร์</strong><p>สำนักงานสถานพยาบาล มหาวิทยาลัยเกษตรศาสตร์ วิทยาเขตกำแพงแสน</p></div>
    </aside>
    <div className="login-form-region">
    <section className="login-card" aria-labelledby="login-title">
      <div className="login-heading"><h1 id="login-title">เข้าสู่ระบบ</h1></div>
      <LoginForm />
      <aside className="demo-account" aria-label="บัญชีสำหรับทดลองใช้งาน"><strong>บัญชีตัวอย่าง</strong><p>ชื่อผู้ใช้ <code>demo</code> · รหัสผ่าน <code>demo1234</code></p><p>สำหรับทดลองหน้าจอเท่านั้น</p></aside>
    </section>
    </div>
  </main>;
}
