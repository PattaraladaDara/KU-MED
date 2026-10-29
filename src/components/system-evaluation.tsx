"use client";

import { useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { getDemoSessionProfile } from "@/lib/demo-session";

const questions = [
  ["easeOfUse", "ระบบใช้งานง่าย"],
  ["speed", "ระบบตอบสนองรวดเร็ว"],
  ["clarity", "เมนูและข้อความเข้าใจง่าย"],
  ["reliability", "ระบบทำงานถูกต้องและเสถียร"],
  ["overall", "ความพึงพอใจโดยรวม"],
] as const;

type DialogKind = "incomplete" | "success";

export function SystemEvaluation() {
  const profile = getDemoSessionProfile();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [dialog, setDialog] = useState<DialogKind | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    const form = event.currentTarget;
    event.preventDefault();
    if (!profile) return;

    const data = new FormData(form);
    const missingQuestion = questions.find(([key]) => !data.get(key));
    if (missingQuestion) {
      setDialog("incomplete");
      return;
    }

    setSaving(true);
    setError("");
    const scores = Object.fromEntries(questions.map(([key]) => [key, data.get(key)]));

    try {
      const response = await fetch("/api/evaluations/system", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          evaluatorKey: profile.username,
          evaluatorName: profile.displayName,
          role: profile.role,
          scores,
          feedback: data.get("feedback"),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "บันทึกไม่สำเร็จ");

      form.reset();
      setDialog("success");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  function clearForm() {
    setError("");
    setDialog(null);
  }

  return (
    <section className="clinical-page service-evaluation-page">
      <header className="clinical-header evaluation-intro">
        <div>
          <span className="evaluation-eyebrow">SYSTEM EXPERIENCE</span>
          <h1>ประเมินระบบ KU-MED</h1>
          <p>ร่วมประเมินความง่าย ความรวดเร็ว และความเหมาะสมของระบบ เพื่อนำไปปรับปรุงการทำงาน</p>
        </div>
        <aside>
          <strong>เกณฑ์คะแนน</strong>
          <span>1 ควรปรับปรุงมาก · 2 ควรปรับปรุง · 3 ปานกลาง · 4 ดี · 5 ดีมาก</span>
        </aside>
      </header>

      <form className="service-evaluation-form" onSubmit={submit} noValidate>
        <section className="clinical-card evaluation-score-section">
          <header>
            <i>1</i>
            <div>
              <h2>ประสบการณ์ใช้งานระบบ</h2>
              <p>กรุณาให้คะแนนทุกหัวข้อ</p>
            </div>
          </header>
          <div className="evaluation-score-table">
            <div className="score-table-head">
              <span>หัวข้อประเมิน</span>
              {[1, 2, 3, 4, 5].map((value) => <span key={value}>{value}</span>)}
            </div>
            {questions.map(([key, label], index) => (
              <div className="score-question" key={key}>
                <div><b>{index + 1}</b><span>{label}</span></div>
                <div className="score-options" role="radiogroup" aria-label={label}>
                  {[1, 2, 3, 4, 5].map((value) => (
                    <label key={value}>
                      <input type="radio" name={key} value={value}/>
                      <span>{value}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="clinical-card evaluation-feedback">
          <header>
            <span>2</span>
            <div>
              <h2>ข้อเสนอแนะเพิ่มเติม</h2>
              <p>ระบุปัญหาที่พบหรือสิ่งที่ต้องการให้ปรับปรุง</p>
            </div>
          </header>
          <textarea name="feedback" placeholder="ข้อเสนอแนะเกี่ยวกับระบบ..."/>
        </section>

        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="form-actions evaluation-actions">
          <button type="reset" className="secondary-button" onClick={clearForm}>ล้างข้อมูล</button>
          <button type="submit" className="primary-button" disabled={saving}>
            {saving ? "กำลังบันทึก…" : "ส่งแบบประเมินระบบ"}
          </button>
        </div>
      </form>

      {dialog && typeof document !== "undefined" && createPortal(
        <div className="record-modal-backdrop system-evaluation-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setDialog(null); }}>
          <section className="record-modal system-evaluation-dialog" role="alertdialog" aria-modal="true" aria-labelledby="system-evaluation-dialog-title" aria-describedby="system-evaluation-dialog-message" onMouseDown={(event) => event.stopPropagation()}>
            <div className={`system-evaluation-dialog-icon ${dialog}`} aria-hidden="true">{dialog === "success" ? "✓" : "!"}</div>
            <h2 id="system-evaluation-dialog-title">{dialog === "success" ? "ส่งแบบประเมินสำเร็จ" : "กรุณาตอบให้ครบ"}</h2>
            <p id="system-evaluation-dialog-message">{dialog === "success" ? "ขอบคุณสำหรับความคิดเห็น ระบบบันทึกผลประเมินของคุณแล้ว" : "กรุณาเลือกคะแนนให้ครบทุกหัวข้อในข้อ 1 ก่อนส่งแบบประเมิน"}</p>
            <button type="button" className="primary-button" onClick={() => setDialog(null)}>{dialog === "success" ? "ตกลง" : "รับทราบ"}</button>
          </section>
        </div>,
        document.body,
      )}
    </section>
  );
}
