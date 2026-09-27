"use client";
import { useState } from "react";

const reports = [
  { icon: "▥", title: "รายงานภาพรวมการใช้งาน", description: "สรุปจำนวนผู้เข้ารับบริการ ประเภทการรักษา และแนวโน้มการใช้งานสถานพยาบาล" },
  { icon: "⌕", title: "รายงานรายละเอียดรายบุคคล", description: "ค้นหาและออกรายงานประวัติการเข้ารับบริการของนิสิตหรือบุคลากรแต่ละราย" },
  { icon: "✚", title: "รายงานยาและเวชภัณฑ์", description: "ตรวจสอบการเบิกจ่ายยา คงคลังเวชภัณฑ์ และรายการที่ควรสั่งซื้อเพิ่มเติม" },
];

export function ReportsPanel() {
  const [notice, setNotice] = useState("");
  return <section className="clinical-page"><header className="clinical-header"><div><h1>รายงาน</h1><p>เลือกรูปแบบรายงานและช่วงเวลาที่ต้องการ เพื่อตรวจสอบข้อมูลการให้บริการ</p></div></header>
    <div className="clinical-card clinical-section report-filters"><div className="field-grid"><div className="field wide"><label htmlFor="period">ช่วงเวลารายงาน</label><select id="period"><option>เดือนปัจจุบัน</option><option>3 เดือนล่าสุด</option><option>ภาคการศึกษาปัจจุบัน</option><option>ปีการศึกษา 2569</option></select></div><div className="field wide"><label htmlFor="format">รูปแบบไฟล์</label><select id="format"><option>PDF</option><option>Excel (.xlsx)</option><option>CSV</option></select></div></div></div>
    <div className="report-grid">{reports.map((report) => <article className="clinical-card report-card" key={report.title}><span className="report-icon" aria-hidden="true">{report.icon}</span><h2>{report.title}</h2><p>{report.description}</p><button className="primary-button" type="button" onClick={() => setNotice(`เตรียมตัวอย่าง “${report.title}” แล้ว — ยังไม่มีการส่งออกไฟล์ในเวอร์ชัน frontend`)}>สร้างรายงาน</button></article>)}</div>
    {notice && <p className="form-notice" role="status">{notice}</p>}
  </section>;
}
