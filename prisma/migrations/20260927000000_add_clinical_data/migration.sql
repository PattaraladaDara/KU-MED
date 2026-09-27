CREATE TABLE "Patient" (
  "id" TEXT NOT NULL,
  "citizenId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "firstName" TEXT NOT NULL,
  "lastName" TEXT NOT NULL,
  "birthDate" TIMESTAMP(3) NOT NULL,
  "gender" TEXT NOT NULL,
  "bloodGroup" TEXT,
  "faculty" TEXT NOT NULL,
  "major" TEXT NOT NULL,
  "studyYear" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "homeAddress" TEXT,
  "currentAddress" TEXT,
  "coverage" TEXT NOT NULL,
  "coverageStatus" TEXT NOT NULL,
  "allergyNotes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Patient_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Patient_citizenId_key" ON "Patient"("citizenId");
CREATE UNIQUE INDEX "Patient_studentId_key" ON "Patient"("studentId");
CREATE UNIQUE INDEX "Patient_email_key" ON "Patient"("email");
CREATE INDEX "Patient_firstName_lastName_idx" ON "Patient"("firstName", "lastName");

CREATE TABLE "TreatmentRecord" (
  "id" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "visitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "department" TEXT NOT NULL,
  "diagnosis" TEXT NOT NULL,
  "clinician" TEXT,
  "paymentType" TEXT,
  "visitType" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TreatmentRecord_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "TreatmentRecord_patientId_visitedAt_idx" ON "TreatmentRecord"("patientId", "visitedAt");
ALTER TABLE "TreatmentRecord" ADD CONSTRAINT "TreatmentRecord_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "Evaluation" (
  "id" TEXT NOT NULL,
  "employeeCode" TEXT NOT NULL,
  "employeeName" TEXT NOT NULL,
  "evaluationRound" TEXT NOT NULL,
  "qualityScore" INTEGER NOT NULL,
  "responsibilityScore" INTEGER NOT NULL,
  "serviceScore" INTEGER NOT NULL,
  "feedback" TEXT,
  "evaluatorKey" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Evaluation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Evaluation_qualityScore_check" CHECK ("qualityScore" BETWEEN 1 AND 5),
  CONSTRAINT "Evaluation_responsibilityScore_check" CHECK ("responsibilityScore" BETWEEN 1 AND 5),
  CONSTRAINT "Evaluation_serviceScore_check" CHECK ("serviceScore" BETWEEN 1 AND 5)
);
CREATE INDEX "Evaluation_employeeCode_createdAt_idx" ON "Evaluation"("employeeCode", "createdAt");

CREATE TABLE "UserSettings" (
  "id" TEXT NOT NULL,
  "userKey" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "notifyAnnouncements" BOOLEAN NOT NULL DEFAULT true,
  "notifyMonthlyReports" BOOLEAN NOT NULL DEFAULT true,
  "notifySecurity" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserSettings_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "UserSettings_userKey_key" ON "UserSettings"("userKey");
