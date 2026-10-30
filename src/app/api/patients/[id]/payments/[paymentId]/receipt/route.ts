import { NextRequest,NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { THAI_BUDDHIST_LOCALE,THAI_TIME_ZONE } from "@/lib/thai-date";
import { getAuthSession } from "@/lib/auth-session";
import { can } from "@/lib/access-control";

export const runtime="nodejs";
const escape=(value:string)=>value.replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[char]!));
const money=(satang:number|null)=>((satang||0)/100).toLocaleString("th-TH",{minimumFractionDigits:2,maximumFractionDigits:2});
function receiptItems(description:string){
  return description.split(/\r?\n/).map(line=>line.trim()).filter(Boolean).map(line=>{
    const match=line.match(/([\d,]+(?:\.\d{1,2})?)\s*บาท/);
    if(!match)return{name:line.replace(/^[\s—–-]+|[\s—–-]+$/g,""),amount:null as number|null};
    const amount=Math.round(Number(match[1].replaceAll(",",""))*100);
    const name=`${line.slice(0,match.index)} ${line.slice((match.index||0)+match[0].length)}`.replace(/[\s—–-]+/g," ").trim();
    return{name:name||"รายการชำระ",amount:Number.isSafeInteger(amount)?amount:null};
  }).filter(item=>item.name);
}

