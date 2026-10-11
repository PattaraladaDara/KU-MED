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

const navigation = [
  { href: "/dashboard", label: "แดชบอร์ด", icon: "dashboard" },
  { href: "/search", label: "ค้นหา", icon: "search" },
  { href: "/registration", label: "ลงทะเบียนผู้ป่วยใหม่", icon: "registration" },
  { href: "/reports", label: "รายงาน", icon: "reports" },
  { href: "/evaluation", label: "แบบประเมินการทำงาน", icon: "evaluation" },
] as const;

function SearchSubmenu() {
  const pathname = usePathname(), params = useSearchParams();
  const [patientPath,setPatientPath] = useState("");
  useEffect(()=>{
    let active=true;
    try {
      if (/^\/patients\/[^/]+$/.test(pathname)) { sessionStorage.setItem("ku-med:selected-patient",pathname); queueMicrotask(()=>{if(active)setPatientPath(pathname);}); }
      else { const saved=sessionStorage.getItem("ku-med:selected-patient") || ""; queueMicrotask(()=>{if(active)setPatientPath(/^\/patients\/[^/]+$/.test(saved)?saved:"");}); }
    } catch { queueMicrotask(()=>{if(active)setPatientPath("");}); }
    return()=>{active=false;};
  },[pathname]);
  if (pathname !== "/search" && !pathname.startsWith("/patients/")) return null;
  const selected = params.get("tab") || (pathname.startsWith("/patients/") ? "general" : "");
  const base = pathname.startsWith("/patients/") ? pathname : patientPath || "/search";
  return <div className="search-submenu" aria-label="เมนูย่อยค้นหา">{[["general","ข้อมูลทั่วไป"],["treatments","ประวัติการรักษา"],["appointments","การนัดหมาย"],["payments","การชำระเงิน"]].map(([tab,label]) => <Link key={tab} href={`${base}?tab=${tab}`} aria-current={selected===tab?"page":undefined} title={label}><span className="submenu-dot" aria-hidden="true"/><span className="submenu-label">{label}</span></Link>)}</div>;
}

export function AppShell({ children, assets }: { children: React.ReactNode; assets: DesignAssetName[] }) {
  const pathname = usePathname();
  const router = useRouter();
  function logout() {
    try { sessionStorage.removeItem("ku-med:selected-patient"); } catch {}
    endDemoSession();
    router.replace("/login");
  }
  const [collapsed, setCollapsed] = useState(false);
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const sidebarIsCollapsed = collapsed && !sidebarHovered;
  const [profile] = useState<DemoSessionProfile | null>(() => getDemoSessionProfile());
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
  const roleLabel = profile ? ({ doctor: "แพทย์", staff: "บุคลากร", admin: "ผู้ดูแลระบบหลัก" }[profile.role] || profile.role) : "ผู้ใช้งาน";
  return <DemoSessionGate><div className={`app-shell${sidebarIsCollapsed ? " sidebar-collapsed" : ""}`}>
    <a className="skip-link" href="#main-content">ข้ามไปเนื้อหาหลัก</a>
    <aside className="sidebar" aria-label="เมนูหลัก" onPointerEnter={event => { if (event.pointerType === "mouse" && window.matchMedia("(min-width: 641px) and (hover: hover)").matches) setSidebarHovered(true); }} onPointerLeave={() => setSidebarHovered(false)}>
      <div className="profile"><Link href="/dashboard" className="avatar" aria-label="หน้าแดชบอร์ด KU-MED">{validProfilePhoto(profile?.avatarUrl) ? <img src={profile.avatarUrl} alt="รูปโปรไฟล์"/> : <DesignImage name="avatar" assets={assets} />}</Link>
        <div className="profile-text"><span className="profile-name">{profile?.displayName || "ผู้ใช้งาน KU-MED"}</span><span className="profile-role">{roleLabel}</span></div>
        <button className="menu-toggle" onClick={() => setCollapsed(!collapsed)} aria-label={collapsed ? "ขยายเมนูค้างไว้" : "ย่อเมนู"} aria-expanded={!sidebarIsCollapsed} aria-controls="main-navigation">{assets.includes("menu") ? <DesignImage name="menu" assets={assets} /> : <span className="text-control">เมนู</span>}</button>
      </div>
      <div className="sidebar-line"><DesignImage name="sidebarDivider" assets={assets} /></div>
      <nav id="main-navigation">{navigation.map(item => <div className="navigation-group" key={item.href}><Link href={item.href} aria-label={item.label} aria-current={pathname === item.href || item.href==="/search" && pathname.startsWith("/patients/") ? "page" : undefined} title={item.label}><span className="nav-icon"><MenuIcon name={item.icon}/></span><span className="nav-label">{item.label}</span></Link>{item.href==="/search" && <Suspense fallback={null}><SearchSubmenu/></Suspense>}</div>)}</nav>
      <Link className="settings-link" href="/settings" aria-current={pathname === "/settings" ? "page" : undefined}><span className="nav-icon"><MenuIcon name="settings"/></span><span className="nav-label">การตั้งค่า</span></Link>
    </aside>
    <header className="topbar"><Link className="mobile-home" href="/dashboard">KU-MED</Link><div className="topbar-right"><span className="language">ภาษาไทย</span><span className="header-divider" aria-hidden="true"/><span className="account-role">{roleLabel}</span>
      <div className="account-tools">
        <span className="topbar-notification-icon" aria-hidden="true"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4M12 2V1"/></svg></span>
        <button type="button" onClick={logout} className="topbar-logout" aria-label="ออกจากระบบ" title="ออกจากระบบ"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10 4H4v16h6M9 12h12M17 8l4 4-4 4"/></svg></button>
      </div></div></header>
    <main id="main-content" className="main-content">{children}</main>
  </div></DemoSessionGate>;
}
