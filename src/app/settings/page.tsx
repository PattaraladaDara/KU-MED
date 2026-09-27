import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { SettingsForm } from "@/components/settings-form";
import { availableAssets } from "@/lib/design-assets";
import "../clinical.css";

export const metadata: Metadata = { title: "การตั้งค่า | KU-MED" };
export default function SettingsPage() { return <AppShell assets={availableAssets()}><SettingsForm /></AppShell>; }
