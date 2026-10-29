# KU-MED

โครงสร้างโปรเจค Next.js App Router + TypeScript + Prisma ORM + PostgreSQL พร้อม Docker image และ Docker Compose

## สถานะงาน

- เตรียมโครงสร้างแอป, Prisma client, migration เริ่มต้น และ `GET /api/health`
- มี Dockerfile แบบ multi-stage และ Compose สำหรับแอป, migration และ PostgreSQL
- อ่าน Figma หน้าแรก `1:2` ได้แล้ว และแทนหน้า setup ด้วยเนื้อหา สี ฟอนต์ Prompt/Sarabun/Inter และ layout ตามแบบ พร้อม responsive CSS, เมนูย่อ–ขยาย และแผงข่าวสาร
- Figma MCP อ่าน metadata ของทุกเฟรมหลักได้ แต่ design context และ asset exports ยังติดโควตา Starter ภาพต้นฉบับจึงแสดงช่องรอไฟล์ และไอคอนที่ขาดใช้สัญลักษณ์ข้อความชั่วคราว
- หน้า `/login` เป็น frontend demo ที่เข้าสู่หน้าหลักได้ด้วย `demo` / `demo1234` และเลือกตำแหน่ง `ผู้ดูแลระบบ` เปิดหน้าแรกโดยยังไม่เข้าสู่ระบบจะไปหน้า login อัตโนมัติ ปุ่มออกจากระบบจะล้าง demo session และกลับหน้า login
- หลังเข้าสู่ระบบด้วยบัญชีที่อนุมัติ ระบบออก server session แบบ signed, HttpOnly cookie และตรวจ role/สถานะบัญชีก่อนเรียก API ทุกครั้ง; ข้อมูลโปรไฟล์ใน `sessionStorage` ใช้แสดงผลหน้าเว็บเท่านั้น ไม่ใช่หลักฐานสิทธิ์; KU All-Login ยังไม่เชื่อมต่อ
- หน้า `/dashboard` และ `/reports` สรุปข้อมูลจาก PostgreSQL พร้อมตัวกรองและกราฟ
- หน้า `/registration`, `/evaluation` และ `/settings` บันทึกข้อมูลผ่าน API ลง PostgreSQL ส่วน `/search` ค้นเวชระเบียนและเปิด `/patients/[id]` เพื่อดูข้อมูลทั่วไป ประวัติการรักษา นัดหมาย และการชำระเงินเฉพาะบุคคล `/reports` ยังเป็นข้อมูลตัวอย่าง
- Prisma schema มี `Patient`, `TreatmentRecord`, `Appointment`, `Payment`, `Evaluation` และ `UserSettings` พร้อม relations, migrations และข้อกำหนดป้องกันข้อมูลผู้รับบริการซ้ำ
- รายละเอียดงานค้างและไฟล์ภาพที่ต้องมีอยู่ใน `DESIGN_STATUS.md`

ต้นฉบับ: https://www.figma.com/design/8hF0A06GvPJzUeQcNydWgy/Untitled?node-id=0-1&p=f&t=3q5grE6uoqsZUsfH-0

## รันทุกบริการด้วย Docker

ต้องมี Docker Desktop ที่เปิด Linux containers และ Docker Compose v2

```powershell
Copy-Item .env.example .env
docker compose up --build -d
docker compose ps
```

เปิด http://localhost:3000 และตรวจฐานข้อมูลที่ http://localhost:3000/api/health

Compose รอ PostgreSQL healthy → รัน `prisma migrate deploy` สำเร็จ → เริ่มแอป โดยสร้าง image `ku-med:local` และ `ku-med-migrate:local` ฐานข้อมูลใช้ image `postgres:17-bookworm` และเก็บข้อมูลใน named volume

```powershell
docker compose logs app migrate db
docker compose down
```

คำสั่ง `down` ปกติไม่ลบข้อมูลใน volume

## พัฒนาในเครื่อง

ใช้ Node.js 24 LTS และเปิด PostgreSQL ผ่าน Docker

```powershell
Copy-Item .env.example .env
npm ci
docker compose up -d db
npm run db:generate
npm run db:deploy
npm run dev
```

เมื่อแก้ schema ใช้ `npm run db:migrate -- --name describe_change` เพื่อสร้าง migration ใหม่ แล้ว commit ทั้ง schema และ migration

```powershell
npm run lint
npm run typecheck
npm run build
npm start
```

