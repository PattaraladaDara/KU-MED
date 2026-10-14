CREATE TABLE "TriageAssessment" (
  "id" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "assessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "assessorUsername" TEXT NOT NULL,
  "assessorName" TEXT NOT NULL,
  "temperature" DOUBLE PRECISION,
  "bloodPressure" TEXT,
  "pulse" INTEGER,
  "oxygenSaturation" INTEGER,
  "weightKg" DOUBLE PRECISION,
  "heightCm" DOUBLE PRECISION,
  "chiefComplaint" TEXT NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TriageAssessment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "TriageAssessment_patientId_assessedAt_idx" ON "TriageAssessment"("patientId", "assessedAt");
ALTER TABLE "TriageAssessment" ADD CONSTRAINT "TriageAssessment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
