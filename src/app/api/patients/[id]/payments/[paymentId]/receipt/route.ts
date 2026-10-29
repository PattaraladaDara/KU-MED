import { NextRequest,NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { THAI_BUDDHIST_LOCALE,THAI_TIME_ZONE } from "@/lib/thai-date";
import { getAuthSession } from "@/lib/auth-session";
import { can } from "@/lib/access-control";

export const runtime="nodejs";
const escape=(value:string)=>value.replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[char]!));
const money=(satang:number|null)=>((satang||0)/100).toLocaleString("th-TH",{minimumFractionDigits:2,maximumFractionDigits:2});

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
  const html=`<!doctype html>
<html lang="th">
<head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>ใบเสร็จ ${escape(receiptNumber)}</title>
  <style>
    @font-face{font-family:"TH Sarabun New";src:url("/fonts/THSarabunNew.ttf") format("truetype");font-weight:400;font-style:normal;font-display:swap}
    @font-face{font-family:"TH Sarabun New";src:url("/fonts/THSarabunNew-Bold.ttf") format("truetype");font-weight:700;font-style:normal;font-display:swap}
    *{box-sizing:border-box}html,body{margin:0;min-height:100%;background:#e5e7eb;color:#111827;font-family:"TH Sarabun New",sans-serif}
    .receipt{display:flex;flex-direction:column;width:80mm;height:120mm;margin:18px auto;padding:3mm 3mm 2.5mm;overflow:hidden;background:#fff;box-shadow:0 8px 28px #0002;font-size:9pt;line-height:1.15}
    .receipt-header{display:flex;align-items:center;height:13mm;gap:2.5mm;padding:0 1.5mm 1.5mm;border-bottom:.2mm solid #737373}.receipt-header img{width:10.5mm;height:10.5mm;object-fit:contain}.receipt-header div{display:grid;gap:.3mm}.receipt-header strong{font-size:8.5pt;font-weight:600;line-height:1.15}.receipt-header span{font-size:7.5pt;line-height:1.1}
    .receipt-body{display:flex;flex:1;flex-direction:column;padding:4mm 3mm 1.5mm}.identity{display:grid;gap:.6mm}.label{font-size:8.5pt}.value{padding-left:2mm;font-size:9pt;font-weight:700}.meta{font-size:6.5pt;font-weight:400;color:#4b5563}
    .charges{display:flex;flex:1;flex-direction:column;padding-top:4mm}.charges h2{margin:0 0 1.5mm;font-size:8.5pt;font-weight:400}.charge-row{display:flex;justify-content:space-between;gap:4mm;padding-left:2mm;font-size:9pt;font-weight:700}.receipt-number{margin-top:.6mm;padding-left:2mm;font-size:6.5pt;color:#4b5563}
    .summary{display:grid;gap:1mm;margin-bottom:4mm}.summary-row{display:flex;justify-content:space-between;gap:4mm;font-size:8.5pt}.summary-row.total{font-weight:700}.cash-detail{display:flex;justify-content:flex-end;gap:4mm;font-size:6.5pt;color:#4b5563}.status{font-size:6.5pt;color:#4b5563;text-align:right}
    .receipt-footer{display:grid;grid-template-columns:.95fr 1.35fr;gap:3mm;padding:1.5mm 1mm 0;border-top:.2mm solid #737373;text-align:left}.receipt-footer>div{display:grid;align-content:start;gap:.25mm}.receipt-footer strong,.receipt-footer span{display:block;font-size:5.7pt;line-height:1.15}.receipt-footer strong{font-weight:600}.receipt-footer address{margin:0;color:#374151;font-size:5.3pt;font-style:normal;line-height:1.2}
    .actions{text-align:center;margin:16px}.actions button{border:0;border-radius:8px;padding:10px 18px;background:#08785e;color:#fff;font:700 16px "TH Sarabun New",sans-serif;cursor:pointer}
    @page{size:80mm 120mm;margin:0}@media print{html,body{width:80mm;height:120mm;min-height:120mm;overflow:hidden;background:#fff}.receipt{width:80mm;height:120mm;margin:0;box-shadow:none;break-inside:avoid;page-break-after:avoid}.actions{display:none}}
  </style>
</head>
<body>
  <article class="receipt">
    <header class="receipt-header"><img src="/appointment-emblem.png" alt="ตรามหาวิทยาลัยเกษตรศาสตร์"><div><strong>สถานพยาบาลมหาวิทยาลัยเกษตรศาสตร์</strong><span>วิทยาเขตกำแพงแสน</span></div></header>
    <main class="receipt-body">
      <section class="identity"><span class="label">ชื่อ–นามสกุล</span><strong class="value">${escape(patientName)}</strong><span class="meta">รหัสผู้รับบริการ ${escape(payment.patient.studentId||"-")} · ${escape(date)}</span></section>
      <section class="charges"><h2>รายการเรียกชำระ:</h2><div class="charge-row"><span>${escape(payment.description)}</span><span>${money(payment.amountSatang)} บาท</span></div><div class="receipt-number">เลขที่ใบเสร็จ ${escape(receiptNumber)}</div></section>
      <section class="summary"><div class="summary-row total"><span>รวม</span><span>${money(payment.amountSatang)} บาท</span></div><div class="summary-row"><span>ส่วนลด</span><span>0.00 บาท</span></div><div class="summary-row"><span>ชำระผ่านช่องทาง</span><span>${escape(paymentChannel)}</span></div>${cashDetails}<div class="status">${payment.status==="paid"?"ชำระเงินเรียบร้อย":"รอการยืนยันการชำระเงิน"}</div></section>
    </main>
    <footer class="receipt-footer"><div><strong>สอบถามเพิ่มเติม / แจ้งเปลี่ยนกำหนดการนัด</strong><span>☎ โทร 034-351611</span></div><address>สถานพยาบาล มหาวิทยาลัยเกษตรศาสตร์ วิทยาเขตกำแพงแสน<br>เลขที่ 1 หมู่ 6 ถนนมาลัยแมน ตำบลกำแพงแสน<br>อำเภอกำแพงแสน จังหวัดนครปฐม 73140</address></footer>
  </article>
  <div class="actions"><button type="button" onclick="printReady()">พิมพ์ / บันทึกเป็น PDF</button></div>
  <script>
    async function printReady(){
      try{
        if(document.fonts)await Promise.allSettled([
          document.fonts.load('400 16px "TH Sarabun New"'),
          document.fonts.load('700 16px "TH Sarabun New"'),
          document.fonts.ready
        ]);
        await Promise.all(Array.from(document.images).map(image=>image.complete?Promise.resolve():new Promise(resolve=>{image.addEventListener("load",resolve,{once:true});image.addEventListener("error",resolve,{once:true});})));
      }finally{
        await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
        window.print();
      }
    }
    window.addEventListener("load",()=>{void printReady();});
  </script>
</body>
</html>`;
  return new NextResponse(html,{headers:{"Content-Type":"text/html; charset=utf-8","Content-Disposition":`inline; filename="${receiptNumber}.html"`,"Cache-Control":"private, no-store"}});
}
