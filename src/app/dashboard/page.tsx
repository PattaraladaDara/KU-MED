import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { Dashboard } from "@/components/dashboard";
import { availableAssets } from "@/lib/design-assets";
import "./dashboard.css";

export const metadata: Metadata = { title: "แดชบอร์ด | KU-MED" };

export default function DashboardPage() {
  return <AppShell assets={availableAssets()}><Dashboard /></AppShell>;
}
