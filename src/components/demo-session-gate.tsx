"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { beginDemoSession, endDemoSession, hasDemoSession, serverSessionSnapshot, subscribeDemoSession, type DemoSessionProfile } from "@/lib/demo-session";

export function DemoSessionGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const signedIn = useSyncExternalStore(subscribeDemoSession, hasDemoSession, serverSessionSnapshot);
  const checked = useRef(false);
  useEffect(() => {
    if (checked.current) return;
    checked.current = true;
    let active = true;
    fetch("/api/auth/session", { cache: "no-store" })
      .then(async response => response.ok ? response.json() as Promise<{ account: DemoSessionProfile }> : null)
      .then(result => { if (active && result?.account) beginDemoSession(result.account); else if (active) { endDemoSession(); router.replace("/login"); } })
      .catch(() => { if (active) router.replace("/login"); });
    return () => { active = false; };
  }, [router]);
  if (!signedIn) return <main className="session-loading" role="status">กำลังเปิดหน้าเข้าสู่ระบบ…</main>;
  return children;
}
