"use client";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { DesignImage } from "./design-image";
import type { DesignAssetName } from "@/lib/design-manifest";
import { DemoSessionGate } from "./demo-session-gate";
import { endDemoSession, getDemoSessionProfile, type DemoSessionProfile } from "@/lib/demo-session";
import { MenuIcon } from "./menu-icon";
import { validProfilePhoto } from "@/lib/profile-photo";
import { can, canOpenPath } from "@/lib/access-control";

const navigation = [
  { href: "/dashboard", label: "แดชบอร์ด", icon: "dashboard" },
  { href: "/search", label: "ค้นหา", icon: "search" },
  { href: "/registration", label: "ลงทะเบียนผู้ป่วยใหม่", icon: "registration" },
  { href: "/reports", label: "รายงาน", icon: "reports" },
  { href: "/evaluation", label: "การประเมิน", icon: "evaluation" },
] as const;

type NotificationItem={id:string;title:string;detail:string;time:string;href:string;tone:"info"|"warning"|"success"};
type DashboardNotificationData={updatedAt:string;summary:{visits:number;newPatients:number;appointments:number;completed:number;waiting:number};queue:{id:string;status:string}[];finance:{totalSatang:number;pendingTransfers:number};pendingTriages:{id:string;patientId:string;assessedAt:string;patientName:string;chiefComplaint:string}[];pendingMedications:{id:string;patientId:string;orderedAt:string;patientName:string;status:string}[];pendingPayments:{id:string;patientId:string;createdAt:string;patientName:string;description:string;status:string}[]};

function roleNotifications(role:string,data:DashboardNotificationData):NotificationItem[]{const updated=new Intl.DateTimeFormat("th-TH",{hour:"2-digit",minute:"2-digit",timeZone:"Asia/Bangkok"}).format(new Date(data.updatedAt));const items:NotificationItem[]=[];if(role==="doctor"){for(const triage of data.pendingTriages||[])items.push({id:`doctor-triage-${triage.id}`,title:`มีข้อมูลคัดกรองใหม่: ${triage.patientName}`,detail:triage.chiefComplaint,time:`คัดกรอง ${new Intl.DateTimeFormat("th-TH",{dateStyle:"short",timeStyle:"short",timeZone:"Asia/Bangkok"}).format(new Date(triage.assessedAt))} น.`,href:`/patients/${triage.patientId}?tab=treatments&newTreatment=1&triageId=${triage.id}`,tone:"success"});if(data.summary.waiting>0)items.push({id:`doctor-waiting-${data.summary.waiting}`,title:"มีผู้ป่วยรอตรวจ",detail:`มีผู้ป่วยรอตรวจวันนี้ ${data.summary.waiting} รายการ กรุณาตรวจสอบรายการรับบริการ`,time:`อัปเดต ${updated} น.`,href:"/dashboard",tone:"warning"});if(data.summary.appointments>0)items.push({id:`doctor-appointments-${data.summary.appointments}`,title:"ตารางนัดหมายวันนี้",detail:`วันนี้มีนัดหมายทั้งหมด ${data.summary.appointments} รายการ`,time:`อัปเดต ${updated} น.`,href:"/dashboard",tone:"info"});}else if(role==="pharmacist"){for(const medication of data.pendingMedications||[])items.push({id:`pharmacist-medication-${medication.id}-${medication.status}`,title:`มีใบสั่งยารอดำเนินการ: ${medication.patientName}`,detail:"เปิดรายการเพื่อตรวจสอบและบันทึกสถานะการจัดยา",time:`สั่งยา ${new Intl.DateTimeFormat("th-TH",{dateStyle:"short",timeStyle:"short",timeZone:"Asia/Bangkok"}).format(new Date(medication.orderedAt))} น.`,href:`/patients/${medication.patientId}?tab=medications`,tone:"warning"});}else if(role==="finance"){for(const payment of data.pendingPayments||[])items.push({id:`finance-payment-${payment.id}-${payment.status}`,title:`รายการโอนเงิน: ${payment.patientName}`,detail:payment.status==="review"?`มีสลิปรอตรวจสอบ · ${payment.description}`:payment.status==="rejected"?`รอผู้ป่วยแนบหลักฐานใหม่ · ${payment.description}`:`รอหลักฐานการโอน · ${payment.description}`,time:`สร้างรายการ ${new Intl.DateTimeFormat("th-TH",{dateStyle:"short",timeStyle:"short",timeZone:"Asia/Bangkok"}).format(new Date(payment.createdAt))} น.`,href:`/patients/${payment.patientId}?tab=payments`,tone:payment.status==="review"?"warning":"info"});}else if(role==="executive"){items.push({id:`executive-summary-${data.summary.visits}-${data.summary.appointments}-${data.finance.totalSatang}`,title:"สรุปผลการดำเนินงานล่าสุด",detail:`วันนี้ให้บริการ ${data.summary.visits} ครั้ง นัดหมาย ${data.summary.appointments} รายการ และรับชำระแล้ว ${new Intl.NumberFormat("th-TH",{style:"currency",currency:"THB"}).format(data.finance.totalSatang/100)}`,time:`อัปเดต ${updated} น.`,href:"/reports",tone:"info"});}else if(role==="admin"){if(data.finance.pendingTransfers>0)items.push({id:`admin-transfers-${data.finance.pendingTransfers}`,title:"การโอนเงินรอยืนยัน",detail:`มีรายการโอนเงินรอตรวจสอบหลักฐาน ${data.finance.pendingTransfers} รายการ`,time:`อัปเดต ${updated} น.`,href:"/dashboard",tone:"warning"});items.push({id:`admin-daily-${data.summary.visits}-${data.summary.appointments}`,title:"สรุปการให้บริการวันนี้",detail:`เข้ารับบริการ ${data.summary.visits} ครั้ง และมีนัดหมาย ${data.summary.appointments} รายการ`,time:`อัปเดต ${updated} น.`,href:"/reports",tone:"info"});}else{if(data.summary.newPatients>0)items.push({id:`staff-new-patients-${data.summary.newPatients}`,title:"มีผู้ป่วยลงทะเบียนใหม่",detail:`วันนี้มีผู้ป่วยลงทะเบียนใหม่ ${data.summary.newPatients} คน`,time:`อัปเดต ${updated} น.`,href:"/search",tone:"success"});if(data.summary.appointments>0)items.push({id:`staff-appointments-${data.summary.appointments}`,title:"รายการนัดหมายวันนี้",detail:`วันนี้มีผู้ป่วยนัดหมาย ${data.summary.appointments} รายการ สำหรับตรวจสอบข้อมูลเวชระเบียน`,time:`อัปเดต ${updated} น.`,href:"/search",tone:"info"});}return items;}

