import pg from "pg";
import { randomBytes,scrypt as scryptCallback } from "node:crypto";
import { promisify } from "node:util";

const username=process.env.ADMIN_USERNAME?.trim().toLowerCase(),password=process.env.ADMIN_PASSWORD,email=process.env.ADMIN_EMAIL?.trim().toLowerCase();
if(!username||!password||!email){console.log("Admin bootstrap skipped: ADMIN_USERNAME, ADMIN_PASSWORD and ADMIN_EMAIL are not all configured.");process.exit(0);}
if(password.length<12)throw new Error("ADMIN_PASSWORD must contain at least 12 characters.");
const scrypt=promisify(scryptCallback),salt=randomBytes(16).toString("hex"),derived=await scrypt(password,salt,64),passwordHash=`scrypt$${salt}$${Buffer.from(derived).toString("hex")}`;
const client=new pg.Client({connectionString:process.env.DATABASE_URL});await client.connect();
try{await client.query(`INSERT INTO "StaffAccount" ("id","username","passwordHash","firstName","lastName","role","medicalLicense","email","authProvider","active","applicationStatus","emailVerifiedAt","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,'admin',$6,$7,'local',true,'approved',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) ON CONFLICT ("username") DO UPDATE SET "passwordHash"=EXCLUDED."passwordHash","email"=EXCLUDED."email","role"='admin',"active"=true,"applicationStatus"='approved',"emailVerifiedAt"=COALESCE("StaffAccount"."emailVerifiedAt",CURRENT_TIMESTAMP),"updatedAt"=CURRENT_TIMESTAMP`,[`admin-${username}`,username,passwordHash,"ผู้ดูแล","ระบบ",`ADMIN-${username}`,email]);console.log(`Admin account ready and credentials synchronized: ${username}`);}finally{await client.end();}
