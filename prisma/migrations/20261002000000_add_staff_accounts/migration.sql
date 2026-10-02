CREATE TABLE "StaffAccount" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "medicalLicense" TEXT NOT NULL,
    "authProvider" TEXT NOT NULL DEFAULT 'local',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "StaffAccount_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StaffAccount_username_key" ON "StaffAccount"("username");
CREATE UNIQUE INDEX "StaffAccount_medicalLicense_key" ON "StaffAccount"("medicalLicense");
CREATE INDEX "StaffAccount_firstName_lastName_idx" ON "StaffAccount"("firstName", "lastName");
