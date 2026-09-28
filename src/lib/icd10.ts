export type Icd10Entry = { code: string; description: string };

// Common WHO ICD-10 diagnoses used in primary and outpatient care.
// Keep this catalog local so searching remains available without internet access.
export const ICD10_ENTRIES: Icd10Entry[] = [
  { code: "A09", description: "โรคกระเพาะและลำไส้อักเสบจากการติดเชื้อ ไม่ระบุสาเหตุ" },
  { code: "B34.9", description: "การติดเชื้อไวรัส ไม่ระบุตำแหน่ง" },
  { code: "E11.9", description: "เบาหวานชนิดที่ 2 ที่ไม่มีภาวะแทรกซ้อน" },
  { code: "E78.5", description: "ภาวะไขมันในเลือดสูง ไม่ระบุรายละเอียด" },
  { code: "I10", description: "ความดันโลหิตสูงปฐมภูมิ" },
  { code: "J00", description: "โรคหวัดเฉียบพลัน" },
  { code: "J02.9", description: "คออักเสบเฉียบพลัน ไม่ระบุรายละเอียด" },
  { code: "J06.9", description: "การติดเชื้อเฉียบพลันของทางเดินหายใจส่วนบน ไม่ระบุรายละเอียด" },
  { code: "J10.1", description: "ไข้หวัดใหญ่ที่ตรวจพบเชื้อไวรัสร่วมกับอาการทางระบบหายใจ" },
  { code: "J11.1", description: "ไข้หวัดใหญ่ที่ไม่ระบุเชื้อไวรัสร่วมกับอาการทางระบบหายใจ" },
  { code: "J30.9", description: "เยื่อจมูกอักเสบจากภูมิแพ้ ไม่ระบุรายละเอียด" },
  { code: "J45.9", description: "โรคหืด ไม่ระบุรายละเอียด" },
  { code: "K21.9", description: "โรคกรดไหลย้อนที่ไม่มีหลอดอาหารอักเสบ" },
  { code: "K29.7", description: "โรคกระเพาะอาหารอักเสบ ไม่ระบุรายละเอียด" },
  { code: "K30", description: "อาหารไม่ย่อยจากการทำงานผิดปกติ" },
  { code: "M54.5", description: "อาการปวดหลังส่วนล่าง" },
  { code: "R05", description: "อาการไอ" },
  { code: "R10.4", description: "อาการปวดท้องอื่นและไม่ระบุรายละเอียด" },
  { code: "R42", description: "อาการเวียนศีรษะและมึนงง" },
  { code: "R50.9", description: "ไข้ ไม่ระบุสาเหตุ" },
  { code: "R51", description: "อาการปวดศีรษะ" },
  { code: "S93.4", description: "ข้อเท้าแพลงและเอ็นข้อเท้าฉีก" },
  { code: "Z00.0", description: "การตรวจสุขภาพทั่วไปโดยไม่มีอาการผิดปกติ" },
  { code: "Z23", description: "การรับวัคซีนเพื่อป้องกันโรคติดเชื้อ" },
];
