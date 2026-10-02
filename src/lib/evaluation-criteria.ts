export const commonCriteria = [
  ["responsibility", "ความรับผิดชอบและตรงต่อเวลา"], ["teamwork", "การประสานงานและทำงานเป็นทีม"],
  ["communication", "การสื่อสารที่ชัดเจนและสุภาพ"], ["privacy", "การรักษาความลับและข้อมูลส่วนบุคคล"],
  ["digital", "การใช้ระบบ KU-MED และบันทึกข้อมูลอย่างถูกต้อง"], ["development", "การเรียนรู้และพัฒนาวิธีทำงานอย่างต่อเนื่อง"],
] as const;

export const doctorCriteria = [
  ["clinicalStandard", "การตรวจวินิจฉัยและรักษาตามมาตรฐานวิชาชีพ"], ["patientSafety", "การคำนึงถึงความปลอดภัยของผู้ป่วย"],
  ["medicalRecord", "ความครบถ้วนและทันเวลาของเวชระเบียน"], ["clinicalCommunication", "การอธิบายโรค การรักษา และคำแนะนำอย่างเข้าใจง่าย"],
  ["referral", "การส่งต่อและติดตามผลอย่างเหมาะสม"], ["professionalism", "จริยธรรมและความเป็นมืออาชีพ"],
] as const;

export const staffCriteria = [
  ["serviceAccuracy", "ความถูกต้องของงานและข้อมูลบริการ"], ["queueManagement", "การบริหารคิวและระยะเวลารอ"],
  ["coordination", "การประสานงานกับแพทย์และจุดบริการอื่น"], ["problemSolving", "การแก้ไขปัญหาเฉพาะหน้า"],
  ["procedure", "การปฏิบัติตามขั้นตอนและระเบียบขององค์กร"], ["serviceMind", "ความใส่ใจและพร้อมให้ความช่วยเหลือ"],
] as const;
