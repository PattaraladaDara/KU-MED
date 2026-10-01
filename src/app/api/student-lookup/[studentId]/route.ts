import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { KPS_FACULTIES } from "@/lib/faculties";

export const runtime="nodejs";
export const dynamic="force-dynamic";

type Source=Record<string,unknown>;
const string=(value:unknown)=>typeof value==="string"?value.trim():typeof value==="number"?String(value):"";
function field(source:Source,...keys:string[]){for(const key of keys){const value=string(source[key]);if(value)return value;}return "";}
function normalizeDate(value:string){
  if(!value)return "";const iso=/^(\d{4})-(\d{2})-(\d{2})/.exec(value);if(iso){const year=Number(iso[1]);return `${year>2400?year-543:year}-${iso[2]}-${iso[3]}`;}
  const thai=/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/.exec(value);if(!thai)return "";const year=Number(thai[3]);return `${year>2400?year-543:year}-${thai[2].padStart(2,"0")}-${thai[1].padStart(2,"0")}`;
}
function normalizeGender(value:string){const lower=value.toLowerCase();if(["m","male","ชาย"].includes(lower))return "ชาย";if(["f","female","หญิง"].includes(lower))return "หญิง";return value||"อื่น ๆ";}
function normalizeTitle(value:string,gender:string){if(value)return value.replace(/^น\.ส\.$/,"นางสาว").replace(/^นาย\.?$/,"นาย").replace(/^นาง\.?$/,"นาง");return gender==="ชาย"?"นาย":gender==="หญิง"?"นางสาว":"";}
function normalizeStatus(value:string){return ["active","current","กำลังศึกษา","ปกติ"].includes(value.toLowerCase())?"นิสิตปัจจุบัน":value||"นิสิตปัจจุบัน";}
function normalizeStudyYear(value:string){const matched=value.match(/\d+/);return matched?`ปี ${matched[0]}`:value;}
function latestObject(value:unknown){if(!Array.isArray(value))return{};const objects=value.filter(item=>item&&typeof item==="object"&&!Array.isArray(item)) as Source[];return objects.sort((a,b)=>string(b.updated_dt||b.updatedAt).localeCompare(string(a.updated_dt||a.updatedAt)))[0]||{};}
function flatten(value:unknown,target:Source={},depth=0):Source{if(depth>4||!value||typeof value!=="object")return target;if(Array.isArray(value)){const selected=latestObject(value);return flatten(selected,target,depth+1);}for(const[key,item]of Object.entries(value as Source)){if(item===null||item===undefined)continue;if(typeof item==="object")flatten(item,target,depth+1);else if(target[key]===undefined)target[key]=item;}return target;}
function unwrap(value:unknown):Source{
  if(!value||typeof value!=="object"||Array.isArray(value))return{};const root=value as Source;const data=root.data&&typeof root.data==="object"&&!Array.isArray(root.data)?root.data as Source:root;
  const studentValue=data.student??data.result??data.profile??data;const student=Array.isArray(studentValue)?latestObject(studentValue):studentValue&&typeof studentValue==="object"?studentValue as Source:{};
  const names=latestObject(student.name_history??student.nameHistory);return{...flatten(student),...student,...names};
}
function mockResponse(studentId:string){
  const digits=studentId.replace(/\D/g,"")||"6600000000";const seed=[...studentId].reduce((sum,char)=>sum+char.charCodeAt(0),0);const male=seed%2===0;const firstNames=male?["สมชาย","กิตติพงศ์","ธนภัทร"]:["สมหญิง","กัญญารัตน์","พิมพ์ชนก"];const lastNames=["รักเรียน","ใจดี","เกษตรวัฒนา"];const faculty=KPS_FACULTIES[seed%KPS_FACULTIES.length];
  return{status:{code:"200",description:"Success (Mock data)",start_time:new Date().toISOString(),end_time:new Date().toISOString(),duration:0},data:{student:[{id:seed,code:studentId,image:"",name_history:[{prefix_code:male?"001":"002",prefix_th:male?"นาย":"นางสาว",firstname_th:firstNames[seed%firstNames.length],lastname_th:lastNames[seed%lastNames.length],prefix_en:male?"Mr.":"Ms.",firstname_en:"Demo",lastname_en:"Student",updated_dt:"2026-01-01T00:00:00.000Z"}],citizen_id:`9${digits.padEnd(12,"0").slice(0,12)}`,birth_date:`200${seed%6}-0${seed%9+1}-15`,gender:male?"ชาย":"หญิง",faculty_name:faculty,major_name:"สาขาวิชาตัวอย่าง",study_year:String(seed%4+1),phone_no:`08${digits.padEnd(8,"0").slice(0,8)}`,email_address:`${studentId.toLowerCase()}@ku.th`,home_address:"ข้อมูลที่อยู่จำลองสำหรับการนำเสนอ",current_address:"หอพักนิสิต (ข้อมูลจำลอง)",student_status:"active"}]}};
}

