"use client";

import { useState, type FormEvent } from "react";
import { createPortal } from "react-dom";

type StatusPatient = { id: string; status: string; coverageStatus: string };
const patientStatuses = ["นิสิตปัจจุบัน", "อาจารย์", "บุคลากร", "บุคคลภายนอก"];
const coverageStatuses = ["ใช้งานได้", "รอตรวจสอบ"];

export function PatientStatusEditor({ patient, onChanged }: { patient: StatusPatient; onChanged: (message?: string) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const response = await fetch("/api/patients/" + patient.id + "/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "แก้ไขสถานะไม่สำเร็จ");
      setOpen(false);
      await onChanged("แก้ไขสถานะผู้รับบริการและบันทึกประวัติเรียบร้อยแล้ว");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "แก้ไขสถานะไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  return <>
    <button type="button" className="secondary-button" onClick={() => { setError(""); setOpen(true); }}>แก้ไขสถานะ</button>
    {open && createPortal(<div className="record-modal-backdrop status-editor-backdrop" role="presentation" onMouseDown={() => !saving && setOpen(false)}>
      <section className="record-modal status-editor-modal" role="dialog" aria-modal="true" aria-labelledby="patient-status-title" onMouseDown={event => event.stopPropagation()}>
        <header><div><h2 id="patient-status-title">แก้ไขสถานะผู้รับบริการ</h2><p>เปลี่ยนเฉพาะสถานภาพหรือสถานะสิทธิ พร้อมระบุเหตุผล</p></div><button type="button" aria-label="ปิด" disabled={saving} onClick={() => setOpen(false)}>×</button></header>
        <form className="record-form" onSubmit={save}>
          <div className="field"><label htmlFor="patient-status">สถานภาพผู้รับบริการ</label><select id="patient-status" name="status" defaultValue={patient.status}>{!patientStatuses.includes(patient.status) && <option value={patient.status}>{patient.status} (ค่าเดิม)</option>}{patientStatuses.map(value => <option key={value} value={value}>{value}</option>)}</select></div>
          <div className="field"><label htmlFor="coverage-status">สถานะสิทธิการรักษา</label><select id="coverage-status" name="coverageStatus" defaultValue={patient.coverageStatus}>{!coverageStatuses.includes(patient.coverageStatus) && <option value={patient.coverageStatus}>{patient.coverageStatus} (ค่าเดิม)</option>}{coverageStatuses.map(value => <option key={value} value={value}>{value}</option>)}</select></div>
          <div className="field full"><label htmlFor="status-reason">เหตุผลการแก้ไข <span className="required">*</span></label><textarea id="status-reason" name="reason" maxLength={500} required placeholder="เช่น เลือกสถานภาพผิดตอนลงทะเบียน"/></div>
          {error && <p className="form-error record-form-actions" role="alert">{error}</p>}
          <div className="form-actions record-form-actions"><button type="button" className="secondary-button" disabled={saving} onClick={() => setOpen(false)}>ยกเลิก</button><button type="submit" className="primary-button" disabled={saving}>{saving ? "กำลังบันทึก..." : "บันทึกสถานะ"}</button></div>
        </form>
      </section>
    </div>, document.body)}
  </>;
}
