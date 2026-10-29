"use client";

import { useEffect, useId, useState } from "react";
import { ICD10_ENTRIES, type Icd10Entry } from "@/lib/icd10";

export function Icd10Combobox({initialCode = "", initialDescription = ""}:{initialCode?:string;initialDescription?:string}) {
  const listId = useId();
  const [entries, setEntries] = useState<Icd10Entry[]>(ICD10_ENTRIES);
  const [code, setCode] = useState(initialCode);
  const [description, setDescription] = useState(initialDescription);
  useEffect(() => {
    let active = true;
    fetch("/api/icd10", { cache: "no-store" }).then(async response => {
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "โหลดรายการ ICD-10 ไม่สำเร็จ");
      if (active && Array.isArray(result.entries)) {
        setEntries(result.entries);
        const selected = result.entries.find((entry:Icd10Entry) => entry.code === initialCode);
        if (selected) setDescription(selected.description);
      }
    }).catch(() => {});
    return () => { active = false; };
  }, [initialCode]);

  function selectCode(value: string) {
    const normalized = value.trim().toUpperCase();
    setCode(normalized);
    const match = entries.find(entry => entry.code === normalized);
    setDescription(match?.description ?? "");
  }

  return <>
    <div className="field">
      <label htmlFor="diagnosis-code">รหัสวินิจฉัย ICD-10</label>
      <input id="diagnosis-code" name="diagnosisCode" list={listId} value={code} onChange={event => selectCode(event.target.value)} placeholder="พิมพ์รหัสหรือเลือกจากรายการ" autoComplete="off" />
      <datalist id={listId}>{entries.map(entry => <option key={entry.code} value={entry.code} label={entry.description} />)}</datalist>
      <small>ค้นหารหัสมาตรฐานในระบบ หากไม่พบรหัส ให้เว้นว่างแล้วกรอกชื่อการวินิจฉัยด้านข้าง</small>
    </div>
    <div className="field">
      <label htmlFor="diagnosis-name">ชื่อโรค / การวินิจฉัย</label>
      <input id="diagnosis-name" name="diagnosisName" value={description} onChange={event => setDescription(event.target.value)} placeholder="เลือก ICD-10 หรือกรอกชื่อการวินิจฉัย" maxLength={300} />
    </div>
  </>;
}
