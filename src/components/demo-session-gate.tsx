"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { hasDemoSession, serverSessionSnapshot, subscribeDemoSession } from "@/lib/demo-session";

export function DemoSessionGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const signedIn = useSyncExternalStore(subscribeDemoSession, hasDemoSession, serverSessionSnapshot);
  useEffect(() => {
    if (!hasDemoSession()) router.replace("/login");
  }, [router, signedIn]);
  if (!signedIn) return <main className="session-loading" role="status">กำลังเปิดหน้าเข้าสู่ระบบ…</main>;
  return children;
}
