import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { AccountAdmin } from "@/components/account-admin";
import { availableAssets } from "@/lib/design-assets";
import "../../clinical.css";

export const metadata:Metadata={title:"จัดการคำขอบัญชี | KU-MED"};
export default function AdminAccountsPage(){return <AppShell assets={availableAssets()}><AccountAdmin/></AppShell>}
