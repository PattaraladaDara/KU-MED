import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { RegistrationForm } from "@/components/registration-form";
import { availableAssets } from "@/lib/design-assets";
import "../clinical.css";

export const metadata: Metadata = { title: "ลงทะเบียนผู้ใช้บริการใหม่ | KU-MED" };
export default function RegistrationPage() { return <AppShell assets={availableAssets()}><RegistrationForm /></AppShell>; }
