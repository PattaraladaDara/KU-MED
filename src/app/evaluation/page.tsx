import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { EvaluationForm } from "@/components/evaluation-form";
import { availableAssets } from "@/lib/design-assets";
import "../clinical.css";

export const metadata: Metadata = { title: "แบบประเมินการทำงาน | KU-MED" };
export default function EvaluationPage() { return <AppShell assets={availableAssets()}><EvaluationForm /></AppShell>; }