export async function GET(request:NextRequest,{params}:{params:Promise<{id:string;paymentId:string}>}){
  const session=getAuthSession(request);
  if(!session)return NextResponse.json({error:"กรุณาเข้าสู่ระบบใหม่"},{status:401});
  if(!can(session.role,"payments:view")||!can(session.role,"documents:print"))return NextResponse.json({error:"บัญชีนี้ไม่มีสิทธิ์ดำเนินการ"},{status:403});
  const{id,paymentId}=await params;
  const payment=await getDb().payment.findFirst({where:{id:paymentId,patientId:id},include:{patient:{select:{title:true,firstName:true,lastName:true,studentId:true}}}});
  if(!payment)return NextResponse.json({error:"ไม่พบใบเสร็จ"},{status:404});
  if(payment.status!=="paid")return NextResponse.json({error:"ออกใบเสร็จได้เมื่อยืนยันการชำระเงินแล้วเท่านั้น"},{status:409});

  const receiptNumber=payment.receiptNumber||payment.referenceCode;
  const date=new Intl.DateTimeFormat(THAI_BUDDHIST_LOCALE,{dateStyle:"long",timeStyle:"short",timeZone:THAI_TIME_ZONE}).format(payment.paidAt);
  const patientName=`${payment.patient.title}${payment.patient.firstName} ${payment.patient.lastName}`;
  const paymentChannel=payment.method==="โอนเงิน"?"สแกนคิวอาร์โค้ด":payment.method;
  const cashDetails=payment.method==="เงินสด"?`<div class="cash-detail"><span>รับเงิน ${money(payment.receivedSatang)} บาท</span><span>เงินทอน ${money(payment.changeSatang)} บาท</span></div>`:"";
  const items=receiptItems(payment.description);
  const itemRows=items.map(item=>`<tr><td>${escape(item.name)}</td><td class="amount">${item.amount===null?"—":money(item.amount)}</td></tr>`).join("");
  const html=`<!doctype html>
<html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>ใบเสร็จ ${escape(receiptNumber)}</title>
  <style>
    @font-face{font-family:"TH Sarabun New";src:url("/fonts/THSarabunNew.ttf") format("truetype");font-weight:400;font-style:normal;font-display:swap}
    @font-face{font-family:"TH Sarabun New";src:url("/fonts/THSarabunNew-Bold.ttf") format("truetype");font-weight:700;font-style:normal;font-display:swap}
    @page{size:58mm 220mm;margin:0}
    *{box-sizing:border-box}html,body{margin:0;background:#fff;color:#173d32;font-family:"TH Sarabun New",sans-serif;font-size:16pt;line-height:1.35}
    body{padding:14mm}.receipt{width:100%;max-width:190mm;margin:0 auto}
    .receipt-header{display:grid;grid-template-columns:20mm 1fr;align-items:center;gap:5mm;padding-bottom:5mm;border-bottom:1px solid #52615c}.receipt-header img{width:18mm;height:18mm;object-fit:contain}.receipt-header div{display:grid;gap:1mm}.receipt-header strong{font-size:20pt;line-height:1.2}.receipt-header span{font-size:16pt;color:#52615c}
    h1{text-align:center;font-size:24pt;line-height:1.2;margin:7mm 0 1mm}.receipt-number{text-align:center;color:#52615c;margin-bottom:7mm}
    .identity{display:grid;grid-template-columns:1fr 1fr;gap:3mm 8mm;padding:5mm;border:1px solid #cbd5d1;background:#f7faf9}.field{display:grid;grid-template-columns:35mm minmax(0,1fr);gap:3mm;align-items:start;min-width:0}.field span{color:#52615c}.field strong{min-width:0;font-weight:700;overflow-wrap:anywhere}
    .charges{margin-top:7mm}.charges h2{font-size:18pt;margin:0 0 2mm;padding-bottom:2mm;border-bottom:1px solid #9aa8a2}.items{width:100%;border-collapse:collapse;table-layout:fixed}.items th{padding:2mm;background:#f1f6f4;color:#173d32;text-align:left;font-size:15pt;border-bottom:1px solid #9aa8a2}.items th:last-child,.items td.amount{text-align:right;width:36mm;white-space:nowrap}.items td{padding:2.5mm 2mm;border-bottom:1px solid #e0e6e3;font-size:16pt;vertical-align:top;overflow-wrap:anywhere}.items tfoot th{padding:3mm 2mm;font-size:18pt;border-top:1.5px solid #52615c;background:#fff}.items tfoot th:last-child{text-align:right;color:#08785e}.summary{display:grid;gap:1mm;max-width:100mm;margin:4mm 0 0 auto}.summary-row{display:flex;justify-content:space-between;gap:8mm;font-size:16pt}.cash-detail{display:grid;grid-template-columns:1fr auto;gap:2mm;color:#52615c}.status{text-align:right;color:#08785e;font-weight:700;margin-top:2mm}
    .receipt-footer{margin-top:12mm;padding-top:4mm;border-top:1px solid #52615c;display:grid;grid-template-columns:1fr 1fr;gap:8mm;color:#52615c;font-size:14pt}.receipt-footer strong{color:#173d32}.receipt-footer address{font-style:normal}
    @media(max-width:110mm){html,body{font-size:13pt}.receipt-header{grid-template-columns:13mm minmax(0,1fr);gap:3mm}.receipt-header img{width:12mm;height:12mm}.receipt-header strong{font-size:15pt}.receipt-header span{font-size:13pt}h1{font-size:19pt;margin:4mm 0 1mm}.receipt-number{margin-bottom:4mm}.identity{grid-template-columns:minmax(0,1fr);gap:2mm;padding:3mm}.field{grid-template-columns:24mm minmax(0,1fr);gap:2mm}.charges{margin-top:4mm}.charges h2{font-size:15pt}.items th{font-size:12pt;padding:1.5mm}.items th:last-child,.items td.amount{width:25mm}.items td{font-size:13pt;padding:2mm 1mm}.items tfoot th{font-size:15pt}.summary{max-width:none;margin-top:3mm}.summary-row{font-size:13pt}.receipt-footer{grid-template-columns:minmax(0,1fr);gap:2mm;margin-top:6mm;font-size:12pt}}
    @media print{body{width:58mm;padding:10mm 3mm}.receipt{max-width:none}.identity,.charge-row,.receipt-footer{break-inside:avoid}}
  </style></head><body><article class="receipt">
    <header class="receipt-header"><img src="/appointment-emblem.png" alt="ตรามหาวิทยาลัยเกษตรศาสตร์"><div><strong>สถานพยาบาลมหาวิทยาลัยเกษตรศาสตร์</strong><span>วิทยาเขตกำแพงแสน</span></div></header>
    <h1>ใบเสร็จรับเงิน</h1><div class="receipt-number">เลขที่ ${escape(receiptNumber)}</div>
    <section class="identity"><div class="field"><span>ชื่อ–นามสกุล</span><strong>${escape(patientName)}</strong></div><div class="field"><span>รหัสผู้รับบริการ</span><strong>${escape(payment.patient.studentId||"-")}</strong></div><div class="field"><span>วันที่และเวลา</span><strong>${escape(date)}</strong></div><div class="field"><span>ช่องทางชำระเงิน</span><strong>${escape(paymentChannel)}</strong></div></section>
    <section class="charges"><h2>รายการเรียกเก็บ</h2><table class="items"><thead><tr><th>รายการ</th><th>จำนวนเงิน (บาท)</th></tr></thead><tbody>${itemRows}</tbody><tfoot><tr><th>ยอดรวมสุทธิ</th><th>${money(payment.amountSatang)}</th></tr></tfoot></table></section>
    <section class="summary">${cashDetails?`<div class="cash-detail">${cashDetails.replace(/<div class="cash-detail">|<\/div>/g,"")}</div>`:""}<div class="status">${payment.status==="paid"?"ชำระเงินเรียบร้อย":"รอการยืนยันการชำระเงิน"}</div></section>
    <footer class="receipt-footer"><div><strong>สอบถามเพิ่มเติม</strong><br>โทร 034-351611</div><address>สถานพยาบาล มหาวิทยาลัยเกษตรศาสตร์ วิทยาเขตกำแพงแสน<br>เลขที่ 1 หมู่ 6 ถนนมาลัยแมน ตำบลกำแพงแสน<br>อำเภอกำแพงแสน จังหวัดนครปฐม 73140</address></footer>
  </article><script>window.addEventListener("load",async()=>{try{if(document.fonts)await Promise.allSettled([document.fonts.load('400 16px "TH Sarabun New"'),document.fonts.load('700 16px "TH Sarabun New"'),document.fonts.ready]);await Promise.all(Array.from(document.images).map(image=>image.complete?Promise.resolve():new Promise(resolve=>{image.addEventListener("load",resolve,{once:true});image.addEventListener("error",resolve,{once:true});})));}finally{await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));window.print();}});</script></body></html>`;
  return new NextResponse(html,{headers:{"Content-Type":"text/html; charset=utf-8","Content-Disposition":`inline; filename="${receiptNumber}.html"`,"Cache-Control":"private, no-store"}});
}
