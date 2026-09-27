import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { PatientProfile } from "@/components/patient-profile";
import { availableAssets } from "@/lib/design-assets";
import "../../clinical.css";

export const metadata:Metadata={title:"ข้อมูลผู้ใช้บริการ | KU-MED"};
export default async function PatientPage({params}:{params:Promise<{id:string}>}){const{id}=await params;return <AppShell assets={availableAssets()}><PatientProfile patientId={id}/></AppShell>;}
