import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { PatientProfile } from "@/components/patient-profile";
import { availableAssets } from "@/lib/design-assets";
import "../../clinical.css";

export const metadata:Metadata={title:"ข้อมูลผู้ใช้บริการ | KU-MED"};
export default async function PatientPage({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{tab?:string;treatmentId?:string;newTreatment?:string;triageId?:string}>}){const[{id},{tab,treatmentId,newTreatment,triageId}]=await Promise.all([params,searchParams]);return <AppShell assets={availableAssets()}><PatientProfile patientId={id} initialTab={tab} focusTreatmentId={treatmentId} initialOpenTreatmentForm={newTreatment==="1"} initialTriageId={triageId}/></AppShell>;}
