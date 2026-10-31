"use client";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { getDemoSessionProfile } from "@/lib/demo-session";

type Question = { id: string; questionId: string; title: string; questionType: string; metricKey: string; active: boolean };
type Data = {
  role: string; canManage: boolean;
  config: { formUrl: string; sheetUrl: string; formId: string; title: string; status: string; lastSchemaSyncAt: string | null; lastResponseSyncAt: string | null; lastError: string | null };
  questions: Question[];
  summary: { responses: number; overall: number; staff: number; speed: number; displayMetrics: { questionId: string; metricKey: string | null; label: string; average: number; responses: number }[] };
  units: { label: string; value: number }[];
  comments: { id: string; unit: string | null; feedback: string | null; createdAt: string }[];
};
const metrics = [
  ["", "ไม่นำไปใช้ในรายงาน"], ["serviceUnit", "จุดบริการ / หน่วยงาน"], ["overall", "ความพึงพอใจโดยรวม *"],
  ["staff", "การให้บริการของเจ้าหน้าที่"], ["speed", "ความรวดเร็ว"], ["feedback", "ข้อเสนอแนะเพิ่มเติม"],
];
const dateTime = (value: string | null) => value ? new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Bangkok" }).format(new Date(value)) : "ยังไม่เคย";

export function ServiceEvaluationResults() {
  const [profile] = useState(() => getDemoSessionProfile());
  const [data, setData] = useState<Data | null>(null), [loading, setLoading] = useState(true), [saving, setSaving] = useState(false);
  const [error, setError] = useState(""), [notice, setNotice] = useState(""), [formUrl, setFormUrl] = useState(""), [sheetUrl, setSheetUrl] = useState("");
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const load = useCallback(async () => {
    if (!profile) return;
    const response = await fetch("/api/evaluations/service", { cache: "no-store" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "โหลดข้อมูลไม่สำเร็จ");
    setData(result); setFormUrl(result.config.formUrl || ""); setSheetUrl(result.config.sheetUrl || "");
    setMappings(Object.fromEntries((result.questions as Question[]).map((question) => [question.questionId, question.metricKey])));
  }, [profile]);
  useEffect(() => {
    if (!profile) return;
    let active = true;
    fetch("/api/evaluations/service", { cache: "no-store" })
      .then(async (response) => { const result = await response.json(); if (!response.ok) throw new Error(result.error || "โหลดข้อมูลไม่สำเร็จ"); return result as Data; })
      .then((result) => { if (active) { setData(result); setFormUrl(result.config.formUrl || ""); setSheetUrl(result.config.sheetUrl || ""); setMappings(Object.fromEntries(result.questions.map((question) => [question.questionId, question.metricKey]))); } })
      .catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : "โหลดข้อมูลไม่สำเร็จ"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [profile]);
  async function request(method: "POST" | "PUT", body: Record<string, unknown>) {
    if (!profile) return;
    setSaving(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/evaluations/service", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "ดำเนินการไม่สำเร็จ");
      setNotice(result.message); await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "ดำเนินการไม่สำเร็จ"); }
    finally { setSaving(false); }
  }
  function connect(event: FormEvent<HTMLFormElement>) { event.preventDefault(); void request("POST", { action: "connect", formUrl, sheetUrl }); }
  function saveMappings() { void request("PUT", { mappings: Object.entries(mappings).map(([questionId, metricKey]) => ({ questionId, metricKey })) }); }
  function mapQuestion(questionId: string, metricKey: string) {
    setMappings((current) => Object.fromEntries(Object.entries(current).map(([id, value]) => [id, metricKey && value === metricKey ? "" : value]).concat([[questionId, metricKey]])));
  }
  if (loading) return <section className="clinical-page settings-loading">กำลังโหลดผลการประเมิน...</section>;
  const activeQuestions = data?.questions.filter((question) => question.active) || [], inactiveCount = (data?.questions.length || 0) - activeQuestions.length;
  return <section className="clinical-page reports-page evaluation-results-page">
    <header className="clinical-header evaluation-page-header"><div className="evaluation-page-heading"><span className="evaluation-eyebrow">KU-MED · SERVICE INSIGHTS</span><h1><span className="evaluation-title-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M7 3.75h7l4 4v12.5H7a2 2 0 0 1-2-2v-12.5a2 2 0 0 1 2-2Z"/><path d="M14 3.75v4h4M8.5 12h7M8.5 15.5h7"/></svg></span>ผลประเมินการให้บริการ</h1><p>ติดตามความพึงพอใจและข้อเสนอแนะ เพื่อพัฒนาคุณภาพการให้บริการของสถานพยาบาล</p><span className="evaluation-live-caption"><i/>สรุปข้อมูลจาก Google Sheets ที่เชื่อมต่อ</span></div>{data?.config.formUrl && <a className="primary-button evaluation-form-link" href={data.config.formUrl} target="_blank" rel="noreferrer"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9"/><path d="M18 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5"/></svg>เปิด Google Form</a>}</header>
    {notice && <div className="evaluation-success" role="status"><strong>✓ สำเร็จ</strong><span>{notice}</span></div>}
    {error && <p className="form-error" role="alert">{error}</p>}
    {data?.canManage && <section className="evaluation-setup">
      <div className="evaluation-setup-title"><div><span>ตั้งค่าสำหรับผู้ดูแลระบบ</span><h2>เชื่อมผลประเมิน 2 ขั้นตอน</h2></div><p>ไม่ต้องสร้าง Google Cloud หรือ Service Account เพียงเชื่อมชีตคำตอบและเลือกข้อมูลที่ต้องการ</p></div>
      <form className={`clinical-card setup-step ${data?.config.formId ? "is-complete" : "needs-action"}`} onSubmit={connect}><span className="setup-number">1</span><div className="setup-content"><header><div><h3>เชื่อมแบบประเมิน</h3><p>เชื่อม Google Form กับชีตคำตอบ แล้วนำลิงก์ทั้งสองมาวางด้านล่าง</p></div><Status ok={Boolean(data?.config.formId)} label={data?.config.formId ? "เชื่อมต่อแล้ว" : "รอการเชื่อมต่อ"}/></header><div className="simple-connect-grid"><div className="field"><label>ลิงก์ Google Form</label><input type="url" value={formUrl} onChange={(event) => setFormUrl(event.target.value)} placeholder="https://docs.google.com/forms/..." required/></div><div className="field"><label>ลิงก์ Google Sheets ที่เก็บคำตอบ</label><input type="url" value={sheetUrl} onChange={(event) => setSheetUrl(event.target.value)} placeholder="https://docs.google.com/spreadsheets/d/..." required/><small>ที่ Google Sheets กด แชร์ → การเข้าถึงทั่วไป → ทุกคนที่มีลิงก์ → ผู้มีสิทธิ์ดู</small></div></div><div className="connect-actions"><button className="primary-button" disabled={saving}>{data?.config.formId ? "ตรวจสอบและเชื่อมต่อใหม่" : "ตรวจสอบและเชื่อมต่อ"}</button></div>{data?.config.formId && <div className="connection-summary"><strong>เชื่อมชีตคำตอบแล้ว</strong><span>ตรวจข้อมูลล่าสุด {dateTime(data.config.lastSchemaSyncAt)}</span><button type="button" disabled={saving} onClick={() => void request("POST", { action: "refresh-schema" })}>ตรวจการเปลี่ยนแปลง</button></div>}</div></form>
      {data?.config.formId && <article className={`clinical-card setup-step ${Object.values(mappings).includes("overall") ? "is-complete" : "needs-action"}`}><span className="setup-number">2</span><div className="setup-content"><header><div><h3>เลือกข้อมูลที่ใช้ในรายงาน</h3><p>เลือกหัวข้อคะแนน 1–5 จากชีตให้ตรงกับข้อมูลที่ต้องการแสดง การ์ดสรุปจะแสดงชื่อหัวข้อตามชีต</p></div><Status ok={Object.values(mappings).includes("overall")} label={`${Object.values(mappings).filter((key) => key === "overall" || key === "staff" || key === "speed").length} การ์ดสรุป`}/></header><div className="question-mapping-list">{activeQuestions.map((question) => <label key={question.questionId} className="question-mapping-row"><span><strong>{question.title}</strong><small>ข้อมูลจาก Google Sheets</small></span><select value={mappings[question.questionId] || ""} onChange={(event) => mapQuestion(question.questionId, event.target.value)}>{metrics.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>)}</div>{inactiveCount > 0 && <p className="schema-note">พบคอลัมน์เดิมที่ถูกนำออกหรือเปลี่ยนชื่อ {inactiveCount} รายการ ข้อมูลเก่ายังคงถูกเก็บไว้</p>}<div className="mapping-actions"><button type="button" className="secondary-button" disabled={saving} onClick={saveMappings}>บันทึกการจับคู่</button><button type="button" className="primary-button" disabled={saving || !Object.values(mappings).includes("overall")} onClick={() => void request("POST", { action: "sync" })}>{saving ? "กำลังดำเนินการ..." : "ซิงก์ผลประเมินล่าสุด"}</button></div><p className="last-sync">ซิงก์คำตอบล่าสุด: {dateTime(data.config.lastResponseSyncAt)}</p></div></article>}
    </section>}
    <div className="report-summary-grid"><Card label="จำนวนคำตอบ" value={`${data?.summary.responses || 0} รายการ`}/>{data?.summary.displayMetrics.length ? data.summary.displayMetrics.map((metric) => <Card key={metric.questionId} label={metric.label} value={`${metric.average} / 5`}/>) : <article className="clinical-card report-summary-card report-summary-card-empty"><span className="evaluation-stat-icon evaluation-stat-score" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="m12 3 2.7 5.47 6.03.88-4.36 4.25 1.03 6.01L12 16.77l-5.4 2.84 1.03-6.01-4.36-4.25 6.03-.88L12 3Z"/></svg></span><div><p>คะแนนสรุป</p><strong>เลือกหัวข้อจากชีตในขั้นตอนที่ 2</strong></div></article>}</div>
    <div className="report-dashboard-grid"><article className="clinical-card report-list-card"><header><span className="evaluation-section-icon evaluation-unit-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M4 20V7.5L12 4l8 3.5V20H4Z"/><path d="M8 9h1m6 0h1M8 12.5h1m6 0h1M10 20v-4h4v4"/></svg></span><div><h2>จำนวนผลประเมินตามหน่วยงาน</h2><p>เปรียบเทียบจำนวนคำตอบในแต่ละจุดบริการ</p></div></header><div className="ranked-rows">{data?.units.length ? data.units.map((item, index) => <div key={item.label}><span className="rank-number">{index + 1}</span><p>{item.label}</p><strong>{item.value}</strong></div>) : <p className="report-empty">ยังไม่มีข้อมูล</p>}</div></article><article className="clinical-card report-list-card"><header><span className="evaluation-section-icon evaluation-feedback-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H6l-3 2v-9.5a7.5 7.5 0 0 1 7.5-7.5h2A7.5 7.5 0 0 1 20 11.5Z"/><path d="M8 11h8m-8 3.5h5"/></svg></span><div><h2>ข้อเสนอแนะล่าสุด</h2><p>เสียงสะท้อนจากผู้มาใช้บริการ</p></div></header><div className="evaluation-comments">{data?.comments.length ? data.comments.map((item) => <article key={item.id}><strong>{item.unit || "ไม่ระบุหน่วยงาน"}</strong><p>{item.feedback}</p><small>{dateTime(item.createdAt)}</small></article>) : <p className="report-empty">ยังไม่มีข้อเสนอแนะ</p>}</div></article></div>
  </section>;
}
function Status({ ok, label }: { ok: boolean; label: string }) { return <span className={`setup-status ${ok ? "ok" : "pending"}`}>{ok ? "✓" : "!"} {label}</span>; }
function Card({ label, value }: { label: string; value: string }) { const isCount = label === "จำนวนคำตอบ"; return <article className={`clinical-card report-summary-card ${isCount ? "evaluation-count-card" : "evaluation-score-card"}`}><span className={`evaluation-stat-icon ${isCount ? "evaluation-stat-count" : "evaluation-stat-score"}`} aria-hidden="true">{isCount ? <svg viewBox="0 0 24 24" fill="none"><path d="M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8-1a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM3.5 19v-1.5A4.5 4.5 0 0 1 8 13h1a4.5 4.5 0 0 1 4.5 4.5V19h-10Zm11 0v-1.5a4.5 4.5 0 0 0-1.2-3.05A4 4 0 0 1 16 13h.5a4 4 0 0 1 4 4v2h-6Z"/></svg> : <svg viewBox="0 0 24 24" fill="none"><path d="m12 3 2.7 5.47 6.03.88-4.36 4.25 1.03 6.01L12 16.77l-5.4 2.84 1.03-6.01-4.36-4.25 6.03-.88L12 3Z"/></svg>}</span><div><p>{label}</p><strong>{value}</strong></div></article>; }