function SearchSubmenu() {
  const pathname = usePathname(), params = useSearchParams();
  const role=getDemoSessionProfile()?.role;
  const patientId = pathname.match(/^\/patients\/([^/]+)$/)?.[1] || "";
  const [patient,setPatient] = useState<{title:string;firstName:string;lastName:string;studentId:string}|null>(null);
  useEffect(()=>{
    if(!patientId)return;
    let active=true;
    fetch(`/api/patients/${encodeURIComponent(patientId)}`).then(async response=>{if(!response.ok)throw new Error();return response.json();}).then(result=>{if(active)setPatient(result.patient);}).catch(()=>{});
    return()=>{active=false;};
  },[patientId]);
  if (!patientId) return null;
  const selected = params.get("tab") || "general";
  const maskedStudentId=patient?.studentId?`${patient.studentId.slice(0,2)}${"•".repeat(Math.max(1,patient.studentId.length-6))}${patient.studentId.slice(-4)}`:"กำลังโหลดข้อมูล";
  const patientSections=[["general","ข้อมูลทั่วไป",true],["intake","คัดกรอง",can(role,"intake:view")],["treatments","ประวัติการรักษา",can(role,"clinical:view")],["appointments","การนัดหมาย",can(role,"appointments:view")],["medications","รายการยา",can(role,"medications:view")&&role!=="executive"],["payments","การชำระเงิน",can(role,"payments:view")],["documents","เอกสาร",can(role,"documents:print")||can(role,"certificates:issue")]] as const;
  return <div className="search-submenu" aria-label="หมวดข้อมูลผู้ป่วย"><div className="search-submenu-patient"><small>กำลังดูผู้ป่วย</small><strong>{patient?`${patient.title}${patient.firstName} ${patient.lastName.charAt(0)}.`:"กำลังโหลด..."}</strong><span>{maskedStudentId}</span></div>{patientSections.filter(([, ,visible])=>visible).map(([tab,label]) => <Link key={tab} href={`${pathname}?tab=${tab}`} aria-current={selected===tab?"page":undefined} title={`เปิด${label}ของผู้ป่วยคนปัจจุบัน`}><span className="submenu-dot" aria-hidden="true"/><span className="submenu-label">{label}</span></Link>)}</div>;
}

function EvaluationSubmenu(){const pathname=usePathname();const items=[["/evaluation/system","ประเมินระบบ"],["/evaluation/service","ผลประเมินการให้บริการ"]] as const;return <div className="search-submenu evaluation-submenu" aria-label="เมนูการประเมิน">{items.map(([href,label])=><Link key={href} href={href} aria-current={pathname===href?"page":undefined}><span className="submenu-dot" aria-hidden="true"/><span className="submenu-label">{label}</span></Link>)}</div>}

