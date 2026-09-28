import { notFound, redirect } from "next/navigation";
import { getDb } from "@/lib/db";

export const dynamic="force-dynamic";

export default async function ScanPatientPage({params}:{params:Promise<{studentId:string}>}){
  const {studentId}=await params;
  const patient=await getDb().patient.findUnique({where:{studentId},select:{id:true}});
  if(!patient)notFound();
  redirect(`/patients/${patient.id}`);
}
