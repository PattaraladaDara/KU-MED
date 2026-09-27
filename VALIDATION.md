# ผลตรวจสอบ — 2026-09-26

## Patient profile — 2026-09-28

- เพิ่ม `/patients/[id]` พร้อมแท็บข้อมูลทั่วไป ประวัติการรักษา การนัดหมาย และการชำระเงิน
- เพิ่ม API อ่านข้อมูลเฉพาะบุคคลและบันทึกรายการในแต่ละแท็บ
- เพิ่ม `Appointment` และ `Payment` relations พร้อม migration ซึ่ง deploy กับ PostgreSQL ที่ `localhost:5433` สำเร็จ
- ตรวจ API พบผู้รับบริการ 1 ราย และแยก collections ของ treatment/appointment/payment ถูกต้อง
- `prisma validate`, lint, typecheck และ production build ผ่าน

## Database persistence — 2026-09-27

- เพิ่ม Prisma models และ migration สำหรับผู้รับบริการ ประวัติการรักษา แบบประเมิน และการตั้งค่าผู้ใช้
- เพิ่ม `GET/POST /api/patients`, `POST /api/evaluations` และ `GET/PUT /api/settings`
- ทดสอบ server-side validation ของ patients/evaluations ได้ HTTP 400 ตามคาด
- `npx prisma validate`, `npm run lint`, `npm run typecheck` และ `npm run build` ผ่าน
- Docker Engine ไม่ได้ทำงานในเครื่อง จึงยังรัน migration และทดสอบการเขียน/อ่านกับ PostgreSQL จริงไม่ได้; API health ตอบ 503 ตามที่ออกแบบเมื่อฐานข้อมูลไม่พร้อม

## Clinical module frontend — 2026-09-27

- เพิ่ม `/search`, `/registration`, `/reports`, `/evaluation` และ `/settings` จากเฟรมหลักใน Figma metadata
- ตรวจหน้า `/reports` ที่ desktop: layout ตัวกรองและการ์ดรายงาน 3 ใบแสดงครบ เมนู active ถูกต้อง
- ตรวจหน้า `/evaluation` ที่ mobile 390 × 844 และปรับเมนูมือถือเป็น grid เพื่อตัด horizontal overflow
- ปุ่มและฟอร์มแสดงสถานะสำเร็จใน browser โดยระบุชัดว่าไม่บันทึกข้อมูล
- `npm run lint`, `npm run typecheck` และ `npm run build` ผ่าน

## Dashboard frontend

- Production build (รวม TypeScript) และ lint ผ่าน
- ค่าเริ่มต้น: 12,387 คน / 15 นาที / 28 นาที / 96.8%, กราฟ 10 แท่ง (5 คู่)
- เปลี่ยนเดือนเป็นพฤษภาคม → 11,427 คน / 16 นาที / 30 นาที / 96.2%
- เลือกแผนกพบแพทย์ → กราฟเหลือ 2 แท่ง และ KPI เปลี่ยนตาม fixture
- ปุ่มรีเฟรชอัปเดตเวลาและข้อความสถานะข้อมูลตัวอย่าง
- ตรวจ desktop 1440px และ mobile 390px; ไม่มี page overflow แนวนอน
- กราฟและค่ารายชั่วโมงเป็นข้อมูลตัวอย่างทั้งหมด ไม่มีการเชื่อม backend
- ยังขาด exported icons ของ Figma จึงไม่อ้างว่า visual/assets ตรงทั้งหมด

## Login frontend

- Production build (รวม TypeScript) และ lint ผ่านหลังเพิ่ม `/login`
- เปิด `/` โดยไม่มี demo session → เปลี่ยนไป `/login`
- ส่งฟอร์มว่าง → แจ้งกรอกชื่อผู้ใช้; ไม่เลือกตำแหน่ง → แจ้งเลือกตำแหน่ง
- บัญชีผิด → แสดง error และไม่เข้าหน้าหลัก
- ปุ่มแสดงรหัสผ่าน → input เปลี่ยนเป็น `text`
- `demo` / `demo1234` + ผู้ดูแลระบบ → เข้าหน้าหลัก `/`
- รีเฟรชหน้าหลัก → demo session ยังอยู่ในแท็บเดิม
- ออกจากระบบ → กลับ `/login`
- KU All-Login → แสดงสถานะยังไม่เชื่อมต่อ
- ตรวจมือถือ 390px: ไม่มี overflow แนวนอนของหน้า
- ยังไม่ใช่ระบบ authentication จริง และยังไม่มีภาพพื้นหลัง/ตรามหาวิทยาลัย/ไอคอนต้นฉบับของหน้า login จึงยังไม่ผ่าน visual acceptance แบบครบถ้วน

## Project checks

- `npm install`: สำเร็จ และมี `package-lock.json`
- เวอร์ชันที่ติดตั้ง: Next.js 16.3.6, React 19.3.0, Prisma 7.10.0
- `npm run build`: ผ่าน รวม Prisma generate และ Next.js TypeScript checking
- `npm run typecheck`: ผ่าน
- `npm run lint`: ผ่าน
- Docker Compose `config --quiet`: ผ่าน
- หน้าแรก: HTTP 200
- `GET /api/health` เมื่อฐานข้อมูลไม่พร้อม: HTTP 503 พร้อม `database: not_ready`

## ข้อจำกัดที่ยังตรวจไม่ได้

- ยัง build/run Docker image และทดสอบ migration กับ PostgreSQL จริงไม่ได้ เพราะไม่มี Docker Engine ที่เชื่อมต่อได้ในเครื่องนี้
- อ่าน design context และ screenshot หน้าแรก `1:2` ได้แล้ว ตรวจ layout บน browser ที่ desktop 1440px และ mobile 390px; mobile ไม่มี page overflow แนวนอน (เมนูเลื่อนแนวนอนได้)
- ทดสอบแผงข่าวสารเปิด/ปิดด้วย Escape และเมนูย่อ/ขยายผ่าน browser แล้ว
- หน้าแรกยังขาด assets ต้นฉบับทั้งหมด จึง **ยังไม่ผ่าน visual acceptance**; อ่าน design context ของหน้าที่เหลือไม่ได้เพราะ Figma Starter MCP quota หมด ดู `DESIGN_STATUS.md`
- `npm audit` รายงาน 4 high severity dependency entries ในสาย dependency ของ Prisma CLI (`prisma`, `@prisma/config`, `deepmerge-ts`, `mysql2`) การแก้อัตโนมัติที่ npm เสนอเป็นการ downgrade ข้าม major จึงไม่ได้ใช้ `--force` โปรเจคนี้ใช้ PostgreSQL และไม่มี MySQL flow แต่ยังไม่ถือว่าปิดประเด็น dependency audit แล้ว
