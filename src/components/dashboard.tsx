"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { THAI_BUDDHIST_LOCALE, THAI_TIME_ZONE } from "@/lib/thai-date";
import { getDemoSessionProfile } from "@/lib/demo-session";

type QueueStatus = "waiting" | "in_progress" | "completed" | "no_show";
type DashboardIconName = "users" | "userPlus" | "calendar" | "clock" | "check" | "alert" | "rooms" | "chart" | "finance" | "shortcut" | "search" | "report";
type DashboardData = {
  updatedAt: string;
  summary: { visits: number; newPatients: number; appointments: number; completed: number; waiting: number };
  queue: { id: string; patientId: string; time: string; department: string; clinician: string | null; reason: string; studentId: string; patientName: string; status: QueueStatus }[];
  rooms: { name: string; visits: number; waiting: number; inProgress: number }[];
  trend: { date: string; count: number }[];
  finance: { totalSatang: number; cashSatang: number; transferSatang: number; coverageCount: number; pendingTransfers: number };
  executive:{previous:{visits:number;newPatients:number;appointments:number;revenueSatang:number};quality:{averageTriageWaitMinutes:number|null;averageDispenseMinutes:number|null;noShowRate:number};budget:{fiscalYear:number;allocatedSatang:number;committedSatang:number;remainingSatang:number;utilizationPercent:number}};
};

const number = new Intl.NumberFormat("th-TH");
const money = (satang: number) => (satang / 100).toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dateTime = (value: string) => new Intl.DateTimeFormat(THAI_BUDDHIST_LOCALE, { dateStyle: "long", timeStyle: "short", timeZone: THAI_TIME_ZONE }).format(new Date(value));
const time = (value: string) => new Intl.DateTimeFormat("th-TH", { hour: "2-digit", minute: "2-digit", timeZone: THAI_TIME_ZONE }).format(new Date(value));
const day = (value: string) => new Intl.DateTimeFormat("th-TH", { weekday: "short", day: "numeric", timeZone: THAI_TIME_ZONE }).format(new Date(value));
const statusText: Record<QueueStatus, string> = { waiting: "รอตรวจ", in_progress: "กำลังตรวจ", completed: "ตรวจเสร็จแล้ว", no_show: "ขาดนัดหมาย" };

