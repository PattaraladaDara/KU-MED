import { maskCitizenId, maskPhone } from "@/lib/privacy";

export function SensitiveValue({value,kind}:{value:string;kind:"citizen"|"phone"}){const masked=kind==="citizen"?maskCitizenId(value):maskPhone(value);return <><span className="sensitive-screen" aria-label={`${kind==="citizen"?"เลขประจำตัวประชาชน":"หมายเลขโทรศัพท์"}ที่ปกปิดบางส่วน`}>{masked}</span><span className="sensitive-print">{value}</span></>}