export async function GET(_request:Request,{params}:{params:Promise<{studentId:string}>}){
  const{studentId:raw}=await params;const studentId=decodeURIComponent(raw).trim();
  if(!/^[A-Za-z0-9-]{4,20}$/.test(studentId))return NextResponse.json({error:"รูปแบบรหัสนิสิตไม่ถูกต้อง"},{status:400});
  const template=process.env.STUDENT_LOOKUP_API_URL?.trim();const mock=process.env.STUDENT_LOOKUP_MOCK?.trim().toLowerCase()==="true";
  if(!mock&&!template)return NextResponse.json({error:"ยังไม่ได้กำหนด STUDENT_LOOKUP_API_URL หรือเปิด STUDENT_LOOKUP_MOCK ในไฟล์ .env"},{status:503});
  try{
    const existing=await getDb().patient.findUnique({where:{studentId},select:{id:true,title:true,firstName:true,lastName:true}});
    if(existing)return NextResponse.json({error:`รหัสนิสิตนี้ลงทะเบียนแล้ว: ${existing.title}${existing.firstName} ${existing.lastName}`,patientId:existing.id},{status:409});
    let payload:unknown;if(mock)payload=mockResponse(studentId);else{const url=template!.includes("{studentId}")?template!.replaceAll("{studentId}",encodeURIComponent(studentId)):`${template!.replace(/\/$/,"")}/${encodeURIComponent(studentId)}`;const headers:Record<string,string>={Accept:"application/json"};const token=process.env.STUDENT_LOOKUP_API_TOKEN?.trim();if(token)headers.Authorization=token.toLowerCase().startsWith("bearer ")?token:`Bearer ${token}`;const response=await fetch(url,{method:"GET",headers,cache:"no-store",signal:AbortSignal.timeout(10000)});if(response.status===404)return NextResponse.json({error:"ไม่พบข้อมูลรหัสนิสิตนี้"},{status:404});if(!response.ok)return NextResponse.json({error:`ระบบข้อมูลนิสิตตอบกลับไม่สำเร็จ (${response.status})`},{status:502});payload=await response.json();}
    const source=unwrap(payload);const gender=normalizeGender(field(source,"gender","sex","genderName","เพศ"));
    const student={studentId:field(source,"studentId","student_id","studentCode","student_code","code","รหัสนิสิต")||studentId,citizenId:field(source,"citizenId","citizen_id","nationalId","national_id","idCard","pid","เลขประจำตัวประชาชน").replace(/\D/g,""),title:normalizeTitle(field(source,"title","titleName","prefix","prefix_th","คำนำหน้า"),gender),firstName:field(source,"firstName","first_name","firstname","firstname_th","givenName","ชื่อ"),lastName:field(source,"lastName","last_name","lastname","lastname_th","familyName","surname","นามสกุล"),birthDate:normalizeDate(field(source,"birthDate","birth_date","dateOfBirth","dob","birthday","วันเกิด")),gender,bloodGroup:field(source,"bloodGroup","blood_group","bloodType","blood_type","หมู่เลือด"),faculty:field(source,"faculty","facultyName","faculty_name","faculty_th","คณะ"),major:field(source,"major","majorName","major_name","major_th","department_name","สาขา"),studyYear:normalizeStudyYear(field(source,"studyYear","study_year","yearLevel","classYear","year","ชั้นปี")),phone:field(source,"phone","phoneNumber","phone_no","mobile","mobilePhone","mobile_no","โทรศัพท์"),email:field(source,"email","emailAddress","email_address","อีเมล"),homeAddress:field(source,"homeAddress","home_address","registeredAddress","address","address_th","ที่อยู่"),currentAddress:field(source,"currentAddress","current_address","dormitoryAddress","dormitory_address","ที่พักปัจจุบัน"),status:normalizeStatus(field(source,"status","studentStatus","student_status","status_th","สถานภาพ"))};
    if(!student.firstName||!student.lastName)return NextResponse.json({error:"ได้รับข้อมูลจากระบบต้นทาง แต่ไม่พบชื่อหรือนามสกุล กรุณาตรวจสอบรูปแบบ JSON"},{status:502});
    return NextResponse.json({student,mock},{headers:{"Cache-Control":"private, no-store, max-age=0","Pragma":"no-cache"}});
  }catch(reason){const timeout=reason instanceof Error&&reason.name==="TimeoutError";return NextResponse.json({error:timeout?"ระบบข้อมูลนิสิตใช้เวลาตอบกลับนานเกินไป":"ไม่สามารถเชื่อมต่อระบบข้อมูลนิสิตได้"},{status:502});}
}
