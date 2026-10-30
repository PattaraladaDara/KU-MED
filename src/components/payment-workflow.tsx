"use client";
import Image from "next/image";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import QRCode from "qrcode";
import generatePromptPayPayload from "promptpay-qr";
import { THAI_BUDDHIST_LOCALE, THAI_TIME_ZONE } from "@/lib/thai-date";
import { getDemoSessionProfile } from "@/lib/demo-session";
import type { MedicationOrderSnapshot } from "@/lib/medication-orders";

export type PaymentItem={id:string;paidAt:string;referenceCode:string;receiptNumber:string|null;description:string;amountSatang:number;method:string;status:string;receivedSatang:number|null;changeSatang:number|null;slipFileName:string|null;treatmentRecordId?:string|null;createdByName?:string|null;createdByRole?:string|null};
const money=(satang:number)=>`฿${(satang/100).toLocaleString("th-TH",{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const paymentTime=(value:string)=>new Intl.DateTimeFormat(THAI_BUDDHIST_LOCALE,{hour:"2-digit",minute:"2-digit",timeZone:THAI_TIME_ZONE}).format(new Date(value));
const dateTime=(value:string)=>new Intl.DateTimeFormat(THAI_BUDDHIST_LOCALE,{dateStyle:"medium",timeStyle:"short",timeZone:THAI_TIME_ZONE}).format(new Date(value));
function PaymentDateBadge({value}:{value:string}){const date=new Date(value);return <time className="payment-date-badge" dateTime={date.toISOString()}><small>{new Intl.DateTimeFormat("th-TH",{month:"short",timeZone:THAI_TIME_ZONE}).format(date)}</small><strong>{new Intl.DateTimeFormat("th-TH",{day:"numeric",timeZone:THAI_TIME_ZONE}).format(date)}</strong><span>พ.ศ. {new Intl.DateTimeFormat(THAI_BUDDHIST_LOCALE,{year:"numeric",timeZone:THAI_TIME_ZONE}).format(date)}</span></time>}

export function ReceiptPrintButton({patientId,paymentId}:{patientId:string;paymentId:string}){
  const[printing,setPrinting]=useState(false);
  function printReceipt(){
    setPrinting(true);
    const frame=document.createElement("iframe");
    frame.title="พิมพ์ใบเสร็จ";
    frame.src=`/api/patients/${patientId}/payments/${paymentId}/receipt`;
    frame.style.position="fixed";
    frame.style.width="1px";
    frame.style.height="1px";
    frame.style.border="0";
    frame.style.opacity="0";
    frame.style.pointerEvents="none";
    document.body.appendChild(frame);
    window.setTimeout(()=>{frame.remove();setPrinting(false);},60000);
  }
  return <button type="button" className="primary-button receipt-print-button" onClick={printReceipt} disabled={printing}>{printing?"กำลังเตรียมใบเสร็จ...":"พิมพ์ใบเสร็จ"}</button>;
}

type BillableMedicationCandidate={treatmentRecordId:string;visitedAt:string;items:MedicationOrderSnapshot[]};
type BillableServiceItem={id:string;code:string;name:string;category:string;unit:string;unitPriceSatang:number};
export function PaymentForm({patientId,saving,onSaved,onError,medicationCandidates=[]}:{patientId:string;saving:boolean;onSaved:()=>Promise<void>;onError:(message:string)=>void;medicationCandidates?:BillableMedicationCandidate[]}){
  const[method,setMethod]=useState("เงินสด"),[received,setReceived]=useState(""),[qr,setQr]=useState({payload:"",url:""}),[items,setItems]=useState<{description:string;amount:string;catalogItemId:string;quantity:number;unit:string;unitPriceSatang:number}[]>([]),[selectedTreatmentId,setSelectedTreatmentId]=useState(""),[serviceCatalog,setServiceCatalog]=useState<BillableServiceItem[]>([]),[selectedServiceId,setSelectedServiceId]=useState(""),[serviceQuantity,setServiceQuantity]=useState("1");
  const promptPayId=process.env.NEXT_PUBLIC_PROMPTPAY_ID?.trim()||"";
  const selectedMedication=medicationCandidates.find(candidate=>candidate.treatmentRecordId===selectedTreatmentId);
  const medicationAmount=(selectedMedication?.items||[]).reduce((sum,item)=>sum+item.lineTotalSatang,0)/100;
  const serviceItems=items.map(item=>({catalogItemId:item.catalogItemId,quantity:item.quantity}));
  const serviceAmount=items.reduce((sum,item)=>sum+Number(item.amount),0);
  const amount=medicationAmount+serviceAmount;
  const hasInvalidService=items.some(item=>!Number.isFinite(item.quantity)||item.quantity<=0);
  const qrPayload=useMemo(()=>{if(method!=="โอนเงิน"||!Number.isFinite(amount)||amount<=0)return "";return promptPayId?generatePromptPayPayload(promptPayId,{amount}):`KUMED|TRANSFER|THB|${amount.toFixed(2)}`;},[amount,method,promptPayId]);
  useEffect(()=>{let active=true;if(qrPayload)QRCode.toDataURL(qrPayload,{width:220,margin:1,color:{dark:"#123d32",light:"#ffffff"}}).then(url=>{if(active)setQr({payload:qrPayload,url});});return()=>{active=false;};},[qrPayload]);
  useEffect(()=>{let active=true;fetch("/api/service-catalog",{cache:"no-store"}).then(async response=>{const result=await response.json();if(!response.ok)throw new Error(result.error||"โหลดบัญชีค่าบริการไม่สำเร็จ");if(active)setServiceCatalog(result.items||[]);}).catch(reason=>onError(reason instanceof Error?reason.message:"โหลดบัญชีค่าบริการไม่สำเร็จ"));return()=>{active=false;};},[onError]);
  const amountSatang=Math.round(amount*100),change=(Number(received)||0)-amount;
  function updateItem(index:number,value:string){const quantity=Number(value)||0;setItems(current=>current.map((item,itemIndex)=>itemIndex===index?{...item,quantity,amount:(item.unitPriceSatang*Math.max(0,quantity)/100).toFixed(2)}:item));}
  function addCatalogService(){const item=serviceCatalog.find(service=>service.id===selectedServiceId),quantity=Number(serviceQuantity);if(!item||!Number.isFinite(quantity)||quantity<=0)return;setItems(current=>[...current,{catalogItemId:item.id,description:item.name,quantity,unit:item.unit,unitPriceSatang:item.unitPriceSatang,amount:(item.unitPriceSatang*quantity/100).toFixed(2)}]);setSelectedServiceId("");setServiceQuantity("1");}
  async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();onError("");if(hasInvalidService||amount<=0){onError(hasInvalidService?"กรุณาระบุจำนวนค่าบริการให้มากกว่า 0":"เลือกใบสั่งยาหรือเพิ่มรายการเรียกเก็บก่อน");return;}const body={kind:"payment",method,receivedAmount:received,qrPayload,medicationTreatmentRecordId:selectedTreatmentId||null,serviceItems};try{const response=await fetch(`/api/patients/${patientId}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});const result=await response.json();if(!response.ok)throw new Error(result.error||"บันทึกการชำระเงินไม่สำเร็จ");await onSaved();}catch(reason){onError(reason instanceof Error?reason.message:"บันทึกการชำระเงินไม่สำเร็จ");}}
  return <form className="record-form payment-form" data-payment-workflow="cash-v2" onSubmit={submit}>
    <div className="field full payment-invoice-field">
      <label>รายการเรียกเก็บเงิน</label>
      {medicationCandidates.length>0&&<div className="payment-invoice-prescription"><label htmlFor="payment-prescription">ใบสั่งยาที่ต้องการคิดเงิน</label><select id="payment-prescription" value={selectedTreatmentId} onChange={event=>setSelectedTreatmentId(event.target.value)}><option value="">ยังไม่เลือกใบสั่งยา</option>{medicationCandidates.map(candidate=><option key={candidate.treatmentRecordId} value={candidate.treatmentRecordId}>{dateTime(candidate.visitedAt)} · {candidate.items.map(item=>item.name).join(", ")}</option>)}</select></div>}
      {selectedMedication&&<div className="payment-invoice-lines"><strong className="payment-invoice-subheading">ค่ายาตามใบสั่งยา</strong>{selectedMedication.items.map((item,index)=><div className="payment-invoice-row" key={`${item.catalogItemId}-${index}`}><span><strong>{item.name}</strong><small>{item.strength} · {item.quantity} {item.unit} × {money(item.unitPriceSatang)}</small></span><strong>{money(item.lineTotalSatang)}</strong></div>)}</div>}
      <div className="payment-catalog-add"><select aria-label="เลือกค่าบริการมาตรฐาน" value={selectedServiceId} onChange={event=>setSelectedServiceId(event.target.value)}><option value="">เลือกค่าบริการจากบัญชีกลาง</option>{serviceCatalog.map(item=><option key={item.id} value={item.id}>{item.category} · {item.name} · {money(item.unitPriceSatang)}/{item.unit}</option>)}</select><input aria-label="จำนวนหน่วยบริการ" type="number" min="0.001" step="0.001" value={serviceQuantity} onChange={event=>setServiceQuantity(event.target.value)}/><button type="button" className="primary-button" onClick={addCatalogService} disabled={!selectedServiceId}>เพิ่มรายการ</button></div>
      {!serviceCatalog.length&&<small className="payment-catalog-empty">ยังไม่มีค่าบริการมาตรฐานในบัญชีกลาง กรุณาติดต่อเจ้าหน้าที่การเงินให้ตั้งค่าก่อน</small>}
      {items.length>0&&<div className="payment-invoice-lines"><strong className="payment-invoice-subheading">ค่าบริการ</strong>{items.map((item,index)=><div className="payment-invoice-row" key={`${item.catalogItemId}-${index}`}><span><strong>{item.description}</strong><small><input aria-label={`จำนวน ${item.description}`} type="number" min="0.001" step="0.001" value={item.quantity} onChange={event=>updateItem(index,event.target.value)}/> {item.unit} × {money(item.unitPriceSatang)}</small></span><strong>{money(Math.round(Number(item.amount)*100))}</strong><button type="button" className="secondary-button payment-remove-line" aria-label={`นำ ${item.description} ออกจากรายการ`} onClick={()=>setItems(current=>current.filter((_,itemIndex)=>itemIndex!==index))}>นำออก</button></div>)}</div>}
      <small className="payment-invoice-hint">ค่ายาที่อยู่ในใบสั่งคิดอัตโนมัติจากบัญชียา หากเลือกหมวด “ยา” เพิ่มด้านบน ให้ตรวจว่าไม่ใช่ยาตัวเดิมเพื่อป้องกันคิดซ้ำ</small>
    </div>
    <div className="payment-note full"><strong>ยอดรวมที่ระบบคำนวณ</strong><span>{money(amountSatang)}</span></div>
    <div className="field"><label>วิธีชำระเงิน</label><select name="method" value={method} onChange={event=>setMethod(event.target.value)}><option>เงินสด</option><option>โอนเงิน</option><option>สิทธิการรักษา</option></select></div>
    {method==="เงินสด"&&<><div className="field"><label>จำนวนเงินที่ได้รับ (บาท)</label><input name="receivedAmount" value={received} onChange={event=>setReceived(event.target.value)} type="number" min={amount.toFixed(2)} step="0.01" required/><small>จำนวนเงินที่ได้รับต้องไม่น้อยกว่ายอดรวม</small></div><div className={`cash-change ${change<0?"invalid":""}`}><span>เงินทอน<br/><small>เงินที่ได้รับ − ยอดรวม</small></span><strong>{money(Math.round(Math.max(0,change)*100))}</strong></div></>}
    {method==="สิทธิการรักษา"&&<div className="payment-note full"><strong>ใช้สิทธิการรักษา</strong><span>ระบบจะบันทึกรายการ ออกเลขใบเสร็จ และสร้างไฟล์ใบเสร็จให้อัตโนมัติ</span></div>}
    {method==="โอนเงิน"&&<div className="transfer-qr full">{qrPayload&&qr.payload===qrPayload?<Image unoptimized src={qr.url} width={180} height={180} alt={`QR Code ชำระเงิน ${amount.toFixed(2)} บาท`}/>:<div className="qr-placeholder">เลือกใบสั่งยาหรือเพิ่มค่าบริการเพื่อสร้าง QR</div>}<div><strong>QR ชำระเงินตามยอดรวม</strong><span>ยอดชำระ {amount>0?money(amountSatang):"–"}</span>{promptPayId?<small>สแกนชำระผ่านแอปธนาคาร แล้วแนบสลิปเพื่อยืนยัน</small>:<small className="form-error">ต้องกำหนด NEXT_PUBLIC_PROMPTPAY_ID เพื่อให้ QR ใช้ชำระผ่านธนาคารได้</small>}</div></div>}
    <div className="form-actions record-form-actions"><button type="submit" className="primary-button" disabled={saving||amount<=0||hasInvalidService||method==="โอนเงิน"&&!qrPayload}>{saving?"กำลังบันทึก...":method==="โอนเงิน"?"สร้างรายการและรอสลิป":"บันทึกและออกใบเสร็จ"}</button></div>
  </form>;
}
export function PaymentList({patientId,records,onChanged,onError,readOnly=false}:{patientId:string;records:PaymentItem[];onChanged:()=>Promise<void>;onError:(message:string)=>void;readOnly?:boolean}){
  const[uploading,setUploading]=useState<string|null>(null);
  const[reviewing,setReviewing]=useState<string|null>(null);
  const profile=getDemoSessionProfile();
  const [filter,setFilter]=useState("all");
  const visible=records.filter(item=>filter==="all" || (filter==="coverage" ? item.method==="สิทธิการรักษา" : item.status===filter));
  const filters=[["all","ทั้งหมด",records.length],["paid","ชำระแล้ว",records.filter(item=>item.status==="paid").length],["pending","รอหลักฐาน",records.filter(item=>item.status==="pending").length],["review","รอตรวจสลิป",records.filter(item=>item.status==="review").length],["rejected","ไม่ผ่านการตรวจ",records.filter(item=>item.status==="rejected").length],["coverage","ใช้สิทธิการรักษา",records.filter(item=>item.method==="สิทธิการรักษา").length]] as const;
  async function upload(paymentId:string,file:File|null){if(!file)return;setUploading(paymentId);onError("");const form=new FormData();form.set("slip",file);try{const response=await fetch(`/api/patients/${patientId}/payments/${paymentId}/slip`,{method:"POST",body:form});const result=await response.json();if(!response.ok)throw new Error(result.error||"อัปโหลดสลิปไม่สำเร็จ");await onChanged();}catch(reason){onError(reason instanceof Error?reason.message:"อัปโหลดสลิปไม่สำเร็จ");}finally{setUploading(null);}}
  async function review(paymentId:string,decision:"paid"|"rejected"){if(!profile)return;setReviewing(paymentId);onError("");try{const reviewNote=decision==="rejected"?window.prompt("ระบุเหตุผลที่หลักฐานไม่ผ่านการตรวจ","")||"หลักฐานการชำระเงินไม่ถูกต้อง":"";if(decision==="rejected"&&!reviewNote){setReviewing(null);return;}const response=await fetch(`/api/patients/${patientId}/payments/${paymentId}/slip`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({decision,reviewNote})});const result=await response.json();if(!response.ok)throw new Error(result.error||"บันทึกผลการตรวจสอบไม่สำเร็จ");await onChanged();window.dispatchEvent(new Event("ku-med:notifications-refresh"));}catch(reason){onError(reason instanceof Error?reason.message:"บันทึกผลการตรวจสอบไม่สำเร็จ");}finally{setReviewing(null);}}
  if(!records.length)return <div className="record-empty"><strong>ยังไม่มีข้อมูลการชำระเงิน</strong><span>กด “เพิ่มรายการ” เพื่อบันทึกการชำระเงิน</span></div>;
  return <><div className="appointment-filters payment-filters"><span>กรองสถานะ:</span>{filters.map(([value,label,count])=><button type="button" key={value} aria-pressed={filter===value} onClick={()=>setFilter(value)}>{label} ({count})</button>)}</div>{visible.length===0&&<div className="record-empty"><strong>ไม่พบรายการในสถานะนี้</strong><span>เลือกสถานะอื่นเพื่อดูรายการชำระเงิน</span></div>}<div className="payment-list">{visible.map(item=><article className="payment-card" key={item.id}><div className="payment-main"><div><PaymentDateBadge value={item.paidAt}/><h3>{item.description}</h3><p className="payment-paid-time">เวลา {paymentTime(item.paidAt)} น.</p><p>{item.receiptNumber||item.referenceCode} · {item.method}</p>{item.createdByName&&<small>บันทึกรายการโดย {item.createdByName}{item.createdByRole?` · ${item.createdByRole==="nurse"?"พยาบาล":item.createdByRole==="finance"?"เจ้าหน้าที่การเงิน":item.createdByRole}`:""}</small>}{item.method==="เงินสด"&&<small>ต้องชำระ {money(item.amountSatang)} · รับมา {money(item.receivedSatang||0)} · เงินทอน {money(item.changeSatang||0)}</small>}</div><div><strong>{money(item.amountSatang)}</strong><span className={`payment-status ${item.status}`}>{item.status==="paid"?"ชำระแล้ว":item.status==="review"?"รอตรวจสอบสลิป":item.status==="rejected"?"หลักฐานไม่ผ่าน":"รอหลักฐาน"}</span></div></div><div className="payment-actions">{!readOnly&&item.status==="paid"&&<ReceiptPrintButton patientId={patientId} paymentId={item.id}/>} {item.slipFileName&&<a className="secondary-button" href={`/api/patients/${patientId}/payments/${item.id}/slip`} target="_blank" rel="noreferrer">ดูสลิป</a>}{!readOnly&&item.status==="review"&&<><button type="button" className="secondary-button payment-reject" disabled={reviewing===item.id} onClick={()=>void review(item.id,"rejected")}>ไม่ผ่านการตรวจ</button><button type="button" className="primary-button" disabled={reviewing===item.id} onClick={()=>void review(item.id,"paid")}>{reviewing===item.id?"กำลังบันทึก...":"ยืนยันการชำระเงิน"}</button></>}{!readOnly&&(!item.slipFileName||item.status==="rejected")&&<label className="secondary-button slip-upload">{uploading===item.id?"กำลังอัปโหลด...":item.status==="rejected"?"＋ แนบสลิปใหม่":"＋ เพิ่มสลิป"}<input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" disabled={uploading===item.id} onChange={event=>upload(item.id,event.target.files?.[0]||null)}/></label>}</div></article>)}</div></>;
}
