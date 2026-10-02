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
    <header className="operations-heading"><div><h1>แดชบอร์ดการให้บริการ</h1><p>ภาพรวมการดำเนินงานประจำวันที่ {new Intl.DateTimeFormat(THAI_BUDDHIST_LOCALE, { dateStyle: "long", timeZone: THAI_TIME_ZONE }).format(new Date())}</p></div><button type="button" onClick={() => { setLoading(true); setError(""); setReload(value => value + 1); }} disabled={loading}><span aria-hidden="true">↻</span>{loading ? "กำลังอัปเดต" : "อัปเดตข้อมูล"}</button></header>
    {error && <div className="dashboard-error" role="alert"><span>{error}</span><button type="button" onClick={() => { setLoading(true); setError(""); setReload(value => value + 1); }}>ลองใหม่</button></div>}
    {!data && loading ? <DashboardSkeleton /> : data && <>
      <section className="summary-cards" aria-label="สรุปประจำวัน">{cards.map(card => <article className={`summary-card ${card.tone}`} key={card.label}><div><span>{card.label}</span><strong>{number.format(card.value)} <small>คน</small></strong><p>{card.note}</p></div><i aria-hidden="true">{card.icon}</i></article>)}</section>
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

function CardHeader({ title, subtitle, action }: { title: string; subtitle: string; action?: React.ReactNode }) { return <header className="dashboard-card-heading"><div><h2>{title}</h2><p>{subtitle}</p></div>{action}</header>; }
function EmptyState({ text }: { text: string }) { return <div className="dashboard-empty"><span aria-hidden="true">▦</span><p>{text}</p></div>; }
function DashboardSkeleton() { return <div className="dashboard-loading" role="status"><span>กำลังอ่านข้อมูลจากฐานข้อมูล…</span></div>; }