export function AppShell({ children, assets }: { children: React.ReactNode; assets: DesignAssetName[] }) {
  const pathname = usePathname();
  const router = useRouter();
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    endDemoSession();
    router.replace("/login");
  }
  const [collapsed, setCollapsed] = useState(false);
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const sidebarIsCollapsed = collapsed && !sidebarHovered;
  const [profile] = useState<DemoSessionProfile | null>(() => getDemoSessionProfile());
  const [notifications,setNotifications]=useState<NotificationItem[]>([]);
  const [readNotifications,setReadNotifications]=useState<string[]>(()=>{if(typeof window==="undefined")return[];try{return JSON.parse(localStorage.getItem(`ku-med-read-notifications-${getDemoSessionProfile()?.role||"staff"}`)||"[]");}catch{return[];}});
  const [notificationsOpen,setNotificationsOpen]=useState(false);
  const notificationRef=useRef<HTMLDivElement|null>(null);
  const scanBuffer = useRef("");
  const scanTimer = useRef<ReturnType<typeof setTimeout>|null>(null);
  useEffect(() => {
    function receiveScan(event: KeyboardEvent) {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement) return;
      if (event.key === "Enter") {
        const match = scanBuffer.current.match(/^KUMED-(.+)$/);
        scanBuffer.current = "";
        if (match) { event.preventDefault(); router.push(`/scan/${encodeURIComponent(match[1])}`); }
        return;
      }
      if (event.key.length !== 1) return;
      scanBuffer.current += event.key.toUpperCase();
      if (scanTimer.current) clearTimeout(scanTimer.current);
      scanTimer.current = setTimeout(() => { scanBuffer.current = ""; }, 120);
    }
    document.addEventListener("keydown", receiveScan);
    return () => { document.removeEventListener("keydown", receiveScan); if (scanTimer.current) clearTimeout(scanTimer.current); };
  }, [router]);
  useEffect(()=>{const role=profile?.role||"staff";let active=true;const loadNotifications=()=>fetch("/api/dashboard",{cache:"no-store"}).then(async response=>{if(!response.ok)throw new Error();return response.json();}).then((result:DashboardNotificationData)=>{if(active)setNotifications(roleNotifications(role,result));}).catch(()=>{if(active)setNotifications([]);});void loadNotifications();const refresh=()=>void loadNotifications();window.addEventListener("ku-med:notifications-refresh",refresh);const timer=window.setInterval(refresh,30000);return()=>{active=false;window.clearInterval(timer);window.removeEventListener("ku-med:notifications-refresh",refresh);};},[profile?.role]);
  useEffect(()=>{if(!notificationsOpen)return;function close(event:MouseEvent){if(notificationRef.current&&!notificationRef.current.contains(event.target as Node))setNotificationsOpen(false);}function escape(event:KeyboardEvent){if(event.key==="Escape")setNotificationsOpen(false);}document.addEventListener("mousedown",close);document.addEventListener("keydown",escape);return()=>{document.removeEventListener("mousedown",close);document.removeEventListener("keydown",escape);};},[notificationsOpen]);
  function saveRead(ids:string[]){const role=profile?.role||"staff";setReadNotifications(ids);localStorage.setItem(`ku-med-read-notifications-${role}`,JSON.stringify(ids));}
  function openNotification(item:NotificationItem){if(!readNotifications.includes(item.id))saveRead([...readNotifications,item.id]);setNotificationsOpen(false);router.push(item.href);}
  const roleLabel = profile ? ({ doctor: "แพทย์", staff: "เจ้าหน้าที่เวชระเบียน", nurse: "พยาบาล", pharmacist: "เภสัชกร", finance: "เจ้าหน้าที่การเงิน", executive: "ผู้บริหารสถานพยาบาล", admin: "ผู้ดูแลระบบหลัก" }[profile.role] || profile.role) : "ผู้ใช้งาน";
  const unreadCount=notifications.filter(item=>!readNotifications.includes(item.id)).length;
  const visibleNavigation=navigation.filter(item=>canOpenPath(profile?.role,item.href));
  const allowedPath=canOpenPath(profile?.role,pathname);
  return <DemoSessionGate><div className={`app-shell${sidebarIsCollapsed ? " sidebar-collapsed" : ""}`}>
    <a className="skip-link" href="#main-content">ข้ามไปเนื้อหาหลัก</a>
    <aside className="sidebar" aria-label="เมนูหลัก" onPointerEnter={event => { if (event.pointerType === "mouse" && window.matchMedia("(min-width: 641px) and (hover: hover)").matches) setSidebarHovered(true); }} onPointerLeave={() => setSidebarHovered(false)}>
      <div className="profile"><Link href="/dashboard" className="avatar" aria-label="หน้าแดชบอร์ด KU-MED">{validProfilePhoto(profile?.avatarUrl) ? <img src={profile.avatarUrl} alt="รูปโปรไฟล์"/> : <DesignImage name="avatar" assets={assets} />}</Link>
        <div className="profile-text"><span className="profile-name">{profile?.displayName || "ผู้ใช้งาน KU-MED"}</span><span className="profile-role">{roleLabel}</span></div>
        <button type="button" className="menu-toggle" onClick={() => setCollapsed(!collapsed)} aria-label={collapsed ? "ขยายเมนูค้างไว้" : "ย่อเมนู"} aria-expanded={!sidebarIsCollapsed} aria-controls="main-navigation">{assets.includes("menu") ? <DesignImage name="menu" assets={assets} /> : <span className="text-control">เมนู</span>}</button>
      </div>
      <div className="sidebar-line"><DesignImage name="sidebarDivider" assets={assets} /></div>
      <nav id="main-navigation">{visibleNavigation.map(item => <div className="navigation-group" key={item.href}><Link href={item.href==="/evaluation"?"/evaluation/system":item.href} aria-label={item.label} aria-current={pathname === item.href || item.href==="/search" && pathname.startsWith("/patients/") || item.href==="/evaluation"&&pathname.startsWith("/evaluation/") ? "page" : undefined} title={item.label}><span className="nav-icon"><MenuIcon name={item.icon}/></span><span className="nav-label">{item.label}</span></Link>{item.href==="/search"&&<Suspense fallback={null}><SearchSubmenu/></Suspense>}{item.href==="/evaluation"&&pathname.startsWith("/evaluation/")&&<div id="evaluation-submenu"><EvaluationSubmenu/></div>}</div>)}{profile?.role==="admin"&&<><div className="navigation-group"><Link href="/admin/accounts" aria-label="จัดการคำขอบัญชี" aria-current={pathname.startsWith("/admin/accounts")?"page":undefined} title="จัดการคำขอบัญชี"><span className="nav-icon"><MenuIcon name="accounts"/></span><span className="nav-label">จัดการคำขอบัญชี</span></Link></div></>}</nav>
      <Link className="settings-link" href="/settings" aria-current={pathname === "/settings" ? "page" : undefined}><span className="nav-icon"><MenuIcon name="settings"/></span><span className="nav-label">การตั้งค่า</span></Link>
    </aside>
    <header className="topbar"><Link className="mobile-home" href="/dashboard">KU-MED</Link><div className="topbar-right"><span className="account-role">{roleLabel}</span>
      <div className="account-tools" ref={notificationRef}>
        <button type="button" className="topbar-notification-button" aria-label={unreadCount?`การแจ้งเตือนใหม่ ${unreadCount} รายการ`:"การแจ้งเตือน"} aria-expanded={notificationsOpen} aria-haspopup="dialog" onClick={()=>setNotificationsOpen(value=>!value)}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4M12 2V1"/></svg>{unreadCount>0&&<span className="notification-count">{unreadCount>9?"9+":unreadCount}</span>}</button>
        {notificationsOpen&&<section className="notification-popover" role="dialog" aria-label="รายการแจ้งเตือน"><header><div><strong>การแจ้งเตือน</strong><span>{roleLabel}</span></div>{unreadCount>0&&<button type="button" onClick={()=>saveRead([...new Set([...readNotifications,...notifications.map(item=>item.id)])])}>ทำเครื่องหมายว่าอ่านแล้ว</button>}</header><div className="notification-list">{notifications.length?notifications.map(item=><button type="button" key={item.id} className={readNotifications.includes(item.id)?"notification-item read":"notification-item"} onClick={()=>openNotification(item)}><i className={`notification-tone ${item.tone}`} aria-hidden="true"/><span><strong>{item.title}</strong><p>{item.detail}</p><small>{item.time}</small></span>{!readNotifications.includes(item.id)&&<b aria-label="ยังไม่ได้อ่าน"/>}</button>):<div className="notification-empty"><span>✓</span><strong>ไม่มีการแจ้งเตือนใหม่</strong><p>ระบบจะแสดงรายการที่เกี่ยวข้องกับหน้าที่ของคุณที่นี่</p></div>}</div></section>}
        <button type="button" onClick={logout} className="topbar-logout" aria-label="ออกจากระบบ" title="ออกจากระบบ"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10 4H4v16h6M9 12h12M17 8l4 4-4 4"/></svg></button>
      </div></div></header>
    <main id="main-content" className="main-content">{allowedPath?children:<section className="access-denied"><span>!</span><h1>ไม่มีสิทธิ์เข้าถึงหน้านี้</h1><p>บัญชี {roleLabel} ไม่ได้รับสิทธิ์สำหรับส่วนงานนี้</p><Link href="/dashboard">กลับไปหน้าแดชบอร์ด</Link></section>}</main>
  </div></DemoSessionGate>;
}
