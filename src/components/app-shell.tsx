"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { DesignImage } from "./design-image";
import type { DesignAssetName } from "@/lib/design-manifest";
import { DemoSessionGate } from "./demo-session-gate";
import { endDemoSession } from "@/lib/demo-session";

const navigation = [
  { href: "/dashboard", label: "แดชบอร์ด", icon: "dashboard" },
  { href: "/search", label: "ค้นหา", icon: "search" },
  { href: "/registration", label: "ลงทะเบียนผู้ใชบริการใหม่", icon: "registration" },
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
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function dismiss(event: MouseEvent) { if (!notificationRef.current?.contains(event.target as Node)) setNotificationsOpen(false); }
    function escape(event: KeyboardEvent) { if (event.key === "Escape") setNotificationsOpen(false); }
    document.addEventListener("click", dismiss); document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("click", dismiss); document.removeEventListener("keydown", escape); };
  }, []);
  const hasNavigationIcons = navigation.every(item => assets.includes(item.icon));
  return <DemoSessionGate><div className={`app-shell${collapsed ? " sidebar-collapsed" : ""}${hasNavigationIcons ? "" : " missing-navigation-icons"}`}>
    <a className="skip-link" href="#main-content">ข้ามไปเนื้อหาหลัก</a>
    <aside className="sidebar" aria-label="เมนูหลัก">
      <div className="profile"><Link href="/" className="avatar" aria-label="หน้าแรก KU-MED"><DesignImage name="avatar" assets={assets} /></Link>
        <div className="profile-text"><span className="profile-name">สุพิตตา&nbsp; ชัยงาม</span><span className="profile-role">ผู้ดูแลระบบ</span></div>
        <button className="menu-toggle" onClick={() => setCollapsed(!collapsed)} aria-label={collapsed ? "ขยายเมนู" : "ย่อเมนู"} aria-expanded={!collapsed} aria-controls="main-navigation">{assets.includes("menu") ? <DesignImage name="menu" assets={assets} /> : <span className="text-control">เมนู</span>}</button>
      </div>
      <div className="sidebar-line"><DesignImage name="sidebarDivider" assets={assets} /></div>
      <nav id="main-navigation">{navigation.map(item => <Link key={item.href} href={item.href} aria-label={item.label} aria-current={pathname === item.href ? "page" : undefined} title={item.label}><span className="nav-icon"><DesignImage name={item.icon} assets={assets} /></span><span className="nav-label">{item.label}</span></Link>)}</nav>
      <Link className="settings-link" href="/settings" aria-current={pathname === "/settings" ? "page" : undefined}><span aria-hidden="true">⚙</span><span className="nav-label">การตั้งค่า</span></Link>
    </aside>
    <header className="topbar"><Link className="mobile-home" href="/">KU-MED</Link><div className="topbar-right"><span className="language">ภาษาไทย</span><span className="header-divider"><DesignImage name="headerDivider" assets={assets} /></span><span className="account-role">ผู้ดูแลระบบ</span>
      <div className="account-tools" ref={notificationRef}>
        {assets.includes("accountActions") && <div className="account-art" aria-hidden="true"><DesignImage name="accountActions" assets={assets} /></div>}
        <button className={assets.includes("accountActions") ? "action-overlay notice-action" : "text-control"} aria-label="การแจ้งเตือน" aria-expanded={notificationsOpen} aria-controls="notifications" onClick={() => setNotificationsOpen(!notificationsOpen)}>{!assets.includes("accountActions") && "ข่าวสาร"}</button>
        <button type="button" onClick={logout} className={assets.includes("accountActions") ? "action-overlay session-action" : "text-control"} aria-label="ออกจากระบบ">{!assets.includes("accountActions") && "ออกจากระบบ"}</button>
        {notificationsOpen && <div id="notifications" className="notifications"><h2>ข้อมูลข่าวสาร</h2><Link href="/#news" onClick={() => setNotificationsOpen(false)}>ประกาศปิดให้บริการ วันที่ 25 กันยายน 2569</Link><Link href="/#news" onClick={() => setNotificationsOpen(false)}>ประกาศปิดให้บริการ วันที่ 28 สิงหาคม 2569</Link></div>}
      </div></div></header>
    <main id="main-content" className="main-content">{children}</main>
  </div></DemoSessionGate>;
}
