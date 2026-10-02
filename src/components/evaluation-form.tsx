"use client";

import { useMemo, useState, type FormEvent } from "react";
import { BuddhistDateInput } from "@/components/buddhist-date-input";
import { getDemoSessionProfile } from "@/lib/demo-session";
import { commonCriteria, doctorCriteria, staffCriteria } from "@/lib/evaluation-criteria";

const scoreLabels = ["", "ต้องพัฒนาเร่งด่วน", "ควรพัฒนา", "ตามมาตรฐาน", "ดี", "ดีเด่น"];
type Scores = Record<string, number>;

export function EvaluationForm() {
  const [profile] = useState(() => getDemoSessionProfile());
  const initialRole = profile?.role === "doctor" ? "doctor" : "staff";
  const [assessedRole, setAssessedRole] = useState<"doctor" | "staff">(initialRole), [assessmentType, setAssessmentType] = useState("self"), [scores, setScores] = useState<Scores>({});
  const [notice, setNotice] = useState(""), [error, setError] = useState(""), [saving, setSaving] = useState(false);
  const roleCriteria = assessedRole === "doctor" ? doctorCriteria : staffCriteria;
  const period = useMemo(() => { const now = new Date(), year = now.getFullYear() + 543; return `${now.getMonth() < 6 ? 1 : 2}/${year}`; }, []);
  const selfAssessment = assessmentType === "self";

  function updateRole(role: "doctor" | "staff") { setAssessedRole(role); setScores(current => Object.fromEntries(Object.entries(current).filter(([key]) => key.startsWith("common.")))); }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget, data = new FormData(form); setSaving(true); setNotice(""); setError("");
    const pick = (prefix: string, criteria: readonly (readonly [string, string])[]) => Object.fromEntries(criteria.map(([key]) => [key, scores[`${prefix}.${key}`]]));
    const payload = {
      assessmentType, assessedRole, assessedName: data.get("assessedName"), assessedUserKey: data.get("assessedUserKey"), evaluatorKey: profile?.username || "unknown",
      evaluationRound: data.get("evaluationRound"), commonScores: pick("common", commonCriteria), roleScores: pick("role", roleCriteria),
      strengths: data.get("strengths"), developmentGoals: data.get("developmentGoals"), supportNeeded: data.get("supportNeeded"), actionPlan: data.get("actionPlan"), reviewDate: data.get("reviewDate"), feedback: data.get("feedback"),
    };
    try { const response = await fetch("/api/evaluations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }); const result = await response.json(); if (!response.ok) throw new Error(result.error || "ไม่สามารถบันทึกแบบประเมินได้"); setNotice(result.message); form.reset(); setScores({}); window.scrollTo({ top: 0, behavior: "smooth" }); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "ไม่สามารถบันทึกแบบประเมินได้"); } finally { setSaving(false); }
  }

  return <section className="clinical-page service-evaluation-page internal-evaluation-page">
    <header className="clinical-header evaluation-intro"><div><span className="evaluation-eyebrow">INTERNAL DEVELOPMENT</span><h1>แบบประเมินการทำงานและแผนพัฒนา</h1><p>สำหรับบุคลากรและแพทย์ ใช้ทบทวนผลงาน วางเป้าหมาย และติดตามการพัฒนา</p></div><aside><strong>เกณฑ์คะแนน</strong><span>1 ต้องพัฒนาเร่งด่วน · 2 ควรพัฒนา · 3 ตามมาตรฐาน · 4 ดี · 5 ดีเด่น</span></aside></header>
    {notice && <div className="evaluation-success" role="status"><strong>✓ บันทึกสำเร็จ</strong><span>{notice}</span></div>}
    <form onSubmit={submit} className="service-evaluation-form">
      <section className="clinical-card evaluation-context"><header><span>ขั้นตอนที่ 1</span><div><h2>ข้อมูลการประเมิน</h2><p>ระบุรูปแบบ ผู้รับการประเมิน และรอบประเมิน</p></div></header><div className="evaluation-context-grid">
        <div className="field"><label htmlFor="assessmentType">รูปแบบการประเมิน</label><select id="assessmentType" value={assessmentType} onChange={event => { const next = event.target.value; setAssessmentType(next); if (next === "self") updateRole(initialRole); }}><option value="self">ประเมินตนเอง</option><option value="peer">ประเมินโดยเพื่อนร่วมงาน</option><option value="supervisor">ประเมินโดยหัวหน้างาน</option></select></div>
        <div className="field"><label htmlFor="assessedRole">ประเภทผู้รับการประเมิน</label><select id="assessedRole" value={assessedRole} onChange={event => updateRole(event.target.value as "doctor" | "staff")} disabled={selfAssessment}><option value="staff">บุคลากร</option><option value="doctor">แพทย์</option></select></div>
        <div className="field"><label htmlFor="assessedName">ชื่อ–นามสกุลผู้รับการประเมิน</label><input id="assessedName" name="assessedName" defaultValue={selfAssessment ? profile?.displayName : ""} key={`${assessmentType}-name`} readOnly={selfAssessment} required/></div>
        <div className="field"><label htmlFor="assessedUserKey">Username / รหัสบุคลากร</label><input id="assessedUserKey" name="assessedUserKey" defaultValue={selfAssessment ? profile?.username : ""} key={`${assessmentType}-key`} readOnly={selfAssessment} required/></div>
        <div className="field"><label htmlFor="evaluationRound">รอบการประเมิน</label><input id="evaluationRound" name="evaluationRound" defaultValue={period} required/></div>
      </div></section>

      <EvaluationScoreSection number={1} title="สมรรถนะร่วม" subtitle="มาตรฐานที่ใช้กับบุคลากรและแพทย์ทุกคน" prefix="common" criteria={commonCriteria} scores={scores} setScores={setScores}/>
      <EvaluationScoreSection number={2} title={assessedRole === "doctor" ? "สมรรถนะเฉพาะแพทย์" : "สมรรถนะเฉพาะบุคลากร"} subtitle={assessedRole === "doctor" ? "คุณภาพทางคลินิก ความปลอดภัย และจริยธรรมวิชาชีพ" : "ความถูกต้อง การประสานงาน และคุณภาพงานบริการ"} prefix="role" criteria={roleCriteria} scores={scores} setScores={setScores}/>

      <section className="clinical-card evaluation-feedback"><header><span>ขั้นตอนที่ 3</span><div><h2>สรุปผลและแผนพัฒนา</h2><p>เปลี่ยนผลประเมินให้เป็นเป้าหมายและกิจกรรมที่ติดตามได้</p></div></header><div className="evaluation-context-grid">
        <div className="field full"><label htmlFor="strengths">จุดแข็งที่ควรรักษา</label><textarea id="strengths" name="strengths" placeholder="ระบุพฤติกรรมหรือผลงานที่ทำได้ดี"/></div>
        <div className="field full"><label htmlFor="developmentGoals">ประเด็นที่ต้องการพัฒนา</label><textarea id="developmentGoals" name="developmentGoals" placeholder="ระบุทักษะ กระบวนการ หรือผลลัพธ์ที่ต้องการพัฒนา" required/></div>
        <div className="field full"><label htmlFor="actionPlan">แผนดำเนินการ</label><textarea id="actionPlan" name="actionPlan" placeholder="จะทำอะไร วัดผลอย่างไร และต้องการให้เสร็จเมื่อใด" required/></div>
        <div className="field"><label htmlFor="supportNeeded">การสนับสนุนที่ต้องการ</label><textarea id="supportNeeded" name="supportNeeded" placeholder="เช่น อบรม เครื่องมือ หรือผู้ให้คำปรึกษา"/></div>
        <div className="field"><label>วันที่ติดตามผล</label><BuddhistDateInput name="reviewDate"/></div>
        <div className="field full"><label htmlFor="feedback">ข้อคิดเห็นจากผู้ประเมิน</label><textarea id="feedback" name="feedback"/></div>
      </div></section>
      <aside className="external-feedback-note"><div><strong>ผลประเมินจากผู้ใช้บริการ</strong><p>เก็บผ่าน Google Forms แยกจากแบบประเมินภายใน และนำผลรวมที่ไม่ระบุตัวตนเข้ามาวิเคราะห์แนวโน้มภายหลัง</p></div><span>Google Forms → Google Sheets → KU-MED</span></aside>
      {error && <p className="form-error" role="alert">{error}</p>}<div className="form-actions evaluation-actions"><button type="reset" className="secondary-button" onClick={() => { setScores({}); setNotice(""); setError(""); }}>ล้างข้อมูล</button><button className="primary-button" type="submit" disabled={saving}>{saving ? "กำลังบันทึก…" : "บันทึกผลและแผนพัฒนา"}</button></div>
    </form>
  </section>;
}

function EvaluationScoreSection({ number, title, subtitle, prefix, criteria, scores, setScores }: { number: number; title: string; subtitle: string; prefix: string; criteria: readonly (readonly [string, string])[]; scores: Scores; setScores: React.Dispatch<React.SetStateAction<Scores>> }) {
  return <section className="clinical-card evaluation-score-section"><header><i>{number}</i><div><h2>{title}</h2><p>{subtitle}</p></div></header><div className="evaluation-score-table"><div className="score-table-head"><span>หัวข้อประเมิน</span>{[1,2,3,4,5].map(value => <span key={value}>{value}<small>{scoreLabels[value]}</small></span>)}</div>{criteria.map(([key, label], index) => <div className="score-question" key={key}><div><b>{index + 1}</b><span>{label}</span></div><div className="score-options" role="radiogroup" aria-label={label}>{[1,2,3,4,5].map(value => <label key={value} title={scoreLabels[value]}><input type="radio" name={`${prefix}.${key}`} value={value} checked={scores[`${prefix}.${key}`] === value} onChange={() => setScores(current => ({ ...current, [`${prefix}.${key}`]: value }))} required/><span>{value}</span></label>)}</div></div>)}</div></section>;
}
