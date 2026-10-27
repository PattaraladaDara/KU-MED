import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const runtime="nodejs";
export const dynamic="force-dynamic";

type Source=Record<string,unknown>;
type CardData={citizenId:string;title:string;firstName:string;lastName:string;birthDate:string;gender:string;homeAddress:string};
const attempts=new Map<string,{count:number;resetAt:number}>();
const noStore={"Cache-Control":"private, no-store, max-age=0","Pragma":"no-cache","X-Content-Type-Options":"nosniff"};
const value=(source:Source,...keys:string[])=>{for(const key of keys){const item=source[key];if(typeof item==="string"&&item.trim())return item.trim();if(typeof item==="number")return String(item);}return "";};
function normalizeDate(input:string){const iso=/^(\d{4})-(\d{2})-(\d{2})/.exec(input);if(iso){const year=Number(iso[1]);return `${year>2400?year-543:year}-${iso[2]}-${iso[3]}`;}const thai=/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/.exec(input);if(!thai)return "";const year=Number(thai[3]);return `${year>2400?year-543:year}-${thai[2].padStart(2,"0")}-${thai[1].padStart(2,"0")}`;}

function thaiId(prefix:string){const twelve=prefix.replace(/\D/g,"").padEnd(12,"0").slice(0,12);const sum=[...twelve].reduce((total,digit,index)=>total+Number(digit)*(13-index),0);return `${twelve}${(11-sum%11)%10}`;}
function mockCard():CardData{
  const suffix=String(Date.now()).slice(-6);const male=Number(suffix.at(-1))%2===0;
  return{citizenId:thaiId(`900001${suffix}`),title:male?"นาย":"นางสาว",firstName:male?"ทดสอบระบบ":"ตัวอย่างระบบ",lastName:"บัตรประชาชนจำลอง",birthDate:male?"1988-05-18":"1992-11-07",gender:male?"ชาย":"หญิง",homeAddress:"99 หมู่ 9 ตำบลกำแพงแสน อำเภอกำแพงแสน จังหวัดนครปฐม 73140"};
}
function normalize(payload:unknown):CardData{
  const root=payload&&typeof payload==="object"&&!Array.isArray(payload)?payload as Source:{};
  const nested=root.data&&typeof root.data==="object"&&!Array.isArray(root.data)?root.data as Source:root;
  const citizenId=value(nested,"citizenId","citizen_id","nationalId","pid").replace(/\D/g,"");
  const genderRaw=value(nested,"gender","sex").toLowerCase();const gender=["m","male","ชาย"].includes(genderRaw)?"ชาย":["f","female","หญิง"].includes(genderRaw)?"หญิง":"อื่น ๆ";
  return{citizenId,title:value(nested,"title","prefix","prefix_th"),firstName:value(nested,"firstName","first_name","firstname_th","firstname"),lastName:value(nested,"lastName","last_name","lastname_th","lastname"),birthDate:normalizeDate(value(nested,"birthDate","birth_date","dateOfBirth","dob")),gender,homeAddress:value(nested,"homeAddress","home_address","address","address_th")};
}
function limited(request:NextRequest){const key=request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()||"local";const now=Date.now();const current=attempts.get(key);if(!current||current.resetAt<now){attempts.set(key,{count:1,resetAt:now+60_000});return false;}current.count+=1;return current.count>10;}
function response(body:unknown,status=200){return NextResponse.json(body,{status,headers:noStore});}

export async function POST(request:NextRequest){
  if(limited(request))return response({error:"มีการเรียกใช้งานเครื่องอ่านบัตรถี่เกินไป กรุณารอสักครู่"},429);
  const origin=request.headers.get("origin"),host=request.headers.get("host"),fetchSite=request.headers.get("sec-fetch-site");
  if(origin&&host&&new URL(origin).host!==host)return response({error:"ไม่อนุญาตให้เรียกใช้งานเครื่องอ่านบัตรจากเว็บไซต์อื่น"},403);
  if(fetchSite&&!["same-origin","same-site","none"].includes(fetchSite))return response({error:"ไม่อนุญาตให้เรียกใช้งานเครื่องอ่านบัตรจากเว็บไซต์อื่น"},403);
  if(Number(request.headers.get("content-length")||0)>1024)return response({error:"คำขอมีขนาดเกินกว่าที่ระบบกำหนด"},413);
  const body=await request.json().catch(()=>null) as {requestId?:unknown;cardData?:unknown}|null;
  if(!body||typeof body.requestId!=="string"||!/^[0-9a-f-]{36}$/i.test(body.requestId))return response({error:"คำขออ่านบัตรไม่ถูกต้อง"},400);
  const mode=(process.env.CITIZEN_CARD_READER_MODE||"local").trim().toLowerCase();
  if(!["mock","local"].includes(mode))return response({error:"ยังไม่ได้เปิดใช้งานระบบเครื่องอ่านบัตรประชาชน"},503);
  try{
    let card:CardData;
    if(mode==="mock")card=mockCard();
    else{
      if(!body.cardData)return response({error:"ไม่พบข้อมูลจากโปรแกรมอ่านบัตรในเครื่อง กรุณาเปิดโปรแกรมอ่านบัตรแล้วลองใหม่"},400);
      card=normalize(body.cardData);
    }
    if(card.citizenId.length!==13||!card.firstName||!card.lastName||!card.birthDate)return response({error:"อ่านบัตรสำเร็จแต่ข้อมูลระบุตัวตนไม่ครบถ้วน กรุณาถอดบัตรและลองใหม่"},502);
    const existing=await getDb().patient.findUnique({where:{citizenId:card.citizenId},select:{id:true,title:true,firstName:true,lastName:true}});
    if(existing)return response({error:`บุคคลนี้มีเวชระเบียนในระบบแล้ว: ${existing.title}${existing.firstName} ${existing.lastName}`,patientId:existing.id},409);
    const registration={studentId:`EXT-${card.citizenId.slice(-6)}`,citizenId:card.citizenId,title:card.title||(card.gender==="ชาย"?"นาย":"นางสาว"),firstName:card.firstName,lastName:card.lastName,birthDate:card.birthDate,gender:card.gender,bloodGroup:"",faculty:"บุคคลภายนอก",major:"ไม่ระบุ",studyYear:"ไม่เกี่ยวข้อง",phone:"",email:"",homeAddress:card.homeAddress,currentAddress:"",status:"บุคคลภายนอก"};
    return response({registration,mock:mode==="mock",readAt:new Date().toISOString()});
  }catch(reason){const timeout=reason instanceof Error&&(reason.name==="TimeoutError"||reason.name==="AbortError");return response({error:timeout?"เครื่องอ่านบัตรใช้เวลาตอบกลับนานเกินไป":"ไม่สามารถเชื่อมต่อโปรแกรมอ่านบัตรประชาชนได้"},502);}
}
