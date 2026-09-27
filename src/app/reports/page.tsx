import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { ReportsPanel } from "@/components/reports-panel";
import { availableAssets } from "@/lib/design-assets";
import "../clinical.css";

export const metadata: Metadata = { title: "รายงาน | KU-MED" };
export default function ReportsPage() { return <AppShell assets={availableAssets()}><ReportsPanel /></AppShell>; }
