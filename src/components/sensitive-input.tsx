"use client";

import { useState } from "react";

export function SensitiveInput({id,name,defaultValue="",kind,required=false}:{id?:string;name:string;defaultValue?:string;kind:"citizen"|"phone";required?:boolean}){
  const[visible,setVisible]=useState(false);const label=kind==="citizen"?"เลขประจำตัวประชาชน":"หมายเลขโทรศัพท์";
  return <div className="sensitive-input"><input id={id} name={name} type={visible?"text":"password"} defaultValue={defaultValue} inputMode={kind==="citizen"?"numeric":"tel"} pattern={kind==="citizen"?"[0-9-]{13,17}":undefined} autoComplete="off" required={required}/><button type="button" aria-label={visible?`ซ่อน${label}`:`แสดง${label}`} aria-pressed={visible} onClick={()=>setVisible(value=>!value)}>{visible?"ซ่อน":"แสดง"}</button></div>;
}
