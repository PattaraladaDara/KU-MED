import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { PatientSearch } from "@/components/patient-search";
import { availableAssets } from "@/lib/design-assets";
import "../clinical.css";

export const metadata: Metadata = { title: "ค้นหาผู้ใช้บริการ | KU-MED" };
export default function SearchPage() { return <AppShell assets={availableAssets()}><PatientSearch /></AppShell>; }
