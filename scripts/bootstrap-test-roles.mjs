import "dotenv/config";
import pg from "pg";
import { randomBytes, scrypt as scryptCallback } from "node:crypto";
import { promisify } from "node:util";

const password = process.env.TEST_ACCOUNTS_PASSWORD;
if (!password || password.length < 12) throw new Error("TEST_ACCOUNTS_PASSWORD must contain at least 12 characters.");

const accounts = [
  { username: "records", firstName: "เจ้าหน้าที่", lastName: "เวชระเบียน", role: "staff", employeeCode: "TEST-RECORDS-001" },
  { username: "nurse", firstName: "พยาบาล", lastName: "คัดกรอง", role: "nurse", employeeCode: "TEST-NURSE-001" },
  { username: "pharmacist", firstName: "เภสัชกร", lastName: "ทดสอบระบบ", role: "pharmacist", employeeCode: "TEST-PHARMACY-001" },
  { username: "finance", firstName: "เจ้าหน้าที่", lastName: "การเงิน", role: "finance", employeeCode: "TEST-FINANCE-001" },
  { username: "executive", firstName: "ผู้บริหาร", lastName: "สถานพยาบาล", role: "executive", employeeCode: "TEST-EXECUTIVE-001" },
];

const scrypt = promisify(scryptCallback);
const salt = randomBytes(16).toString("hex");
const derived = await scrypt(password, salt, 64);
const passwordHash = `scrypt$${salt}$${Buffer.from(derived).toString("hex")}`;
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });

await client.connect();
try {
  for (const account of accounts) {
    await client.query(
      `INSERT INTO "StaffAccount"
        ("id","username","passwordHash","firstName","lastName","role","medicalLicense","authProvider","active","applicationStatus","emailVerifiedAt","reviewedAt","reviewedBy","reviewNote","createdAt","updatedAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,'local',true,'approved',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,'demo-admin','บัญชีทดสอบที่สร้างโดยระบบ',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
       ON CONFLICT ("username") DO UPDATE SET
         "passwordHash"=EXCLUDED."passwordHash", "firstName"=EXCLUDED."firstName", "lastName"=EXCLUDED."lastName",
         "role"=EXCLUDED."role", "active"=true, "applicationStatus"='approved', "reviewedAt"=CURRENT_TIMESTAMP,
         "reviewedBy"='demo-admin', "reviewNote"='บัญชีทดสอบที่สร้างโดยระบบ', "updatedAt"=CURRENT_TIMESTAMP`,
      [`test-${account.role}`, account.username, passwordHash, account.firstName, account.lastName, account.role, account.employeeCode],
    );
  }
  console.log(`Test accounts ready: ${accounts.map(account => account.username).join(", ")}`);
} finally {
  await client.end();
}