`typecheck` ต้องรันหลัง `db:generate` หรือ `build` เพื่อสร้าง Prisma types

## Environment

ดูตัวอย่างใน `.env.example` ห้าม commit `.env` จริง ค่าเริ่มต้นเป็นรหัสผ่านสำหรับ local development เท่านั้น

- `DATABASE_URL`: URL สำหรับรัน Next.js/Prisma ในเครื่อง
- `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`: ค่า PostgreSQL ที่ Compose ใช้
- `POSTGRES_PORT`: พอร์ตฐานข้อมูลบนเครื่อง (ค่าเริ่มต้น 5432)
- `APP_PORT`: พอร์ตแอปบนเครื่อง (ค่าเริ่มต้น 3000)
- `NEXT_PUBLIC_PROMPTPAY_ID`: เบอร์โทร 10 หลัก หรือเลขพร้อมเพย์/ผู้เสียภาษี 13 หลักของสถานพยาบาล ใช้สร้าง QR ที่ล็อกยอดเงิน ต้องกำหนดก่อน `docker compose up --build`
- `STUDENT_LOOKUP_API_URL`: PATH ฝั่งเซิร์ฟเวอร์สำหรับค้นหาข้อมูลนิสิต ใส่ `{studentId}` ในตำแหน่งรหัส เช่น `https://student-api.example.ac.th/students/{studentId}`
- `STUDENT_LOOKUP_API_TOKEN`: Bearer token ของ API (เว้นว่างได้ถ้าไม่ใช้)
- `CITIZEN_CARD_READER_MODE`: ใช้ `local` เพื่ออ่านบัตรจริงจากคอมพิวเตอร์ที่เสียบเครื่องอ่าน หรือ `mock` สำหรับข้อมูลบัตรจำลอง
- `CITIZEN_CARD_READER_ALLOWED_ORIGINS`: allowlist origin ของเว็บที่เรียก local bridge ใช้บนคอมพิวเตอร์หน้าเคาน์เตอร์เท่านั้น
- `STUDENT_LOOKUP_MOCK`: ตั้งเป็น `true` เพื่อใช้ข้อมูลนิสิตจำลองระหว่างรออนุญาตเชื่อม API
- `KU_ALLLOGIN_URL`: URL ฝั่งเซิร์ฟเวอร์สำหรับเริ่ม KU All-Login เมื่อได้รับจากผู้ดูแลระบบ ให้ใส่ใน `.env` โดยไม่ใช้ชื่อขึ้นต้นด้วย `NEXT_PUBLIC_`

## ระบบบัญชีผู้ปฏิบัติงาน

หน้าเข้าสู่ระบบแบ่งเป็น 2 ช่องทาง บุคลากรมหาวิทยาลัยใช้ปุ่ม KU All-Login ซึ่งจะพร้อมทำงานเมื่อกำหนด `KU_ALLLOGIN_URL` ส่วนแพทย์ภายนอกส่งคำขอลงทะเบียนด้วยข้อมูลติดต่อ หน่วยงาน เลขใบอนุญาต Username และ Password จากหน้าเดียวกัน Password ถูกแฮชด้วย scrypt ก่อนบันทึก บัญชีใหม่ต้องยืนยันอีเมลและผ่านการอนุมัติจากผู้ดูแลระบบก่อนเข้าสู่ระบบได้

สำหรับการสาธิต กำหนด `AUTH_EMAIL_MOCK=true` เพื่อแสดง OTP ยืนยันอีเมลบนหน้าจอ เมื่อใช้งานจริงต้องตั้งเป็น `false` และเชื่อมบริการส่งอีเมลฝั่งเซิร์ฟเวอร์ ผู้ดูแลระบบตรวจคำขอได้ที่ `/admin/accounts` โดยสามารถอนุมัติ ส่งกลับแก้ไข ปฏิเสธ ระงับ กำหนดบทบาทและช่วงเวลาการใช้งาน ระบบบันทึกประวัติการดำเนินการไว้ใน `AccountAuditLog` เมื่อเปิดส่งอีเมลจริง ระบบตรวจบัญชีที่สิทธิ์จะหมดอายุวันถัดไปตามเวลาไทยทุกชั่วโมง และส่งอีเมลเตือนหนึ่งครั้งต่อวันหมดอายุ โดยใช้ที่อยู่อีเมลในบัญชีหรือการตั้งค่าของผู้ใช้

