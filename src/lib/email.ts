import "server-only";
import nodemailer from "nodemailer";
import { getSupportContact } from "@/lib/support-contact";

type AccountEmail={email:string;firstName:string;lastName:string;username:string};
type AccessExpiryEmail=AccountEmail&{role:string;expiresAt:Date};

const clean=(value?:string)=>value?.trim()||"";
const escapeHtml=(value:string)=>value.replace(/[&<>"']/g,character=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[character]!));
const sentTime=()=>new Intl.DateTimeFormat("th-TH-u-ca-buddhist",{dateStyle:"medium",timeStyle:"short",timeZone:"Asia/Bangkok"}).format(new Date());

function mailConfig(){
  const host=clean(process.env.SMTP_HOST),user=clean(process.env.SMTP_USER),password=process.env.SMTP_PASSWORD||"";
  const port=Number(process.env.SMTP_PORT||587);
  const from=clean(process.env.EMAIL_FROM)||user;
  if(!host||!user||!password||!from||!Number.isInteger(port))throw new Error("ยังไม่ได้ตั้งค่า SMTP สำหรับส่งอีเมล");
  return{host,port,user,password,from,secure:process.env.SMTP_SECURE==="true"||port===465};
}

async function send(to:string,subject:string,html:string){
  const config=mailConfig();
  const transporter=nodemailer.createTransport({host:config.host,port:config.port,secure:config.secure,auth:{user:config.user,pass:config.password}});
  await transporter.sendMail({from:config.from,to,subject,text:html.replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim(),html});
}

function frame(title:string,content:string){return `<!doctype html><html lang="th"><body style="margin:0;background:#f3f7f5;font-family:Arial,'Noto Sans Thai',sans-serif;color:#173d32"><div style="max-width:600px;margin:32px auto;padding:28px;background:#fff;border:1px solid #dce8e3;border-radius:14px"><div style="font-size:13px;font-weight:700;color:#087158">KU-MED</div><h1 style="margin:8px 0 20px;font-size:22px">${title}</h1>${content}<p style="margin-top:24px;padding-top:16px;border-top:1px solid #e5ece9;color:#71817c;font-size:12px">อีเมลนี้ส่งโดยอัตโนมัติจากระบบ KU-MED กรุณาอย่าตอบกลับอีเมลฉบับนี้</p></div></body></html>`;}

export async function sendVerificationEmail(account:AccountEmail,code:string){
  const timestamp=sentTime();
  await send(account.email,`รหัสยืนยันอีเมล KU-MED • ${timestamp}`,frame("ยืนยันอีเมลสำหรับการลงทะเบียน",`<p>เรียน ${escapeHtml(account.firstName)} ${escapeHtml(account.lastName)}</p><p>รหัสยืนยันอีเมลของคุณคือ</p><div style="margin:20px 0;padding:18px;border-radius:10px;background:#edf8f4;text-align:center;font-size:30px;font-weight:700;letter-spacing:7px;color:#087158">${escapeHtml(code)}</div><p>รหัสนี้ใช้ได้ภายใน <strong>15 นาที</strong> หากคุณไม่ได้ส่งคำขอลงทะเบียน กรุณาเพิกเฉยต่ออีเมลนี้</p><p style="color:#71817c;font-size:12px">ส่งเมื่อ ${escapeHtml(timestamp)}</p>`));
}

const decisionText:Record<string,{subject:string;heading:string;detail:string;label:string;color:string;background:string}>={
  pending_email:{subject:"ได้รับคำขอลงทะเบียน KU-MED แล้ว",heading:"กรุณายืนยันอีเมล",detail:"ระบบได้รับคำขอลงทะเบียนของคุณแล้ว กรุณากรอกรหัส OTP ที่ส่งไปยังอีเมลเพื่อดำเนินการต่อ",label:"รอยืนยันอีเมล",color:"#285f8f",background:"#eaf4ff"},
  pending_review:{subject:"คำขอลงทะเบียน KU-MED อยู่ระหว่างการตรวจสอบ",heading:"ระบบได้รับคำขอของคุณแล้ว",detail:"คุณยืนยันอีเมลสำเร็จและคำขอถูกส่งให้ผู้ดูแลระบบตรวจสอบแล้ว ระบบจะแจ้งผลให้ทราบทางอีเมลนี้เมื่อสถานะมีการเปลี่ยนแปลง",label:"รอการตรวจสอบ",color:"#53657a",background:"#eef2f6"},
  changes_requested:{subject:"คำขอลงทะเบียน KU-MED ถูกส่งกลับเพื่อแก้ไข",heading:"กรุณาแก้ไขคำขอลงทะเบียน",detail:"เข้าสู่หน้าลงทะเบียนด้วยบัญชีเดิม ตรวจสอบเหตุผลด้านล่าง แก้ไขข้อมูลตามที่ระบุ แล้วส่งคำขอให้ผู้ดูแลระบบตรวจสอบอีกครั้ง",label:"รอแก้ไขข้อมูล",color:"#956313",background:"#fff3d8"},
  approved:{subject:"คำขอลงทะเบียน KU-MED ได้รับการอนุมัติ",heading:"บัญชีของคุณพร้อมใช้งาน",detail:"คำขอลงทะเบียนได้รับการอนุมัติแล้ว คุณสามารถเข้าสู่ระบบด้วยชื่อผู้ใช้และรหัสผ่านที่สร้างไว้",label:"อนุมัติและเปิดใช้งาน",color:"#087158",background:"#e4f7ef"},
  rejected:{subject:"ผลการพิจารณาคำขอลงทะเบียน KU-MED",heading:"คำขอลงทะเบียนไม่ได้รับการอนุมัติ",detail:"ผู้ดูแลระบบได้พิจารณาคำขอแล้ว โปรดอ่านเหตุผลด้านล่าง หากต้องการข้อมูลเพิ่มเติมให้ติดต่อสถานพยาบาล",label:"ไม่อนุมัติคำขอ",color:"#a63b32",background:"#fdebea"},
  suspended:{subject:"บัญชี KU-MED ถูกระงับการใช้งาน",heading:"บัญชีถูกระงับการใช้งาน",detail:"บัญชีของคุณถูกระงับชั่วคราว โปรดอ่านเหตุผลด้านล่างและติดต่อผู้ดูแลระบบหากต้องการข้อมูลเพิ่มเติม",label:"ระงับการใช้งาน",color:"#ad6612",background:"#fff0dc"},
  expired:{subject:"สิทธิ์ใช้งานบัญชี KU-MED หมดอายุ",heading:"สิทธิ์ใช้งานบัญชีหมดอายุ",detail:"ช่วงเวลาการใช้งานบัญชีของคุณสิ้นสุดแล้ว หากยังจำเป็นต้องใช้งาน โปรดติดต่อผู้ดูแลระบบเพื่อขอต่ออายุสิทธิ์",label:"สิทธิ์หมดอายุ",color:"#6f4b96",background:"#f2ebfa"},
};

export async function sendAccountDecisionEmail(account:AccountEmail,status:string,note:string){
  const copy=decisionText[status]||{subject:"สถานะบัญชี KU-MED มีการเปลี่ยนแปลง",heading:"แจ้งการเปลี่ยนแปลงสถานะบัญชี",detail:`สถานะคำขอหรือบัญชีของคุณเปลี่ยนเป็น “${escapeHtml(status)}”`,label:"อัปเดตสถานะ",color:"#465b54",background:"#eef3f1"};
  const appUrl=clean(process.env.APP_BASE_URL)||"http://localhost:3000";
  const timestamp=sentTime();
  const reason=note?`<div style="margin:18px 0;padding:14px;border-left:4px solid ${copy.color};background:${copy.background}"><strong>รายละเอียดจากผู้ดูแลระบบ</strong><p style="margin:7px 0 0;white-space:pre-wrap">${escapeHtml(note)}</p></div>`:"";
  const contactNeeded=status==="rejected"||status==="suspended";
  const support=getSupportContact();
  const contact=contactNeeded?`<div style="margin:20px 0;padding:16px;border:1px solid #d9e3df;border-radius:10px;background:#f8faf9"><strong style="display:block;margin-bottom:8px">ติดต่อเจ้าหน้าที่เพื่อสอบถามหรือขอทบทวน</strong><div>${escapeHtml(support.name)}</div><div style="margin-top:5px"><strong>โทร:</strong> ${escapeHtml(support.phone)}</div>${support.email?`<div style="margin-top:5px"><strong>อีเมล:</strong> <a href="mailto:${escapeHtml(support.email)}">${escapeHtml(support.email)}</a></div>`:""}<div style="margin-top:5px;color:#65766f"><strong>เวลาทำการ:</strong> ${escapeHtml(support.hours)}</div><p style="margin:10px 0 0;color:#65766f;font-size:12px">กรุณาแจ้งชื่อผู้ใช้และชื่อ–นามสกุลที่ลงทะเบียน โดยไม่ต้องส่งรหัสผ่านหรือรหัส OTP ให้เจ้าหน้าที่</p></div>`:"";
  const statusBanner=`<div style="margin:0 0 18px;padding:13px 16px;border-radius:10px;background:${copy.background};color:${copy.color};font-size:17px;font-weight:700">สถานะ: ${escapeHtml(copy.label)}</div>`;
  await send(account.email,`${copy.subject} • ${timestamp}`,frame(copy.heading,`${statusBanner}<p>เรียน ${escapeHtml(account.firstName)} ${escapeHtml(account.lastName)}</p><p>${copy.detail}</p>${reason}${contact}<p><strong>ชื่อผู้ใช้:</strong> ${escapeHtml(account.username)}</p><p style="color:#71817c;font-size:12px">อัปเดตเมื่อ ${escapeHtml(timestamp)}</p><p><a href="${escapeHtml(appUrl)}/login" style="display:inline-block;padding:11px 18px;border-radius:8px;background:${copy.color};color:#fff;text-decoration:none">เข้าสู่ระบบ KU-MED</a></p>`));
}

export async function sendAccessExpiryReminderEmail(account:AccessExpiryEmail){
  const timestamp=sentTime();
  const expiresAt=new Intl.DateTimeFormat("th-TH-u-ca-buddhist",{dateStyle:"long",timeStyle:"short",timeZone:"Asia/Bangkok"}).format(account.expiresAt);
  const roles:Record<string,string>={doctor:"แพทย์",staff:"เจ้าหน้าที่เวชระเบียน",nurse:"พยาบาล",pharmacist:"เภสัชกร",finance:"เจ้าหน้าที่การเงิน",executive:"ผู้บริหารสถานพยาบาล",admin:"ผู้ดูแลระบบ"};
  const appUrl=clean(process.env.APP_BASE_URL)||"http://localhost:3000";
  const panel=`<div style="margin:0 0 18px;padding:13px 16px;border-radius:10px;background:#fff3d8;color:#875b0a;font-size:17px;font-weight:700">สิทธิ์ใช้งานกำลังจะหมดอายุในวันพรุ่งนี้</div>`;
  await send(account.email,"แจ้งเตือนสิทธิ์ใช้งาน KU-MED ใกล้หมดอายุ",frame("แจ้งเตือนสิทธิ์ใช้งานใกล้หมดอายุ",`${panel}<p>เรียน ${escapeHtml(account.firstName)} ${escapeHtml(account.lastName)}</p><p>สิทธิ์บทบาท <strong>${escapeHtml(roles[account.role]||account.role)}</strong> ของบัญชีคุณจะสิ้นสุดในวันที่ <strong>${escapeHtml(expiresAt)}</strong></p><p>หากยังจำเป็นต้องใช้ระบบหลังวันดังกล่าว โปรดติดต่อผู้ดูแลระบบเพื่อขอต่ออายุสิทธิ์ก่อนวันที่หมดอายุ</p><p><strong>ชื่อผู้ใช้:</strong> ${escapeHtml(account.username)}</p><p><a href="${escapeHtml(appUrl)}/login" style="display:inline-block;padding:11px 18px;border-radius:8px;background:#956313;color:#fff;text-decoration:none">เข้าสู่ระบบ KU-MED</a></p><p style="color:#71817c;font-size:12px">แจ้งเตือนเมื่อ ${escapeHtml(timestamp)}</p>`));
}
