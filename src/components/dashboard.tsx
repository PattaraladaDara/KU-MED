"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { THAI_BUDDHIST_LOCALE, THAI_TIME_ZONE } from "@/lib/thai-date";

type QueueStatus = "waiting" | "in_progress" | "completed";
type DashboardData = {
  updatedAt: string;
  summary: { visits: number; newPatients: number; appointments: number; completed: number; waiting: number };
  queue: { id: string; patientId: string; time: string; department: string; clinician: string | null; reason: string; studentId: string; patientName: string; status: QueueStatus }[];
  rooms: { name: string; visits: number; waiting: number; inProgress: number }[];
  trend: { date: string; count: number }[];
  finance: { totalSatang: number; cashSatang: number; transferSatang: number; coverageCount: number; pendingTransfers: number };
};

const number = new Intl.NumberFormat("th-TH");
const money = (satang: number) => (satang / 100).toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dateTime = (value: string) => new Intl.DateTimeFormat(THAI_BUDDHIST_LOCALE, { dateStyle: "long", timeStyle: "short", timeZone: THAI_TIME_ZONE }).format(new Date(value));
const time = (value: string) => new Intl.DateTimeFormat("th-TH", { hour: "2-digit", minute: "2-digit", timeZone: THAI_TIME_ZONE }).format(new Date(value));
const day = (value: string) => new Intl.DateTimeFormat("th-TH", { weekday: "short", day: "numeric", timeZone: THAI_TIME_ZONE }).format(new Date(value));
const statusText: Record<QueueStatus, string> = { waiting: "รอตรวจ", in_progress: "กำลังตรวจ", completed: "ตรวจเสร็จแล้ว" };

