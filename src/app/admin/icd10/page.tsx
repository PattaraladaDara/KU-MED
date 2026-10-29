import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { Icd10CatalogManager } from "@/components/icd10-catalog-manager";
import { availableAssets } from "@/lib/design-assets";
import "../../clinical.css";

export const metadata:Metadata={title:"บัญชีรหัส ICD-10 | KU-MED"};
export default function AdminIcd10Page(){return <AppShell assets={availableAssets()}><Icd10CatalogManager/></AppShell>}
