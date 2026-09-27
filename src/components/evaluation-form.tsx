"use client";
import { useState, type FormEvent } from "react";

const criteria = [
  ["คุณภาพและความถูกต้องของงาน", "ความละเอียด รอบคอบ และผลลัพธ์ที่เป็นไปตามมาตรฐาน"],
  ["ความรับผิดชอบและตรงต่อเวลา", "บริหารงานตามกำหนดและรับผิดชอบหน้าที่ที่ได้รับมอบหมาย"],
  ["การให้บริการและการทำงานร่วมกัน", "สื่อสารสุภาพ ให้ความช่วยเหลือ และร่วมงานกับผู้อื่นได้ดี"],
];

export function EvaluationForm() {
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setNotice(""); setError(""); const form = event.currentTarget; const data = new FormData(form);
    try { const response = await fetch("/api/evaluations", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ qualityScore:data.get("criterion-0"), responsibilityScore:data.get("criterion-1"), serviceScore:data.get("criterion-2"), feedback:data.get("feedback"), evaluatorKey:"demo-admin" }) }); const result = await response.json(); if (!response.ok) throw new Error(result.error || "ไม่สามารถบันทึกแบบประเมินได้"); setNotice("บันทึกแบบประเมินเรียบร้อยแล้ว"); form.reset(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "ไม่สามารถบันทึกแบบประเมินได้"); } finally { setSaving(false); }
  }
  return <section className="clinical-page"><header className="clinical-header"><div><h1>แบบประเมินการทำงาน รอบที่ 1/2569</h1><p>ประเมินผลการปฏิบัติงานตามหัวข้อ โดย 1 หมายถึงควรปรับปรุง และ 5 หมายถึงดีเยี่ยม</p></div></header>
    <div className="clinical-card employee-card"><div className="employee-avatar" aria-hidden="true">สช</div><div><strong>สุพิตตา ชัยงาม</strong><p>ผู้ดูแลระบบ · รหัสพนักงาน KU-MED-001</p></div><span className="status-pill">อยู่ระหว่างประเมิน</span></div>
    <form onSubmit={submit}><div className="rating-grid">{criteria.map(([title, description], index) => <section className="clinical-card rating-row" key={title}><h2>{index + 1}. {title}</h2><p>{description}</p><div className="rating-options" role="radiogroup" aria-label={title}>{[1,2,3,4,5].map(score => <label key={score}><input type="radio" name={`criterion-${index}`} value={score} required /><span>{score}</span></label>)}</div></section>)}</div>
      <section className="clinical-card clinical-section"><div className="field full"><label htmlFor="feedback">ความคิดเห็นและข้อเสนอแนะเพิ่มเติม</label><textarea id="feedback" name="feedback" placeholder="ระบุจุดเด่นหรือสิ่งที่ควรพัฒนาเพิ่มเติม" /></div></section>
      {notice && <p className="form-notice" role="status">{notice}</p>}{error && <p className="form-error" role="alert">{error}</p>}<div className="form-actions"><button type="reset" className="secondary-button" onClick={() => { setNotice(""); setError(""); }}>ล้างแบบประเมิน</button><button className="primary-button" type="submit" disabled={saving}>{saving ? "กำลังบันทึก..." : "ส่งแบบประเมิน"}</button></div>
    </form>
  </section>;
}
