"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { DesignImage } from "./design-image";
import type { DesignAssetName } from "@/lib/design-manifest";
import { DemoSessionGate } from "./demo-session-gate";
import { endDemoSession, getDemoSessionProfile, type DemoSessionProfile } from "@/lib/demo-session";
import { MenuIcon } from "./menu-icon";

const navigation = [
  { href: "/dashboard", label: "แดชบอร์ด", icon: "dashboard" },
  { href: "/search", label: "ค้นหา", icon: "search" },
  { href: "/registration", label: "ลงทะเบียนผู้ป่วยใหม่", icon: "registration" },
  { href: "/reports", label: "รายงาน", icon: "reports" },
  { href: "/evaluation", label: "แบบประเมินการทำงาน", icon: "evaluation" },
] as const;

export function AppShell({ children, assets }: { children: React.ReactNode; assets: DesignAssetName[] }) {
  const pathname = usePathname();
  const router = useRouter();
  function logout() {
    endDemoSession();
    router.replace("/login");
  }
  const [collapsed, setCollapsed] = useState(false);
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
  const roleLabel = profile ? ({ doctor: "แพทย์", staff: "บุคลากร", admin: "บุคลากร" }[profile.role] || profile.role) : "ผู้ใช้งาน";
  return <DemoSessionGate><div className={`app-shell${collapsed ? " sidebar-collapsed" : ""}`}>
    <a className="skip-link" href="#main-content">ข้ามไปเนื้อหาหลัก</a>
    <aside className="sidebar" aria-label="เมนูหลัก">
      <div className="profile"><Link href="/dashboard" className="avatar" aria-label="หน้าแดชบอร์ด KU-MED"><DesignImage name="avatar" assets={assets} /></Link>
        <div className="profile-text"><span className="profile-name">{profile?.displayName || "ผู้ใช้งาน KU-MED"}</span><span className="profile-role">{roleLabel}</span></div>
        <button className="menu-toggle" onClick={() => setCollapsed(!collapsed)} aria-label={collapsed ? "ขยายเมนู" : "ย่อเมนู"} aria-expanded={!collapsed} aria-controls="main-navigation">{assets.includes("menu") ? <DesignImage name="menu" assets={assets} /> : <span className="text-control">เมนู</span>}</button>
      </div>
      <div className="sidebar-line"><DesignImage name="sidebarDivider" assets={assets} /></div>
      <nav id="main-navigation">{navigation.map(item => <Link key={item.href} href={item.href} aria-label={item.label} aria-current={pathname === item.href ? "page" : undefined} title={item.label}><span className="nav-icon"><MenuIcon name={item.icon}/></span><span className="nav-label">{item.label}</span></Link>)}</nav>
      <Link className="settings-link" href="/settings" aria-current={pathname === "/settings" ? "page" : undefined}><span className="nav-icon"><MenuIcon name="settings"/></span><span className="nav-label">การตั้งค่า</span></Link>
    </aside>
    <header className="topbar"><Link className="mobile-home" href="/dashboard">KU-MED</Link><div className="topbar-right"><span className="language">ภาษาไทย</span><span className="header-divider"><DesignImage name="headerDivider" assets={assets} /></span><span className="account-role">{roleLabel}</span>
      <div className="account-tools">
        {assets.includes("accountActions") && <div className="account-art" aria-hidden="true"><DesignImage name="accountActions" assets={assets} /></div>}
        <button type="button" onClick={logout} className={assets.includes("accountActions") ? "action-overlay session-action" : "text-control"} aria-label="ออกจากระบบ">{!assets.includes("accountActions") && "ออกจากระบบ"}</button>
      </div></div></header>
    <main id="main-content" className="main-content">{children}</main>
  </div></DemoSessionGate>;
}