export function Dashboard() {
  const [role]=useState(()=>getDemoSessionProfile()?.role);
  const isRecordsOfficer=role==="staff",isExecutive=role==="executive";
  const [data, setData] = useState<DashboardData | null>(null), [loading, setLoading] = useState(true), [error, setError] = useState(""), [reload, setReload] = useState(0);
  useEffect(() => { const controller = new AbortController(); fetch("/api/dashboard", { signal: controller.signal, cache: "no-store" }).then(async response => { const result = await response.json(); if (!response.ok) throw new Error(result.error || "โหลดข้อมูลไม่สำเร็จ"); setData(result); }).catch(reason => { if (reason.name !== "AbortError") setError(reason instanceof Error ? reason.message : "โหลดข้อมูลไม่สำเร็จ"); }).finally(() => { if (!controller.signal.aborted) setLoading(false); }); return () => controller.abort(); }, [reload]);
  const maxTrend = Math.max(1, ...(data?.trend.map(item => item.count) ?? []));
  const activeRooms = useMemo(() => data?.rooms.filter(room => room.visits || room.waiting || room.inProgress) ?? [], [data]);
  const allCards = data ? [
    { label: "ผู้รับบริการวันนี้", value: data.summary.visits, note: "มีบันทึกการรักษาแล้ว", tone: "green", icon: "users" as const },
    { label: "ผู้ป่วยใหม่วันนี้", value: data.summary.newPatients, note: "ลงทะเบียนเข้าระบบวันนี้", tone: "blue", icon: "userPlus" as const },
    { label: "นัดหมายวันนี้", value: data.summary.appointments, note: "นัดหมายทุกสถานะ", tone: "amber", icon: "calendar" as const },
    { label: "กำลังรอตรวจ", value: data.summary.waiting, note: "ควรติดตามลำดับคิว", tone: "orange", icon: "clock" as const },
    { label: "ตรวจเสร็จแล้ว", value: data.summary.completed, note: "เสร็จสิ้นการให้บริการ", tone: "teal", icon: "check" as const },
    { label: "ขาดนัดหมาย", value: data.queue.filter(item=>item.status==="no_show").length, note: "ควรติดตามหรือนัดหมายใหม่", tone: "red", icon: "alert" as const },
  ] : [];
  const cards=isRecordsOfficer?allCards.filter(card=>card.icon==="userPlus"||card.icon==="calendar"):allCards;

  return <div className="operations-dashboard">
    <header className="operations-heading"><div><h1>{isExecutive?"แดชบอร์ดผู้บริหารสถานพยาบาล":"แดชบอร์ดสรุปผลการให้บริการ"}</h1><p>{isExecutive?"ข้อมูลสรุปเพื่อการติดตามผลการดำเนินงานแบบอ่านอย่างเดียว":"สถานพยาบาล มหาวิทยาลัยเกษตรศาสตร์ วิทยาเขตกำแพงแสน"}</p></div><div className="dashboard-filter-controls"><span className="dashboard-period">{new Intl.DateTimeFormat(THAI_BUDDHIST_LOCALE, { dateStyle: "medium", timeZone: THAI_TIME_ZONE }).format(new Date())}</span><span className="dashboard-period">ทุกแผนกบริการ (All Units)</span><button type="button" aria-label="อัปเดตข้อมูล" title="อัปเดตข้อมูล" onClick={() => { setLoading(true); setError(""); setReload(value => value + 1); }} disabled={loading}><span aria-hidden="true">↻</span><span className="dashboard-refresh-label">{loading ? "กำลังอัปเดต" : "อัปเดตข้อมูล"}</span></button></div></header>
    {error && <div className="dashboard-error" role="alert"><span>{error}</span><button type="button" onClick={() => { setLoading(true); setError(""); setReload(value => value + 1); }}>ลองใหม่</button></div>}
    {!data && loading ? <DashboardSkeleton /> : data && <>
      <section className="summary-cards" aria-label="สรุปประจำวัน">{cards.map(card => <article className={`summary-card ${card.tone}`} key={card.label}><div><span>{card.label}</span><strong>{number.format(card.value)} <small>คน</small></strong><p>{card.note}</p></div><i aria-hidden="true"><DashboardIcon name={card.icon}/></i></article>)}</section>
      {isExecutive&&<ExecutiveOverview data={data}/>}
      {!isRecordsOfficer&&<ServiceOverview data={data} />}
      <div className="dashboard-primary-grid">
        {!isExecutive&&<section className="dashboard-card queue-card"><CardHeader icon="calendar" title={isRecordsOfficer?"รายการนัดหมายวันนี้":"คิวและนัดหมายวันนี้"} subtitle={`${data.queue.length} รายการจากฐานข้อมูล`} action={<Link href="/search">ค้นหาผู้ป่วย</Link>} />
          {data.queue.length ? <div className="queue-table-wrap"><table><thead><tr><th>เวลา</th><th>ผู้ป่วย</th><th>ห้องตรวจ</th><th>รายการนัด</th><th>สถานะ</th><th/></tr></thead><tbody>{data.queue.map(item => <tr key={item.id}><td className="queue-time">{time(item.time)} น.</td><td><strong>{item.patientName}</strong><small>{item.studentId}</small></td><td>{item.department}</td><td><span>{item.reason}</span><small>{item.clinician || "ยังไม่ระบุแพทย์"}</small></td><td><span className={`queue-status ${item.status}`}>{statusText[item.status]}</span></td><td><Link className="open-patient" href={`/patients/${item.patientId}`} aria-label={`เปิดข้อมูล ${item.patientName}`}>›</Link></td></tr>)}</tbody></table></div> : <EmptyState text="วันนี้ยังไม่มีรายการนัดหมาย" />}
        </section>}
        {!isRecordsOfficer&&<section className="dashboard-card room-card"><CardHeader icon="rooms" title="สถานะห้องตรวจ" subtitle="จำนวนผู้ป่วยแยกตามห้อง" />
          <div className="room-list">{(activeRooms.length ? activeRooms : data.rooms).map(room => <article key={room.name}><div><span className={room.waiting ? "room-live" : "room-idle"}/><strong>{room.name}</strong></div><dl><div><dt>รับบริการ</dt><dd>{room.visits}</dd></div><div><dt>กำลังตรวจ</dt><dd>{room.inProgress}</dd></div><div><dt>รอตรวจ</dt><dd>{room.waiting}</dd></div></dl></article>)}</div>
        </section>}
      </div>
      <div className="dashboard-secondary-grid">
        {!isRecordsOfficer&&<section className="dashboard-card trend-card"><CardHeader icon="chart" title="จำนวนผู้รับบริการย้อนหลัง 7 วัน" subtitle="คำนวณจากวันที่เข้ารับการรักษา" action={<Link href="/reports">ดูรายงาน</Link>} /><div className="trend-chart">{data.trend.map(item => <div className="trend-column" key={item.date}><span className="trend-value">{item.count}</span><div className="trend-track"><i style={{ height: `${Math.max(item.count ? 8 : 2, item.count / maxTrend * 100)}%` }}/></div><small>{day(item.date)}</small></div>)}</div></section>}
        {!isRecordsOfficer&&<section className="dashboard-card finance-card"><CardHeader icon="finance" title="การเงินประจำวัน" subtitle="เฉพาะรายการที่บันทึกวันนี้" action={<Link href="/reports">รายละเอียด</Link>} /><div className="finance-total"><span>ยอดชำระแล้วทั้งหมด</span><strong>฿{money(data.finance.totalSatang)}</strong></div><dl><div><dt>เงินสด</dt><dd>฿{money(data.finance.cashSatang)}</dd></div><div><dt>โอนเงิน</dt><dd>฿{money(data.finance.transferSatang)}</dd></div><div><dt>ใช้สิทธิการรักษา</dt><dd>{number.format(data.finance.coverageCount)} รายการ</dd></div><div className={data.finance.pendingTransfers ? "attention" : ""}><dt>รายการโอนรอยืนยัน</dt><dd>{number.format(data.finance.pendingTransfers)} รายการ</dd></div></dl></section>}
        <section className="dashboard-card action-card"><CardHeader icon="shortcut" title="ทางลัด" subtitle={isExecutive?"เปิดรายงานสำหรับผู้บริหาร":"เปิดงานที่ใช้เป็นประจำ"} /><div className="quick-actions">{!isExecutive&&<><Link href="/registration"><b><DashboardIcon name="userPlus"/></b><span>ลงทะเบียนผู้ป่วยใหม่</span></Link><Link href="/search"><b><DashboardIcon name="search"/></b><span>ค้นหารายชื่อ</span></Link></>}{!isRecordsOfficer&&<Link href="/reports"><b><DashboardIcon name="report"/></b><span>รายงาน</span></Link>}</div></section>
      </div>
      <footer className="dashboard-updated">ข้อมูลจากฐานข้อมูล KU-MED · อัปเดตล่าสุด {dateTime(data.updatedAt)} น.</footer>
    </>}
  </div>;
}