export function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null), [loading, setLoading] = useState(true), [error, setError] = useState(""), [reload, setReload] = useState(0);
  useEffect(() => { const controller = new AbortController(); fetch("/api/dashboard", { signal: controller.signal, cache: "no-store" }).then(async response => { const result = await response.json(); if (!response.ok) throw new Error(result.error || "โหลดข้อมูลไม่สำเร็จ"); setData(result); }).catch(reason => { if (reason.name !== "AbortError") setError(reason instanceof Error ? reason.message : "โหลดข้อมูลไม่สำเร็จ"); }).finally(() => { if (!controller.signal.aborted) setLoading(false); }); return () => controller.abort(); }, [reload]);
  const maxTrend = Math.max(1, ...(data?.trend.map(item => item.count) ?? []));
  const activeRooms = useMemo(() => data?.rooms.filter(room => room.visits || room.waiting || room.inProgress) ?? [], [data]);
  const cards = data ? [
    { label: "ผู้รับบริการวันนี้", value: data.summary.visits, note: "จากประวัติการรักษาที่บันทึก", tone: "green", icon: "✚" },
    { label: "ผู้ป่วยใหม่วันนี้", value: data.summary.newPatients, note: "ลงทะเบียนเข้าระบบวันนี้", tone: "blue", icon: "+" },
    { label: "นัดหมายวันนี้", value: data.summary.appointments, note: `กำลังรอตรวจ ${number.format(data.summary.waiting)} คน`, tone: "amber", icon: "□" },
    { label: "ตรวจเสร็จแล้ว", value: data.summary.completed, note: "อ้างอิงนัดหมายและเวชระเบียน", tone: "purple", icon: "✓" },
  ] : [];

  return <div className="operations-dashboard">
    <header className="operations-heading"><div><h1>แดชบอร์ดสรุปผลการให้บริการ</h1><p>สถานพยาบาล มหาวิทยาลัยเกษตรศาสตร์ วิทยาเขตกำแพงแสน</p></div><div className="dashboard-filter-controls"><span className="dashboard-period">{new Intl.DateTimeFormat(THAI_BUDDHIST_LOCALE, { dateStyle: "medium", timeZone: THAI_TIME_ZONE }).format(new Date())}</span><span className="dashboard-period">ทุกแผนกบริการ (All Units)</span><button type="button" aria-label="อัปเดตข้อมูล" title="อัปเดตข้อมูล" onClick={() => { setLoading(true); setError(""); setReload(value => value + 1); }} disabled={loading}><span aria-hidden="true">↻</span><span className="dashboard-refresh-label">{loading ? "กำลังอัปเดต" : "อัปเดตข้อมูล"}</span></button></div></header>
    {error && <div className="dashboard-error" role="alert"><span>{error}</span><button type="button" onClick={() => { setLoading(true); setError(""); setReload(value => value + 1); }}>ลองใหม่</button></div>}
    {!data && loading ? <DashboardSkeleton /> : data && <>
      <section className="summary-cards" aria-label="สรุปประจำวัน">{cards.map(card => <article className={`summary-card ${card.tone}`} key={card.label}><div><span>{card.label}</span><strong>{number.format(card.value)} <small>คน</small></strong><p>{card.note}</p></div><i aria-hidden="true"><SummaryIcon icon={card.icon}/></i></article>)}</section>
      <ServiceOverview data={data} />
      <div className="dashboard-primary-grid">
        <section className="dashboard-card queue-card"><CardHeader title="คิวและนัดหมายวันนี้" subtitle={`${data.queue.length} รายการจากฐานข้อมูล`} action={<Link href="/search">ค้นหาผู้ป่วย</Link>} />
          {data.queue.length ? <div className="queue-table-wrap"><table><thead><tr><th>เวลา</th><th>ผู้ป่วย</th><th>ห้องตรวจ</th><th>รายการนัด</th><th>สถานะ</th><th/></tr></thead><tbody>{data.queue.map(item => <tr key={item.id}><td className="queue-time">{time(item.time)} น.</td><td><strong>{item.patientName}</strong><small>{item.studentId}</small></td><td>{item.department}</td><td><span>{item.reason}</span><small>{item.clinician || "ยังไม่ระบุแพทย์"}</small></td><td><span className={`queue-status ${item.status}`}>{statusText[item.status]}</span></td><td><Link className="open-patient" href={`/patients/${item.patientId}`} aria-label={`เปิดข้อมูล ${item.patientName}`}>›</Link></td></tr>)}</tbody></table></div> : <EmptyState text="วันนี้ยังไม่มีรายการนัดหมาย" />}
        </section>
        <section className="dashboard-card room-card"><CardHeader title="สถานะห้องตรวจ" subtitle="จำนวนผู้ป่วยแยกตามห้อง" />
          <div className="room-list">{(activeRooms.length ? activeRooms : data.rooms).map(room => <article key={room.name}><div><span className={room.waiting ? "room-live" : "room-idle"}/><strong>{room.name}</strong></div><dl><div><dt>รับบริการ</dt><dd>{room.visits}</dd></div><div><dt>กำลังตรวจ</dt><dd>{room.inProgress}</dd></div><div><dt>รอตรวจ</dt><dd>{room.waiting}</dd></div></dl></article>)}</div>
        </section>
      </div>
      <div className="dashboard-secondary-grid">
        <section className="dashboard-card trend-card"><CardHeader title="จำนวนผู้รับบริการย้อนหลัง 7 วัน" subtitle="คำนวณจากวันที่เข้ารับการรักษา" action={<Link href="/reports">ดูรายงาน</Link>} /><div className="trend-chart">{data.trend.map(item => <div className="trend-column" key={item.date}><span className="trend-value">{item.count}</span><div className="trend-track"><i style={{ height: `${Math.max(item.count ? 8 : 2, item.count / maxTrend * 100)}%` }}/></div><small>{day(item.date)}</small></div>)}</div></section>
        <section className="dashboard-card finance-card"><CardHeader title="การเงินประจำวัน" subtitle="เฉพาะรายการที่บันทึกวันนี้" action={<Link href="/reports">รายละเอียด</Link>} /><div className="finance-total"><span>ยอดชำระแล้วทั้งหมด</span><strong>฿{money(data.finance.totalSatang)}</strong></div><dl><div><dt>เงินสด</dt><dd>฿{money(data.finance.cashSatang)}</dd></div><div><dt>โอนเงิน</dt><dd>฿{money(data.finance.transferSatang)}</dd></div><div><dt>ใช้สิทธิการรักษา</dt><dd>{number.format(data.finance.coverageCount)} รายการ</dd></div><div className={data.finance.pendingTransfers ? "attention" : ""}><dt>รายการโอนรอยืนยัน</dt><dd>{number.format(data.finance.pendingTransfers)} รายการ</dd></div></dl></section>
        <section className="dashboard-card action-card"><CardHeader title="ทางลัด" subtitle="เปิดงานที่ใช้เป็นประจำ" /><div className="quick-actions"><Link href="/registration"><b>+</b><span>ลงทะเบียนผู้ป่วยใหม่</span></Link><Link href="/search"><b>⌕</b><span>ค้นหารายชื่อ</span></Link><Link href="/reports"><b>▥</b><span>รายงาน</span></Link></div></section>
      </div>
      <footer className="dashboard-updated">ข้อมูลจากฐานข้อมูล KU-MED · อัปเดตล่าสุด {dateTime(data.updatedAt)} น.</footer>
    </>}
  </div>;
}

function SummaryIcon({ icon }: { icon: string }) {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {icon === "✚" ? <path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z"/> : icon === "+" ? <><circle cx="9" cy="7" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M19 7v6M16 10h6"/></> : icon === "□" ? <><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4M17 3v4M3 11h18M8 15h2M14 15h2"/></> : <><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></>}
  </svg>;
}
function CardHeader({ title, subtitle, action }: { title: string; subtitle: string; action?: React.ReactNode }) { return <header className="dashboard-card-heading"><div><h2>{title}</h2><p>{subtitle}</p></div>{action}</header>; }
function EmptyState({ text }: { text: string }) { return <div className="dashboard-empty"><span aria-hidden="true">▦</span><p>{text}</p></div>; }
function DashboardSkeleton() { return <div className="dashboard-loading" role="status"><span>กำลังอ่านข้อมูลจากฐานข้อมูล…</span></div>; }

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
