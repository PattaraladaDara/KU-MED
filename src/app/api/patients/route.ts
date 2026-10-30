import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { isUniqueError, optionalText, text } from "@/lib/api-validation";
import { parseBangkokDate } from "@/lib/thai-date";
import { requirePermission } from "@/lib/auth-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const normalizeSearch=(value:string)=>value.toLocaleLowerCase("th-TH").normalize("NFKC").replace(/[^\p{L}\p{N}@.]+/gu," ").trim().replace(/\s+/g," ");
function editDistance(left:string,right:string){const previous=Array.from({length:right.length+1},(_,index)=>index);for(let row=1;row<=left.length;row++){let diagonal=previous[0];previous[0]=row;for(let column=1;column<=right.length;column++){const above=previous[column];previous[column]=left[row-1]===right[column-1]?diagonal:Math.min(diagonal,above,previous[column-1])+1;diagonal=above;}}return previous[right.length];}
function tokenScore(token:string,fields:{value:string;weight:number}[]){let best=0;for(const field of fields){const value=normalizeSearch(field.value);if(!value)continue;if(value===token)best=Math.max(best,field.weight+300);else if(value.startsWith(token))best=Math.max(best,field.weight+220);else if(value.includes(token))best=Math.max(best,field.weight+140);else if(token.length>=3){for(const word of value.split(" ")){const tolerance=token.length>=7?2:1;if(Math.abs(word.length-token.length)<=tolerance&&editDistance(token,word)<=tolerance)best=Math.max(best,field.weight+40);}}}return best;}

export async function GET(request: NextRequest) {
  const auth = requirePermission(request, "patients:view");
  if (auth.response) return auth.response;
  const query = text(request.nextUrl.searchParams.get("q"), 100);
  if (query.length === 1) return NextResponse.json({ error: "กรุณากรอกคำค้นหาอย่างน้อย 2 ตัวอักษร" }, { status: 400 });
  try {
    const candidates = await getDb().patient.findMany({
      select: { id: true, citizenId: true, studentId: true, firstName: true, lastName: true, email: true, phone: true, faculty: true, major: true, status: true, title: true, studyYear: true, updatedAt: true },
      orderBy: { updatedAt: "desc" }, take: query ? 500 : 20,
    });
    const normalized=normalizeSearch(query);const tokens=normalized.split(" ").filter(Boolean);
    const maySearchSensitiveFields = ["admin", "staff", "nurse", "executive"].includes(auth.session!.role);
    const matches=query?candidates.map(patient=>{const fields=[{value:patient.studentId,weight:700},{value:`${patient.firstName} ${patient.lastName}`,weight:650},{value:patient.firstName,weight:600},{value:patient.lastName,weight:600},{value:patient.faculty,weight:250},{value:patient.major,weight:220},{value:patient.status,weight:180},...(maySearchSensitiveFields?[{value:patient.citizenId,weight:700},{value:patient.email,weight:450},{value:patient.phone,weight:450}]:[])];const scores=tokens.map(token=>tokenScore(token,fields));return{patient,score:scores.reduce((sum,score)=>sum+score,0),matched:scores.every(score=>score>0)};}).filter(item=>item.matched).sort((left,right)=>right.score-left.score||right.patient.updatedAt.getTime()-left.patient.updatedAt.getTime()).slice(0,20).map(item=>item.patient):candidates;
    // Search is for finding a chart, not for exporting a directory of PII or
    // clinical history. Sensitive identifiers and treatment records stay server-side.
    const maySeeContact = ["admin", "staff", "nurse", "executive"].includes(auth.session!.role);
    const patients = matches.map(({ id, title, firstName, lastName, studentId, status, faculty, major, studyYear, email }) => ({
      id, title, firstName, lastName, studentId, status, faculty, major, studyYear,
      ...(maySeeContact ? { email } : {}),
    }));
    return NextResponse.json({ patients });
  } catch {
    return NextResponse.json({ error: "ไม่สามารถเชื่อมต่อฐานข้อมูลได้" }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  const auth = requirePermission(request, "patients:register");
  if (auth.response) return auth.response;
  try {
    const body = await request.json() as Record<string, unknown>;
    const required = ["citizenId", "studentId", "status", "title", "firstName", "lastName", "birthDate", "gender", "faculty", "major", "studyYear", "phone", "email", "coverage", "coverageStatus"];
    if (required.some(key => !text(body[key]))) return NextResponse.json({ error: "กรุณากรอกข้อมูลที่จำเป็นให้ครบ" }, { status: 400 });
    const birthDate = parseBangkokDate(text(body.birthDate));
    if (Number.isNaN(birthDate.getTime()) || birthDate > new Date()) return NextResponse.json({ error: "วันเกิดไม่ถูกต้อง" }, { status: 400 });
    const citizenId = text(body.citizenId).replace(/\D/g, "");
    if (citizenId.length !== 13) return NextResponse.json({ error: "เลขประจำตัวประชาชนต้องมี 13 หลัก" }, { status: 400 });
    const patient = await getDb().patient.create({ data: {
      citizenId, studentId: text(body.studentId), status: text(body.status), title: text(body.title),
      firstName: text(body.firstName), lastName: text(body.lastName), birthDate, gender: text(body.gender),
      bloodGroup: optionalText(body.bloodGroup), faculty: text(body.faculty), major: text(body.major),
      studyYear: text(body.studyYear), phone: text(body.phone), email: text(body.email).toLowerCase(),
      homeAddress: optionalText(body.homeAddress), currentAddress: optionalText(body.currentAddress),
      coverage: text(body.coverage), coverageStatus: text(body.coverageStatus), allergyNotes: optionalText(body.allergyNotes),
    } });
    return NextResponse.json({ patient }, { status: 201 });
  } catch (error) {
    if (isUniqueError(error)) return NextResponse.json({ error: "เลขประชาชน รหัสนิสิต หรืออีเมลนี้มีในระบบแล้ว" }, { status: 409 });
    return NextResponse.json({ error: "ไม่สามารถบันทึกข้อมูลได้" }, { status: 503 });
  }
}
