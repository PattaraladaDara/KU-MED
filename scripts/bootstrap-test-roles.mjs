import "dotenv/config";
import pg from "pg";
import { randomBytes, scrypt as scryptCallback } from "node:crypto";
import { promisify } from "node:util";

const accounts = [
  { username: "records", firstName: "เจ้าหน้าที่", lastName: "เวชระเบียน", role: "staff", license: "TEST-RECORDS-001" },
  { username: "doctor", firstName: "แพทย์", lastName: "ทดสอบระบบ", role: "doctor", license: "TEST-DOCTOR-001" },
  { username: "nurse", firstName: "พยาบาล", lastName: "คัดกรอง", role: "nurse", license: "TEST-NURSE-001" },
  { username: "pharmacist", firstName: "เภสัชกร", lastName: "ทดสอบระบบ", role: "pharmacist", license: "TEST-PHARMACY-001" },
  { username: "finance", firstName: "เจ้าหน้าที่", lastName: "การเงิน", role: "finance", license: "TEST-FINANCE-001" },
  { username: "executive", firstName: "ผู้บริหาร", lastName: "สถานพยาบาล", role: "executive", license: "TEST-EXECUTIVE-001" },
];

const scrypt = promisify(scryptCallback);
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");

await client.connect();
try {
  const created = [];
  const existing = [];
  for (const account of accounts) {
    const password = randomBytes(18).toString("base64url");
    const salt = randomBytes(16).toString("hex");
    const derived = await scrypt(password, salt, 64);
    const passwordHash = `scrypt$${salt}$${Buffer.from(derived).toString("hex")}`;
    const result = await client.query(
      `INSERT INTO "StaffAccount"
        ("id","username","passwordHash","firstName","lastName","role","medicalLicense","authProvider","active","applicationStatus","emailVerifiedAt","reviewedAt","reviewedBy","reviewNote","createdAt","updatedAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,'local',true,'approved',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,'admin','บัญชีทดสอบสำหรับ UAT',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
       ON CONFLICT ("username") DO NOTHING
       RETURNING "username"`,
      [`test-${account.role}`, account.username, passwordHash, account.firstName, account.lastName, account.role, account.license],
    );
    if (result.rowCount) created.push({ username: account.username, password });
    else existing.push(account.username);
  }

  if (created.length) {
    console.log("Created test accounts (copy these passwords now; they are shown only once):");
    for (const account of created) console.log(`${account.username}\t${account.password}`);
  } else {
    console.log("No test accounts were created.");
  }
  if (existing.length) console.log(`Skipped existing usernames without changing them: ${existing.join(", ")}`);
} finally {
  await client.end();
}
