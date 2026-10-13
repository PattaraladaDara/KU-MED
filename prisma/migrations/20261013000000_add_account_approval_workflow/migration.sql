ALTER TABLE "StaffAccount"
ADD COLUMN "email" TEXT,
ADD COLUMN "phone" TEXT,
ADD COLUMN "organization" TEXT,
ADD COLUMN "licenseExpiresAt" TIMESTAMP(3),
ADD COLUMN "applicationStatus" TEXT NOT NULL DEFAULT 'approved',
ADD COLUMN "emailVerifiedAt" TIMESTAMP(3),
ADD COLUMN "verificationCodeHash" TEXT,
ADD COLUMN "verificationExpiresAt" TIMESTAMP(3),
ADD COLUMN "reviewedAt" TIMESTAMP(3),
ADD COLUMN "reviewedBy" TEXT,
ADD COLUMN "reviewNote" TEXT,
ADD COLUMN "accessStartsAt" TIMESTAMP(3),
ADD COLUMN "accessEndsAt" TIMESTAMP(3),
ADD COLUMN "lastLoginAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "StaffAccount_email_key" ON "StaffAccount"("email");
CREATE INDEX "StaffAccount_applicationStatus_createdAt_idx" ON "StaffAccount"("applicationStatus", "createdAt");

CREATE TABLE "AccountAuditLog" (
  "id" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "actorKey" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "fromStatus" TEXT,
  "toStatus" TEXT,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AccountAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AccountAuditLog_accountId_createdAt_idx" ON "AccountAuditLog"("accountId", "createdAt");
CREATE INDEX "AccountAuditLog_actorKey_createdAt_idx" ON "AccountAuditLog"("actorKey", "createdAt");
ALTER TABLE "AccountAuditLog" ADD CONSTRAINT "AccountAuditLog_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "StaffAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