function DashboardIcon({name}:{name:DashboardIconName}) {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {name==="users"?<><circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M17 5a3 3 0 0 1 0 6M17 14a5 5 0 0 1 4 5"/></>:name==="userPlus"?<><circle cx="9" cy="7" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M19 7v6M16 10h6"/></>:name==="calendar"?<><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4M17 3v4M3 11h18M8 15h2M14 15h2"/></>:name==="clock"?<><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>:name==="check"?<><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></>:name==="alert"?<><path d="M12 3 2.8 20h18.4L12 3Z"/><path d="M12 9v5M12 17.5h.01"/></>:name==="rooms"?<><path d="M4 21V5a2 2 0 0 1 2-2h8v18M14 9h6v12M2 21h20"/><path d="M8 7h2M8 11h2M8 15h2M17 13h1"/></>:name==="chart"?<><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></>:name==="finance"?<><rect x="3" y="5" width="18" height="15" rx="2"/><path d="M3 10h18M7 15h4"/></>:name==="search"?<><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/></>:name==="report"?<><path d="M6 3h9l4 4v14H6zM14 3v5h5M9 12h6M9 16h6"/></>:<><path d="M4 12h16M12 4v16"/></>}
  </svg>;
}
function CardHeader({icon,title,subtitle,action}:{icon?:DashboardIconName;title:string;subtitle:string;action?:React.ReactNode}) { return <header className="dashboard-card-heading">{icon&&<i className={`dashboard-heading-icon ${icon}`} aria-hidden="true"><DashboardIcon name={icon}/></i>}<div><h2>{title}</h2><p>{subtitle}</p></div>{action}</header>; }
function EmptyState({ text }: { text: string }) { return <div className="dashboard-empty"><span aria-hidden="true">▦</span><p>{text}</p></div>; }
function DashboardSkeleton() { return <div className="dashboard-loading" role="status"><span>กำลังอ่านข้อมูลจากฐานข้อมูล…</span></div>; }

function ExecutiveOverview({data}:{data:DashboardData}){const revenue=data.finance.totalSatang,previous=data.executive.previous;const comparison=(current:number,old:number)=>old?Math.round((current-old)/old*100):current?100:0;const budget=data.executive.budget,tone=budget.utilizationPercent>=100?"danger":budget.utilizationPercent>=90?"critical":budget.utilizationPercent>=80?"warning":"normal";return <section className="executive-overview" aria-label="ตัวชี้วัดสำหรับผู้บริหาร"><div className="executive-comparison-grid"><ExecutiveMetric label="ผู้รับบริการเทียบเมื่อวาน" value={`${comparison(data.summary.visits,previous.visits)>=0?"+":""}${comparison(data.summary.visits,previous.visits)}%`} detail={`เมื่อวาน ${number.format(previous.visits)} ครั้ง`}/><ExecutiveMetric label="ผู้ป่วยใหม่เทียบเมื่อวาน" value={`${comparison(data.summary.newPatients,previous.newPatients)>=0?"+":""}${comparison(data.summary.newPatients,previous.newPatients)}%`} detail={`เมื่อวาน ${number.format(previous.newPatients)} คน`}/><ExecutiveMetric label="นัดหมายเทียบเมื่อวาน" value={`${comparison(data.summary.appointments,previous.appointments)>=0?"+":""}${comparison(data.summary.appointments,previous.appointments)}%`} detail={`เมื่อวาน ${number.format(previous.appointments)} รายการ`}/><ExecutiveMetric label="รายรับเทียบเมื่อวาน" value={`${comparison(revenue,previous.revenueSatang)>=0?"+":""}${comparison(revenue,previous.revenueSatang)}%`} detail={`เมื่อวาน ฿${money(previous.revenueSatang)}`}/></div><div className="executive-kpi-grid"><article className="dashboard-card executive-quality-card"><CardHeader icon="clock" title="ตัวชี้วัดคุณภาพบริการ" subtitle="คำนวณจากรายการที่เสร็จสิ้นวันนี้"/><dl><div><dt>คัดกรองถึงพบแพทย์เฉลี่ย</dt><dd>{data.executive.quality.averageTriageWaitMinutes??"–"} นาที</dd></div><div><dt>แพทย์สั่งยาถึงจ่ายยาเฉลี่ย</dt><dd>{data.executive.quality.averageDispenseMinutes??"–"} นาที</dd></div><div><dt>อัตราขาดนัด</dt><dd>{data.executive.quality.noShowRate}%</dd></div></dl></article><article className={`dashboard-card executive-budget-card ${tone}`}><CardHeader icon="finance" title={`สถานะงบประมาณ พ.ศ. ${budget.fiscalYear+543}`} subtitle="ยอดอนุมัติและจ่ายเทียบวงเงิน"/><div className="budget-meter"><div><span>ใช้ไป {budget.utilizationPercent}%</span><strong>{tone==="danger"?"เกินวงเงิน":tone==="critical"?"ใกล้เต็มวงเงิน":tone==="warning"?"ควรเฝ้าระวัง":"อยู่ในเกณฑ์"}</strong></div><i><b style={{width:`${Math.min(100,budget.utilizationPercent)}%`}}/></i></div><dl><div><dt>วงเงิน</dt><dd>฿{money(budget.allocatedSatang)}</dd></div><div><dt>ใช้และผูกพัน</dt><dd>฿{money(budget.committedSatang)}</dd></div><div><dt>คงเหลือ</dt><dd>฿{money(budget.remainingSatang)}</dd></div></dl></article></div></section>}
function ExecutiveMetric({label,value,detail}:{label:string;value:string;detail:string}){return <article className="clinical-card executive-metric"><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>}

function ServiceOverview({ data }: { data: DashboardData }) {
  const maxVisits = Math.max(1, ...data.rooms.map(room => room.visits));
  const maxWaiting = Math.max(1, ...data.rooms.map(room => room.waiting));
  const hourlyCounts = Array.from({ length: 12 }, (_, index) => {
    const hour = index + 8;
    const count = data.queue.filter(item => Number(new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hourCycle: "h23", timeZone: THAI_TIME_ZONE }).format(new Date(item.time))) === hour).length;
    return { hour, count, percentage: data.queue.length ? Math.round(count / data.queue.length * 100) : 0 };
  });
  return <div className="dashboard-overview-grid">
    <section className="dashboard-service-chart" aria-labelledby="service-chart-title">
      <header className="service-chart-heading"><div><h2 id="service-chart-title">จำนวนผู้เข้าใช้บริการในแต่ละห้องตรวจ</h2><p>เปรียบเทียบผู้รับบริการและผู้รอตรวจจากข้อมูลวันนี้</p></div><div className="service-chart-legend"><span><i />ผู้รับบริการ<br />(คน)</span><span><i />รอตรวจ<br />(คน)</span></div></header>
      <div className="service-bar-chart"><div className="service-gridlines" aria-hidden="true">{Array.from({ length: 5 }, (_, index) => <span key={index} />)}</div><div className="service-bar-groups">{data.rooms.map(room => <div className="service-bar-group" key={room.name}><div className="service-bar-pair"><span className="service-bar visits" style={{ height: `${room.visits / maxVisits * 100}%` }} tabIndex={0} aria-label={`${room.name}: รับบริการ ${room.visits} คน`}><span className="service-bar-tooltip">{room.visits} คน</span></span><span className="service-bar waiting" style={{ height: `${room.waiting / maxWaiting * 100}%` }} tabIndex={0} aria-label={`${room.name}: รอตรวจ ${room.waiting} คน`}><span className="service-bar-tooltip">{room.waiting} คน</span></span></div><span className="service-bar-label">{room.name}</span></div>)}</div></div>
      <footer className="service-chart-footer"><p><span aria-hidden="true">◷</span> ข้อมูลจำนวนผู้รับบริการและคิวรอตรวจของแต่ละห้อง</p><strong>อัปเดตข้อมูลล่าสุด: {time(data.updatedAt)} น.</strong></footer>
    </section>
    <section className="dashboard-hourly-chart" aria-labelledby="hourly-chart-title"><header><h2 id="hourly-chart-title">ช่วงเวลาที่หนาแน่น</h2><p>สัดส่วนนัดหมายวันนี้แยกตามชั่วโมง</p></header><div className="dashboard-hourly-list">{hourlyCounts.map(item => <div className={`dashboard-hourly-row${item.percentage >= 75 ? " peak" : ""}`} key={item.hour}><span>{String(item.hour).padStart(2, "0")}:00</span><div className="dashboard-hourly-track" role="meter" aria-label={`นัดหมาย ${item.hour}:00 จำนวน ${item.count} รายการ`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={item.percentage}><i style={{ width: `${item.percentage}%` }} /></div><strong>{item.percentage}%</strong></div>)}</div><aside className="dashboard-hourly-note"><strong>ข้อแนะนำ</strong><p>ช่วงเวลา 17.00–19.00 น. ควรเตรียมความพร้อมสำหรับเคสฉุกเฉิน</p></aside></section>
  </div>;
}
