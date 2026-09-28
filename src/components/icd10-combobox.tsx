"use client";

import { useId, useState } from "react";
import { ICD10_ENTRIES } from "@/lib/icd10";

export function Icd10Combobox() {
  const listId = useId();
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");

  function selectCode(value: string) {
    const normalized = value.trim().toUpperCase();
    setCode(normalized);
    const match = ICD10_ENTRIES.find((entry) => entry.code === normalized);
    setDescription(match?.description ?? "");
  }

  return <>
    <div className="field">
      <label htmlFor="diagnosis-code">รหัสวินิจฉัย ICD-10</label>
      <input
        id="diagnosis-code"
        name="diagnosisCode"
        list={listId}
        value={code}
        onChange={(event) => selectCode(event.target.value)}
        placeholder="พิมพ์รหัสหรือเลือกจากรายการ"
        autoComplete="off"
      />
      <datalist id={listId}>
        {ICD10_ENTRIES.map((entry) => <option key={entry.code} value={entry.code}>{entry.description}</option>)}
      </datalist>
      <small>ค้นหาและเลือกจากรหัส ICD-10 ที่มีในระบบ</small>
    </div>
    <div className="field">
      <label htmlFor="diagnosis-name">ชื่อโรค / การวินิจฉัย</label>
      <input id="diagnosis-name" name="diagnosisName" value={description} readOnly placeholder="จะแสดงอัตโนมัติเมื่อเลือกรหัส" />
    </div>
  </>;
}
