import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { text } from "@/lib/api-validation";

export const runtime = "nodejs";
const fallbackAdmin = "demo-admin";
const label = (role:string) => ({admin:"ผู้ดูแลระบบหลัก",doctor:"แพทย์",staff:"บุคลากร"}[role]||role);

export async function GET(request:NextRequest) {
  try {
    const userKey=text(request.nextUrl.searchParams.get("userKey"))||fallbackAdmin;const db=getDb();
    const account=userKey===fallbackAdmin?null:await db.staffAccount.findUnique({where:{username:userKey}});const role=account?.role||"admin";
    const stored=await db.userSettings.findUnique({where:{userKey}});
    const settings=stored||{userKey,displayName:account?`${account.firstName} ${account.lastName}`:"ผู้ดูแลระบบหลัก",role:label(role),email:"admin@ku.ac.th",phone:"000-000-0000",notifyAnnouncements:true,notifyMonthlyReports:true,notifySecurity:true};
    const accounts=role==="admin"?await db.staffAccount.findMany({select:{id:true,username:true,firstName:true,lastName:true,role:true,medicalLicense:true,authProvider:true,active:true,updatedAt:true},orderBy:[{active:"desc"},{firstName:"asc"}]}):undefined;
    return NextResponse.json({settings,accounts});
  } catch { return NextResponse.json({ error:"ไม่สามารถโหลดการตั้งค่าได้" },{status:503}); }
}

export async function PUT(request:NextRequest){
  try{const body=await request.json() as Record<string,unknown>;const userKey=text(body.userKey)||fallbackAdmin,displayName=text(body.displayName),email=text(body.email).toLowerCase(),phone=text(body.phone);if(!displayName||!email||!phone)return NextResponse.json({error:"กรุณากรอกชื่อ อีเมล และหมายเลขโทรศัพท์"},{status:400});const account=userKey===fallbackAdmin?null:await getDb().staffAccount.findUnique({where:{username:userKey},select:{role:true}});const role=label(account?.role||"admin");const settings=await getDb().userSettings.upsert({where:{userKey},create:{userKey,displayName,role,email,phone,notifyAnnouncements:body.notifyAnnouncements===true,notifyMonthlyReports:body.notifyMonthlyReports===true,notifySecurity:body.notifySecurity===true},update:{displayName,role,email,phone,notifyAnnouncements:body.notifyAnnouncements===true,notifyMonthlyReports:body.notifyMonthlyReports===true,notifySecurity:body.notifySecurity===true}});return NextResponse.json({settings});}catch{return NextResponse.json({error:"ไม่สามารถบันทึกการตั้งค่าได้"},{status:503});}
}

export async function PATCH(request:NextRequest){
  try{const body=await request.json() as Record<string,unknown>;const actorKey=text(body.actorKey),accountId=text(body.accountId);const actor=actorKey===fallbackAdmin?{role:"admin"}:await getDb().staffAccount.findUnique({where:{username:actorKey},select:{role:true,username:true}});if(actor?.role!=="admin")return NextResponse.json({error:"เฉพาะผู้ดูแลระบบหลักเท่านั้นที่จัดการบัญชีได้"},{status:403});const target=await getDb().staffAccount.findUnique({where:{id:accountId}});if(!target)return NextResponse.json({error:"ไม่พบบัญชีผู้ใช้งาน"},{status:404});if(target.username===actorKey)return NextResponse.json({error:"ไม่สามารถเปลี่ยนบทบาทหรือระงับบัญชีของตนเองได้"},{status:400});const requestedRole=text(body.role),data:{role?:string;active?:boolean}={};if(requestedRole){if(!["admin","doctor","staff"].includes(requestedRole))return NextResponse.json({error:"บทบาทไม่ถูกต้อง"},{status:400});data.role=requestedRole;}if(typeof body.active==="boolean")data.active=body.active;if(!Object.keys(data).length)return NextResponse.json({error:"ไม่มีข้อมูลที่ต้องการแก้ไข"},{status:400});const account=await getDb().staffAccount.update({where:{id:accountId},data,select:{id:true,username:true,firstName:true,lastName:true,role:true,medicalLicense:true,authProvider:true,active:true,updatedAt:true}});await getDb().userSettings.updateMany({where:{userKey:account.username},data:{role:label(account.role)}});return NextResponse.json({account});}catch{return NextResponse.json({error:"ไม่สามารถแก้ไขบัญชีได้"},{status:503});}
}