หากต้องการทดสอบด้วย Gmail ของตนเอง ให้เปิดการยืนยันแบบสองขั้นตอนในบัญชี Google แล้วสร้าง App Password สำหรับแอป จากนั้นใส่ค่าต่อไปนี้ใน `.env` โดยห้าม commit ไฟล์หรือ App Password ขึ้น Git:

```env
AUTH_EMAIL_MOCK=false
APP_BASE_URL=http://localhost:3000
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-address@gmail.com
SMTP_PASSWORD=your-16-character-app-password
EMAIL_FROM="KU-MED <your-address@gmail.com>"
SUPPORT_NAME=งานบริการผู้ใช้งาน สถานพยาบาลมหาวิทยาลัยเกษตรศาสตร์ วิทยาเขตกำแพงแสน
SUPPORT_PHONE=034-351611
SUPPORT_EMAIL=อีเมลสำหรับติดต่อเจ้าหน้าที่
SUPPORT_HOURS=วันจันทร์–ศุกร์ เวลา 08:30–16:30 น. (ยกเว้นวันหยุดราชการ)
```

เมื่อสมัครบัญชี ระบบจะส่ง OTP 6 หลักซึ่งหมดอายุใน 15 นาทีไปยังอีเมลที่กรอก และจะไม่แสดง OTP บนหน้าจอ ระบบส่งอีเมลทุกครั้งที่สถานะเปลี่ยน ได้แก่ ยืนยันอีเมลและรอตรวจสอบ ส่งกลับแก้ไข อนุมัติหรือเปิดใช้งานอีกครั้ง ปฏิเสธ ระงับ และสิทธิ์หมดอายุ โดยแนบหมายเหตุของผู้ดูแลระบบไปยังอีเมลเดียวกัน หากส่งอีเมลผลพิจารณาไม่สำเร็จ การเปลี่ยนสถานะยังถูกบันทึก และหน้า Admin จะแจ้งให้ตรวจสอบ SMTP

อีเมลแต่ละสถานะใช้สีที่ต่างกันเพื่อให้แยกผลการพิจารณาได้ชัดเจน กรณีปฏิเสธคำขอหรือระงับบัญชีจะแสดงข้อมูลจาก `SUPPORT_NAME`, `SUPPORT_PHONE`, `SUPPORT_EMAIL` และ `SUPPORT_HOURS` เพื่อให้ผู้สมัครติดต่อสอบถามหรือขอทบทวนได้

สิทธิ์เมนูรวมศูนย์ไว้ที่ `src/lib/access-control.ts` และ API ถูกตรวจสิทธิ์ตามบทบาทใน `src/proxy.ts` รวมถึงตรวจสถานะบัญชี ช่วงเวลาการใช้งาน และวันหมดอายุใบอนุญาตก่อนดำเนินการ การทดสอบผ่านอินเทอร์เน็ตนี้ยังไม่ใช่ระบบพร้อมใช้งานจริงทางคลินิก ต้องใช้ข้อมูลจำลองเท่านั้นจนกว่าจะตรวจ hardening ด้านอื่นและเชื่อม KU All-Login ให้เสร็จ

การออก server session ต้องกำหนด `SESSION_SECRET` เป็นค่าสุ่มลับที่ยาวอย่างน้อย 32 ตัวอักษร เช่นสร้างด้วย `openssl rand -base64 48` ห้ามใช้ค่าตัวอย่างหรือ commit ค่านี้ลง Git

### บัญชีสำหรับทดสอบแยกตามบทบาท

หลัง deploy และตั้ง `SESSION_SECRET` แล้ว สร้างบัญชีทดสอบ 6 บทบาท (เวชระเบียน, แพทย์, พยาบาล, เภสัชกร, การเงิน และผู้บริหาร) ได้ด้วยคำสั่งนี้บน VPS บัญชีที่มีชื่อผู้ใช้อยู่แล้วจะถูกข้ามโดยไม่เปลี่ยนรหัสผ่านหรือสถานะเดิม รหัสผ่านของบัญชีที่สร้างใหม่จะสุ่มแยกกันและแสดงใน terminal เพียงครั้งเดียว:

```bash
cd /opt/ku-med
docker compose build migrate
docker compose run --rm --entrypoint node migrate scripts/bootstrap-test-roles.mjs
```

