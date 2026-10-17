"use client";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { getDemoSessionProfile } from "@/lib/demo-session";

type Question = { id: string; questionId: string; title: string; questionType: string; metricKey: string; active: boolean };
type Data = {
  role: string; canManage: boolean;
  config: { formUrl: string; sheetUrl: string; formId: string; title: string; status: string; lastSchemaSyncAt: string | null; lastResponseSyncAt: string | null; lastError: string | null };
  questions: Question[];
  summary: { responses: number; overall: number; staff: number; speed: number };
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
    const response = await fetch(`/api/evaluations/service?userKey=${encodeURIComponent(profile.username)}`, { cache: "no-store" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "โหลดข้อมูลไม่สำเร็จ");
    setData(result); setFormUrl(result.config.formUrl || ""); setSheetUrl(result.config.sheetUrl || "");
    setMappings(Object.fromEntries((result.questions as Question[]).map((question) => [question.questionId, question.metricKey])));
  }, [profile]);
  useEffect(() => {
    if (!profile) return;
    let active = true;
    fetch(`/api/evaluations/service?userKey=${encodeURIComponent(profile.username)}`, { cache: "no-store" })
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
      const response = await fetch("/api/evaluations/service", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, actorKey: profile.username }) });
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
    <header className="clinical-header"><div><h1>ผลประเมินการให้บริการ</h1><p>เชื่อม Google Form ครั้งเดียว แล้วระบบจะติดตามคำถามและนำผลมาแสดงในรายงาน</p></div>{data?.config.formUrl && <a className="primary-button" href={data.config.formUrl} target="_blank" rel="noreferrer">เปิด Google Form</a>}</header>
    {notice && <div className="evaluation-success" role="status"><strong>✓ สำเร็จ</strong><span>{notice}</span></div>}
    {error && <p className="form-error" role="alert">{error}</p>}
    {data?.canManage && <section className="evaluation-setup">
      <div className="evaluation-setup-title"><div><span>ตั้งค่าสำหรับผู้ดูแลระบบ</span><h2>เชื่อมผลประเมิน 2 ขั้นตอน</h2></div><p>ไม่ต้องสร้าง Google Cloud หรือ Service Account เพียงเชื่อมชีตคำตอบและเลือกข้อมูลที่ต้องการ</p></div>
      <form className={`clinical-card setup-step ${data?.config.formId ? "is-complete" : "needs-action"}`} onSubmit={connect}><span className="setup-number">1</span><div className="setup-content"><header><div><h3>เชื่อมแบบประเมิน</h3><p>เชื่อม Google Form กับชีตคำตอบ แล้วนำลิงก์ทั้งสองมาวางด้านล่าง</p></div><Status ok={Boolean(data?.config.formId)} label={data?.config.formId ? "เชื่อมต่อแล้ว" : "รอการเชื่อมต่อ"}/></header><div className="simple-connect-grid"><div className="field"><label>ลิงก์ Google Form</label><input type="url" value={formUrl} onChange={(event) => setFormUrl(event.target.value)} placeholder="https://docs.google.com/forms/..." required/></div><div className="field"><label>ลิงก์ Google Sheets ที่เก็บคำตอบ</label><input type="url" value={sheetUrl} onChange={(event) => setSheetUrl(event.target.value)} placeholder="https://docs.google.com/spreadsheets/d/..." required/><small>ที่ Google Sheets กด แชร์ → การเข้าถึงทั่วไป → ทุกคนที่มีลิงก์ → ผู้มีสิทธิ์ดู</small></div></div><div className="connect-actions"><button className="primary-button" disabled={saving}>{data?.config.formId ? "ตรวจสอบและเชื่อมต่อใหม่" : "ตรวจสอบและเชื่อมต่อ"}</button></div>{data?.config.formId && <div className="connection-summary"><strong>เชื่อมชีตคำตอบแล้ว</strong><span>ตรวจข้อมูลล่าสุด {dateTime(data.config.lastSchemaSyncAt)}</span><button type="button" disabled={saving} onClick={() => void request("POST", { action: "refresh-schema" })}>ตรวจการเปลี่ยนแปลง</button></div>}</div></form>
      {data?.config.formId && <article className={`clinical-card setup-step ${Object.values(mappings).includes("overall") ? "is-complete" : "needs-action"}`}><span className="setup-number">2</span><div className="setup-content"><header><div><h3>เลือกข้อมูลที่ใช้ในรายงาน</h3><p>เลือกความหมายของแต่ละคอลัมน์ หากเพิ่มหรือสลับคอลัมน์ ระบบจะตรวจพบให้อัตโนมัติ</p></div><Status ok={Object.values(mappings).includes("overall")} label={`${activeQuestions.length} คอลัมน์`}/></header><div className="question-mapping-list">{activeQuestions.map((question) => <label key={question.questionId} className="question-mapping-row"><span><strong>{question.title}</strong><small>ข้อมูลจาก Google Sheets</small></span><select value={mappings[question.questionId] || ""} onChange={(event) => mapQuestion(question.questionId, event.target.value)}>{metrics.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>)}</div>{inactiveCount > 0 && <p className="schema-note">พบคอลัมน์เดิมที่ถูกนำออกหรือเปลี่ยนชื่อ {inactiveCount} รายการ ข้อมูลเก่ายังคงถูกเก็บไว้</p>}<div className="mapping-actions"><button type="button" className="secondary-button" disabled={saving} onClick={saveMappings}>บันทึกการจับคู่</button><button type="button" className="primary-button" disabled={saving || !Object.values(mappings).includes("overall")} onClick={() => void request("POST", { action: "sync" })}>{saving ? "กำลังดำเนินการ..." : "ซิงก์ผลประเมินล่าสุด"}</button></div><p className="last-sync">ซิงก์คำตอบล่าสุด: {dateTime(data.config.lastResponseSyncAt)}</p></div></article>}
    </section>}
    <div className="report-summary-grid"><Card label="จำนวนคำตอบ" value={`${data?.summary.responses || 0} รายการ`}/><Card label="ความพึงพอใจโดยรวม" value={`${data?.summary.overall || 0} / 5`}/><Card label="การให้บริการของเจ้าหน้าที่" value={`${data?.summary.staff || 0} / 5`}/><Card label="ความรวดเร็ว" value={`${data?.summary.speed || 0} / 5`}/></div>
    <div className="report-dashboard-grid"><article className="clinical-card report-list-card"><header><h2>จำนวนผลประเมินตามหน่วยงาน</h2></header><div className="ranked-rows">{data?.units.length ? data.units.map((item, index) => <div key={item.label}><span className="rank-number">{index + 1}</span><p>{item.label}</p><strong>{item.value}</strong></div>) : <p className="report-empty">ยังไม่มีข้อมูล</p>}</div></article><article className="clinical-card report-list-card"><header><h2>ข้อเสนอแนะล่าสุด</h2></header><div className="evaluation-comments">{data?.comments.length ? data.comments.map((item) => <article key={item.id}><strong>{item.unit || "ไม่ระบุหน่วยงาน"}</strong><p>{item.feedback}</p><small>{dateTime(item.createdAt)}</small></article>) : <p className="report-empty">ยังไม่มีข้อเสนอแนะ</p>}</div></article></div>
  </section>;
}
function Status({ ok, label }: { ok: boolean; label: string }) { return <span className={`setup-status ${ok ? "ok" : "pending"}`}>{ok ? "✓" : "!"} {label}</span>; }
function Card({ label, value }: { label: string; value: string }) { return <article className="clinical-card report-summary-card"><div><p>{label}</p><strong>{value}</strong></div></article>; }
