"use client";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";

type Treatment = { id:string; visitedAt:string; department:string; diagnosis:string; clinician:string|null; visitType:string };
type Patient = { id:string; citizenId:string; title:string; firstName:string; lastName:string; studentId:string; status:string; birthDate:string; gender:string; faculty:string; major:string; studyYear:string; phone:string; email:string; coverage:string; allergyNotes:string|null; treatments:Treatment[] };

export function PatientSearch() {
  const [query,setQuery]=useState(""); const [status,setStatus]=useState("ทั้งหมด"); const [patients,setPatients]=useState<Patient[]>([]); const [loading,setLoading]=useState(true); const [error,setError]=useState("");
  const load=useCallback(async(term="")=>{setLoading(true);setError("");try{const response=await fetch(`/api/patients?q=${encodeURIComponent(term.trim())}`);const result=await response.json();if(!response.ok)throw new Error(result.error||"ค้นหาไม่สำเร็จ");setPatients(result.patients);}catch(reason){setError(reason instanceof Error?reason.message:"ค้นหาไม่สำเร็จ");setPatients([]);}finally{setLoading(false);}},[]);
  useEffect(()=>{let active=true;fetch("/api/patients?q=").then(async response=>{const result=await response.json();if(!response.ok)throw new Error(result.error||"โหลดข้อมูลไม่สำเร็จ");return result;}).then(result=>{if(active)setPatients(result.patients);}).catch(reason=>{if(active)setError(reason instanceof Error?reason.message:"โหลดข้อมูลไม่สำเร็จ");}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[]);
  const filtered=useMemo(()=>status==="ทั้งหมด"?patients:patients.filter(patient=>patient.status===status),[patients,status]);
  function submit(event:FormEvent){event.preventDefault();void load(query);}
  return <section className="clinical-page directory-page"><header className="clinical-header"><div><h1>ค้นหารายชื่อผู้ใช้บริการ</h1><p>ค้นหาและตรวจสอบข้อมูลนิสิต บุคลากร และประวัติการเข้ารับบริการ</p></div></header>
    <section className="clinical-card directory-toolbar"><form className="directory-search" role="search" onSubmit={submit}><label htmlFor="patient-search">ค้นหาผู้ใช้บริการ</label><div className="search-control"><span aria-hidden="true">⌕</span><input id="patient-search" value={query} onChange={event=>setQuery(event.target.value)} placeholder="ชื่อ–นามสกุล รหัสนิสิต หรือเลขประจำตัวประชาชน"/><button className="primary-button" type="submit" disabled={loading}>{loading?"กำลังค้นหา...":"ค้นหา"}</button></div></form><div className="directory-filter"><label htmlFor="patient-status">สถานภาพ</label><select id="patient-status" value={status} onChange={event=>setStatus(event.target.value)}><option>ทั้งหมด</option><option>นิสิตปัจจุบัน</option><option>บุคลากร</option></select></div></section>
    {error&&<p className="form-error" role="alert">{error}</p>}
    <section className="clinical-card directory-results"><div className="directory-results-head"><div><h2>รายชื่อผู้ใช้บริการ</h2><p>พบทั้งหมด {filtered.length} รายการ</p></div><button className="secondary-button" type="button" onClick={()=>void load(query)}>รีเฟรชข้อมูล</button></div>
      <div className="directory-table-wrap"><table className="directory-table"><thead><tr><th>ชื่อ–นามสกุล</th><th>รหัสนิสิต</th><th>คณะ / สังกัด</th><th>ชั้นปี</th><th>สถานภาพ</th><th><span className="sr-only">จัดการ</span></th></tr></thead><tbody>{!loading&&filtered.map(patient=><tr key={patient.id}><td><div className="directory-person"><span className="directory-avatar">{patient.firstName.slice(0,1)}{patient.lastName.slice(0,1)}</span><span><strong>{patient.title}{patient.firstName} {patient.lastName}</strong><small>{patient.email}</small></span></div></td><td>{patient.studentId}</td><td>{patient.faculty}<small>{patient.major}</small></td><td>{patient.studyYear}</td><td><span className="status-pill">{patient.status}</span></td><td><Link className="row-action" href={`/patients/${patient.id}`}>ดูข้อมูล</Link></td></tr>)}</tbody></table>
        {loading&&<div className="directory-empty">กำลังโหลดข้อมูล...</div>}{!loading&&filtered.length===0&&<div className="directory-empty"><strong>ไม่พบรายชื่อผู้ใช้บริการ</strong><span>ลองเปลี่ยนคำค้นหา หรือลงทะเบียนข้อมูลใหม่</span></div>}
      </div>
      <div className="directory-footer">แสดง {filtered.length} จาก {patients.length} รายการ</div>
    </section>
  </section>;
}