บัญชีผู้ดูแลระบบใช้ `ADMIN_USERNAME` และ `ADMIN_PASSWORD` ที่ตั้งไว้ใน `.env` อยู่แล้ว อย่าส่งรหัสผ่านไว้ในแชตกลุ่มหรือใช้บัญชีทดสอบเหล่านี้กับข้อมูลจริง

เมื่อได้รับรายละเอียด KU All-Login ให้ใส่ URL ใน `.env`:

```env
KU_ALLLOGIN_URL=https://path-จริงที่ได้รับจากมหาวิทยาลัย
```

จากนั้น build container ใหม่ หากระบบจริงใช้ OAuth/OIDC และมี callback, client ID, client secret หรือรูปแบบข้อมูลผู้ใช้เพิ่มเติม ต้องนำเอกสารดังกล่าวมาเชื่อมใน `/api/auth/ku` ก่อนใช้งานจริง

## เชื่อมต่อ API ข้อมูลนิสิต

ใส่ PATH และ token ในไฟล์ `.env` ที่ root ของโปรเจกต์เท่านั้น ห้ามใช้ชื่อขึ้นต้นด้วย `NEXT_PUBLIC_` และห้าม commit ไฟล์ `.env`

```env
STUDENT_LOOKUP_API_URL=https://student-api.example.ac.th/students/{studentId}
STUDENT_LOOKUP_API_TOKEN=
```

API ต้นทางรองรับทั้ง JSON object ทั่วไปและโครงสร้าง `data.student[]` โดยใช้ `code` เป็นรหัสนิสิต และอ่านชื่อจากรายการล่าสุดใน `name_history` (`prefix_th`, `firstname_th`, `lastname_th`) นอกจากนี้ยังรองรับ field หลัก เช่น `studentId`, `citizenId`, `birthDate`, `gender`, `faculty`, `major`, `studyYear`, `phone`, `email`, `homeAddress` และ `currentAddress` รวมถึงรูปแบบ snake_case และ object ที่ซ้อนกัน วันเกิดรองรับ `YYYY-MM-DD`, `DD/MM/YYYY` และปี พ.ศ.

KU-MED เรียก API ต้นทางจาก route ฝั่ง server `/api/student-lookup/[studentId]` พร้อม `cache: no-store` และไม่บันทึกข้อมูลลงฐานข้อมูลจนกว่าผู้ใช้ตรวจสอบแล้วกด “บันทึกข้อมูล”

สำหรับการนำเสนอที่ยังไม่มี API จริง ให้ตั้งค่าเพียง:

```env
STUDENT_LOOKUP_MOCK=true
STUDENT_LOOKUP_API_URL=
STUDENT_LOOKUP_API_TOKEN=
```

ข้อมูลจำลองจะสร้างจากรหัสนิสิตที่กรอกในรูปแบบเดียวกับ `data.student[]` และ `name_history` จึงสามารถเปลี่ยนไปใช้ API จริงภายหลังได้โดยตั้ง `STUDENT_LOOKUP_MOCK=false` และใส่ URL โดยไม่ต้องแก้หน้าแบบฟอร์ม

## เครื่องอ่านบัตรประชาชน

เครื่องอ่าน Zoweetex ZW-12026-3 ต้องเสียบ USB กับคอมพิวเตอร์ที่เปิดหน้า KU-MED อยู่ เพราะ USB บนเครื่องผู้ใช้ไม่สามารถถูกอ่านจาก VPS ได้ ให้ติดตั้งไดรเวอร์ของเครื่องอ่านและตรวจว่า Windows มองเห็นอุปกรณ์ จากนั้นเปิด PowerShell บนคอมพิวเตอร์เครื่องนั้นที่โฟลเดอร์โปรเจกต์:

    Set-ExecutionPolicy -Scope Process Bypass
    .\Start-CardReader.ps1

เปิดหน้าต่าง PowerShell ค้างไว้ระหว่างใช้งาน Local bridge จะรับการเชื่อมต่อเฉพาะจาก loopback และ origin ที่กำหนดใน CITIZEN_CARD_READER_ALLOWED_ORIGINS โดยค่าเริ่มต้นอนุญาต https://ku-med-test.tech และ localhost สำหรับการพัฒนา ไม่ต้องเผยแพร่ token ในเว็บหรือส่งข้อมูลบัตรไปให้ VPS เพื่ออ่าน USB

ตั้งค่าใน .env ของระบบให้ CITIZEN_CARD_READER_MODE=local ส่วนการค้นข้อมูลนิสิตคง STUDENT_LOOKUP_MOCK=true ไว้ ระบบอ่านข้อมูลจากบัตรจริงเพื่อกรอกแบบฟอร์ม แต่ข้อมูลนิสิตยังเป็นข้อมูลจำลอง ทั้งสองส่วนไม่ใช่แหล่งข้อมูลเดียวกัน

เมื่อกดอ่านบัตร ระบบจะเติมข้อมูลลงแบบฟอร์มให้ตรวจทานก่อนบันทึก ไม่สร้างเวชระเบียนอัตโนมัติ หากขึ้นว่าเชื่อมต่อโปรแกรมอ่านบัตรไม่ได้ ให้เปิด Start-CardReader.ps1 บนเครื่องที่เสียบ USB; หากไม่พบ reader ให้ตรวจไดรเวอร์และบริการ SCardSvr; หากพบ reader แต่ไม่มีบัตร ให้ใส่บัตรและลองอีกครั้ง

Compose สร้าง `DATABASE_URL` ของ containers โดยใช้ hostname `db` หากเปลี่ยนค่าฐานข้อมูลให้ปรับ `DATABASE_URL` ใน `.env` สำหรับการพัฒนาในเครื่องด้วย ใช้รหัสผ่านที่ปลอดภัยต่อ URL หรือปรับ URL ให้ percent-encode อย่างถูกต้อง

บริการผูกพอร์ตกับ `127.0.0.1` สำหรับการพัฒนาในเครื่อง แอปยังไม่มีระบบยืนยันตัวตนหรือฟังก์ชันธุรกิจ จึงยังไม่ใช่ระบบพร้อมใช้งานจริง

## โครงสร้าง

```text
src/app/                 หน้าเว็บและ API routes
src/app/api/             health, patients, evaluations และ settings
src/lib/db.ts            Prisma client ฝั่ง server
src/generated/prisma/   สร้างโดย prisma generate (ไม่ commit)
prisma/schema.prisma    โมเดลข้อมูลระบบและเวชระเบียน
prisma/migrations/      SQL migrations
prisma.config.ts        ตั้งค่า Prisma CLI
Dockerfile              build, migration และ runtime stages
compose.yaml            app + migrate + db
```

## อ้างอิงการตั้งค่า

- Next.js standalone deployment: https://nextjs.org/docs/app/getting-started/deploying
- Prisma PostgreSQL adapter: https://www.prisma.io/docs/orm/v7/core-concepts/supported-databases/postgresql

## งานที่ต้องทำต่อเมื่อโควตาและ assets พร้อม

1. อ่าน design context ของแต่ละเฟรมเพื่อปรับระยะ สี และองค์ประกอบให้ตรงระดับ pixel
2. ดาวน์โหลด assets ต้นฉบับลง `public/figma` และ build ใหม่ จากนั้นเทียบภาพทุกตำแหน่ง
3. กำหนด domain models, validation และ API ตาม flow จริง
4. ทดสอบ integration กับ PostgreSQL และ Docker containers
# การเชื่อมผลประเมินจาก Google Forms

ผู้ดูแลระบบตั้งค่าได้ที่ **การประเมิน → ผลประเมินการให้บริการ** โดยไม่ต้องสร้าง Google Cloud หรือ Service Account

1. ใน Google Form เปิดแท็บ **คำตอบ** แล้วกดไอคอนสีเขียวเพื่อสร้างหรือเลือก Google Sheets ที่เก็บคำตอบ
2. ใน Google Sheets กด **แชร์ → การเข้าถึงทั่วไป → ทุกคนที่มีลิงก์ → ผู้มีสิทธิ์ดู**
3. คัดลอกลิงก์ Google Form และ Google Sheets ไปวางในหน้าตั้งค่าของระบบ
4. เลือกว่าคอลัมน์ใดคือจุดบริการ คะแนนโดยรวม คะแนนเจ้าหน้าที่ ความรวดเร็ว และข้อเสนอแนะ
5. กด **บันทึกการจับคู่** และ **ซิงก์ผลประเมินล่าสุด**

ระบบจะตรวจหัวตารางก่อนซิงก์ทุกครั้ง การเพิ่มหรือสลับคอลัมน์ไม่ทำให้การจับคู่เดิมเสีย หากเปลี่ยนชื่อหรือลบคอลัมน์ ระบบจะแสดงให้ผู้ดูแลจับคู่ใหม่และยังเก็บข้อมูลเดิมไว้
